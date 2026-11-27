import { GoogleGenAI, FunctionCallingConfigMode, type Content } from "@google/genai";
import { getStore } from "@/lib/store";
import { fail } from "@/lib/api";
import { defaultAsOf, parseAsOf } from "@/lib/metrics";
import { TOOL_DECLARATIONS, runTool, type Proposal } from "@/lib/copilot/tools";
import { systemPrompt } from "@/lib/copilot/prompt";
import { buildTurnRoutingCue, detectStalledTaskMismatch, isStalledTaskRequest, isSubstantiveQuery, isTaskDraftRequest, resolveTurnScope } from "@/lib/copilot/routing";

export const maxDuration = 120;

// Primary model first; on overload (503/429) fall back down the chain. Once a model answers,
// the rest of the request sticks to it unless it hits rate-limit/overload mid-turn.
const MODELS = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-4-hydrogen,gemini-3.8-flash")
  .split(",").map((s) => s.trim()).filter(Boolean);
const MAX_ROUNDS = 8;
const clip = (x: unknown, n = 40000) => { const s = JSON.stringify(x); return s.length > n ? { truncated: true, preview: s.slice(0, n) } : x; };

type Msg = { role: "user" | "assistant"; content: string };

// Overloaded, rate-limited or hung (our own per-call timeout) all mean "try the next model".
const BUSY = /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|overloaded|high demand|abort|timed? ?out/i;
const DAILY_QUOTA = /PerDay|GenerateRequestsPerDay/i;
// A fallback candidate gets a short leash (a busy model can hang 45 s+); the model in use gets longer.
const CANDIDATE_TIMEOUT_MS = 10_000;
const STICKY_TIMEOUT_MS = 30_000;

// Per-instance memory of overloaded/exhausted models, so later requests skip straight to healthy ones.
const COOLDOWN_MS = 30_000;
const DAILY_COOLDOWN_MS = 6 * 3600_000;
const busyUntil = new Map<string, number>();

async function generate(ai: GoogleGenAI, contents: Content[], system: string, state: { model?: string }, forceTool = false) {
  const now = Date.now();
  const fresh = MODELS.filter((m) => (busyUntil.get(m) ?? 0) <= now);
  const recoverable = MODELS.filter((m) => !fresh.includes(m) && (busyUntil.get(m) ?? 0) - now <= COOLDOWN_MS);
  const candidates = fresh.length ? [...fresh, ...recoverable] : (recoverable.length ? recoverable : MODELS);
  const chain = state.model
    ? [state.model, ...candidates.filter((m) => m !== state.model)]
    : candidates;
  let last: unknown;
  for (const model of chain) {
    const sticky = model === state.model;
    const isLast = model === chain[chain.length - 1];
    const maxAttempts = sticky ? 2 : isLast ? 2 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const invoke = (useForce: boolean) => ai.models.generateContent({
        model, contents,
        config: {
          systemInstruction: system,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS as never }],
          ...(useForce ? { toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } } } : {}),
          temperature: 0,
          abortSignal: AbortSignal.timeout(sticky || isLast ? STICKY_TIMEOUT_MS : CANDIDATE_TIMEOUT_MS),
        },
      });
      try {
        const res = await invoke(forceTool);
        state.model = model;
        busyUntil.delete(model);
        return res;
      } catch (e) {
        const msg = String((e as Error).message ?? e);
        if (forceTool && /400|INVALID_ARGUMENT|tool_?config|function_?calling_?config/i.test(msg)) {
          try {
            const res = await invoke(false);
            state.model = model;
            busyUntil.delete(model);
            return res;
          } catch (e2) { last = e2; }
        } else {
          last = e;
        }
        const errMsg = String((last as Error).message ?? last);
        const notFound = /404|NOT_FOUND|no longer available/i.test(errMsg);
        if (!BUSY.test(errMsg) && !notFound) throw last;
        const cooldown = notFound ? 24 * 3600_000 : DAILY_QUOTA.test(errMsg) ? DAILY_COOLDOWN_MS : COOLDOWN_MS;
        busyUntil.set(model, Date.now() + cooldown);
        if (notFound || DAILY_QUOTA.test(errMsg)) break;
        if (!isLast && attempt === maxAttempts - 1) break;
        if (!isLast && !sticky) break;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw last;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { messages: Msg[]; as_of?: string };
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ reply: "The AI copilot is not configured (GEMINI_API_KEY missing). The dashboard still works.", trace: [], proposals: [] });
    const db = await getStore().load();
    const asOf = parseAsOf(body.as_of) ?? defaultAsOf(db);
    const ai = new GoogleGenAI({ apiKey });
    const rawMsgs = (body.messages ?? []).slice(-16).filter((m) => m.content?.trim());
    const userMsgs = rawMsgs.filter((m) => m.role === "user");
    const lastUserMsg = userMsgs.at(-1)?.content ?? "";
    const priorUserMsgs = userMsgs.slice(0, -1).map((m) => m.content);
    const turnScope = resolveTurnScope(lastUserMsg, priorUserMsgs);
    const turnCue = buildTurnRoutingCue(lastUserMsg, priorUserMsgs);
    const substantive = isSubstantiveQuery(lastUserMsg);
    const stalledTaskTurn = isStalledTaskRequest(turnScope);
    const taskDraftTurn = isTaskDraftRequest(lastUserMsg);
    const contents: Content[] = rawMsgs.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const trace: { tool: string; args: unknown; result: unknown }[] = [];
    const proposals: Proposal[] = [];
    const system = systemPrompt(db, asOf, turnCue);
    let reply = "";
    let nudgedGrounding = false;
    let nudgedTaskDraft = false;
    let rejectedStalledTask = false;
    const state: { model?: string } = {};
    const deadline = Date.now() + 95_000;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      if (round > 0 && Date.now() > deadline) { reply = "The model is slow right now, so I stopped before finishing. The evidence trace below shows what I gathered; please ask again or narrow the question."; break; }
      const forceTool = round === 0 && substantive;
      const res = await generate(ai, contents, system, state, forceTool);
      const calls = res.functionCalls ?? [];
      const rawContent = res.candidates?.[0]?.content;
      const content = rawContent?.parts?.length ? rawContent : undefined;
      if (!calls.length) {
        if (trace.length === 0 && substantive && !nudgedGrounding) {
          nudgedGrounding = true;
          contents.push(content ?? { role: "model", parts: [{ text: res.text || "(no tool call)" }] });
          contents.push({
            role: "user",
            parts: [{
              text: `GROUNDING REQUIRED: You must call the appropriate tool(s) first (such as get_2027_plan, search_strategy_docs, get_bet_signals, get_kpis, get_funnel, diagnose_campaigns, get_cash_collection, forecast, or data_dictionary) before answering.${turnCue ? ` ${turnCue}` : ""}`,
            }],
          });
          continue;
        }
        if ((taskDraftTurn || (stalledTaskTurn && rejectedStalledTask)) && trace.length > 0 && proposals.length === 0 && !nudgedTaskDraft) {
          nudgedTaskDraft = true;
          contents.push(content ?? { role: "model", parts: [{ text: res.text || "(missing propose_task call)" }] });
          contents.push({
            role: "user",
            parts: [{
              text: stalledTaskTurn && rejectedStalledTask
                ? "ACTION REQUIRED: Your previous task draft was rejected because it targeted confirmed/payment chasing instead of stalled OPEN pipeline deals. Call diagnose_campaigns (if not yet called) and call propose_task for stalled OPEN pipeline opportunities from stalled_list."
                : stalledTaskTurn
                  ? "ACTION REQUIRED: Do not write tasks only as text. You MUST call propose_task once per task for stalled OPEN pipeline opportunities from diagnose_campaigns.stalled_list (never confirmed/payment-chasing deals)."
                  : "ACTION REQUIRED: Do not write tasks only as text — writing text does not create a draft for the user to confirm. You MUST call propose_task now once per task using real owner_id, brand_id, opportunity_id, and/or sponsor_campaign_id from the tool data.",
            }],
          });
          continue;
        }
        reply = res.text ?? "";
        break;
      }
      if (content) contents.push(content);
      const parts = calls.map((c) => {
        const toolName = c.name ?? "";
        const args = (c.args ?? {}) as Record<string, unknown>;
        let out: unknown;
        try {
          const r = runTool(db, toolName, args, asOf);
          const taskMeta = r.result as { opportunity_stage?: string | null; brand_has_open_opp?: boolean; brand_has_confirmed_opp?: boolean };
          const oppStage = taskMeta?.opportunity_stage ?? null;
          const mismatch = detectStalledTaskMismatch(turnScope, toolName, args, oppStage, {
            brandHasOpenOpp: taskMeta?.brand_has_open_opp,
            brandHasConfirmedOpp: taskMeta?.brand_has_confirmed_opp,
          });
          if (mismatch) {
            rejectedStalledTask = true;
            out = { error: mismatch };
          } else {
            out = r.result;
            if (r.proposal) proposals.push(r.proposal);
          }
        } catch (e) { out = { error: (e as Error).message }; }
        trace.push({ tool: toolName || "?", args, result: clip(out, 4000) });
        return { functionResponse: { id: c.id, name: c.name, response: { result: clip(out) } } };
      });
      contents.push({ role: "user", parts });
      if (round === MAX_ROUNDS - 1) reply = "I hit my tool-call limit before finishing. Here is what I gathered — please narrow the question.";
    }
    if (!reply.trim()) reply = "I could not produce an answer from the available data. Try rephrasing or narrowing the question.";
    return Response.json({ reply, trace, proposals, as_of: asOf, model: state.model ?? MODELS[0] });
  } catch (e) { return fail(e); }
}

