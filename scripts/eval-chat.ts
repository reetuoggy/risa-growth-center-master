/**
 * Copilot evaluation harness. Runs graded questions against a running app (local or deployed).
 *   npx tsx scripts/eval-chat.ts http://localhost:3100   -> writes scripts/eval-results.md
 * Categories: factual, calculation, comparison/trend, diagnosis, follow-up, changed-data, unanswerable, execution.
 * Grading is automatic: regexes on the reply (key numbers / required caveats) + structural checks (proposals, no writes).
 */
import { writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
if (!/localhost|127\.0\.0\.1/.test(BASE) && !process.argv.includes("--allow-reset")) {
  console.error("This eval RESETS the target's data (edits/tasks are wiped). Pass --allow-reset to run it against a non-local URL.");
  process.exit(1);
}
type Msg = { role: "user" | "assistant"; content: string };
type Case = { id: string; cat: string; turns: string[]; asOf?: string; must?: RegExp[]; mustNot?: RegExp[]; check?: (r: ChatRes, ctx: Ctx) => Promise<string | null> | string | null; setup?: () => Promise<void>; teardown?: () => Promise<void> };
type ChatRes = { reply: string; trace: { tool: string }[]; proposals: unknown[] };
type Ctx = { tasksBefore: number };

async function chat(messages: Msg[], asOf = "2025-04-20"): Promise<ChatRes> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${BASE}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages, as_of: asOf }) });
    const j = await r.json();
    if (r.ok) return j;
    const err = String(j.error ?? r.statusText);
    if (r.status === 429 || /429|RESOURCE_EXHAUSTED/i.test(err)) {
      const m = err.match(/retry in (\d+(?:\.\d+)?)s/i);
      const waitMs = Math.min(65_000, Math.max(15_000, (m ? Math.ceil(Number(m[1])) + 2 : 20 * (attempt + 1)) * 1000));
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    throw new Error(err);
  }
  throw new Error("429 rate limit persisted after retries");
}
const api = async (path: string, method = "GET", body?: unknown) => (await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).json();
const taskCount = async () => (await api("/api/tasks?asOf=2025-04-20")).tasks.length as number;

const CASES: Case[] = [
  // factual
  { id: "F1", cat: "factual", turns: ["How many confirmed partnerships do we have, and what is the target?"], must: [/\b24\b/, /\b28\b/] },
  { id: "F2", cat: "factual", turns: ["How many brands were qualified as of 15 March 2025?"], must: [/\b55\b/] },
  { id: "F3", cat: "factual", turns: ["What is the total confirmed partnership value, and how much of it is in-kind?"], must: [/22\.4|22,40,000|2,240,000|2240000/, /2\.4\s?L|2,40,000|240,000|240000/] },
  { id: "F4", cat: "factual", turns: ["How many sponsor interactions are in the data after removing duplicates?"], must: [/\b950\b/] },
  { id: "F5", cat: "factual", turns: ["What was Cobalt Learning's opportunity stage on 1 March 2025, and what is it now?"], must: [/confirm/i, /withdrawn/i] },
  { id: "F6", cat: "factual", turns: ["How many contacts have opted out, and does that mean their brands are off-limits?"], must: [/\b7\b/, /contact/i] },
  { id: "F7", cat: "factual", turns: ["Which campaign produced the most confirmed value?"], must: [/Creator Network Referrals/i, /Warm Partner Introductions/i] },
  // calculation
  { id: "C1", cat: "calculation", turns: ["What percentage of the confirmed-partnership target have we achieved?"], must: [/85\.7|86\s?%/] },
  { id: "C2", cat: "calculation", turns: ["What is the average confirmed deal size?"], must: [/93,?333|93\.3\s?K|0\.93\s?L|93,3/] },
  { id: "C3", cat: "calculation", turns: ["What share of brands touched by Brand Leader LinkedIn replied?"], must: [/81(\.\d)?\s?%/] },
  { id: "C4", cat: "calculation", turns: ["Brand-to-confirmed conversion: warm/inbound channels versus cold outbound?"], must: [/54\.5|55\s?%/, /\b0(\.0)?\s?%/] },
  // comparison / trend
  { id: "T1", cat: "trend", turns: ["How many partnerships were confirmed between 1 March and 15 March 2025?"], must: [/\b7\b/] },
  { id: "T2", cat: "trend", turns: ["When did the targets change and to what?"], must: [/15(st)? (Mar|March)|(Mar|March) 15|2025-03-15/i, /\b55\b/, /\b28\b/] },
  // diagnosis & recommendation
  { id: "D1", cat: "diagnosis", turns: ["Why are we behind the confirmed-partnership target?"], must: [/cold|outbound|email|linkedin/i, /stall|negotiat|open/i] },
  { id: "D2", cat: "diagnosis", turns: ["Which campaigns should we stop and which should we scale?"], must: [/Brand Discovery Email/i, /Creator Network Referrals|Warm Partner Introductions/i] },
  { id: "D3", cat: "diagnosis", turns: ["How reliable is the forecast?"], must: [/backtest|actual|under|error|within/i] },
  // follow-ups
  { id: "U1", cat: "follow-up", turns: ["Which opportunity owner has the most confirmed value?", "And how many open deals do they still have?"], must: [/Riya/i, /\b\d+\b/] },
  { id: "U2", cat: "follow-up", turns: ["Tell me about Beardo.", "What was the value of their lost deal?"], must: [/30,?000|30\s?K|0\.3\s?L/] },
  // changed data
  { id: "X1", cat: "changed-data", asOf: "2025-04-01", turns: ["How many confirmed partnerships do we have right now?"], must: [/\b24\b/],
    setup: async () => { await api("/api/admin/reset", "POST", { confirm: "RESET" }); await api("/api/opportunities/O004", "POST", { stage: "partner_confirmed", effective_date: "2025-04-01", confirmed_value_inr: 150000 }); },
    teardown: async () => { await api("/api/admin/reset", "POST", { confirm: "RESET" }); } },
  { id: "X2", cat: "changed-data", turns: ["What is the current confirmed-partnership goal?"], must: [/\b30\b/],
    setup: async () => { await api("/api/targets", "POST", { qualified_brands_goal: 60, confirmed_partnerships_goal: 30, effective_date: "2025-04-10", label: "Eval stretch plan" }); },
    teardown: async () => { await api("/api/admin/reset", "POST", { confirm: "RESET" }); } },
  // unanswerable / honesty
  { id: "N1", cat: "unanswerable", turns: ["How much sponsorship cash has actually reached our bank account?"], must: [/simulat|no (bank|receipt)|not (available|in the data)|cannot/i] },
  { id: "N2", cat: "unanswerable", turns: ["Did the Beardo activation increase festival attendance?"], must: [/associat|causal|cannot|not (establish|show|prove)|no data/i] },
  { id: "N3", cat: "unanswerable", turns: ["What is our customer acquisition cost for the LinkedIn campaign?"], must: [/simulat|no (spend|cost)|not (available|recorded|in the)/i] },
  { id: "N4", cat: "unanswerable", turns: ["Why exactly did Evergreen Collective's deal get lost?"], must: [/(no|not|doesn't|does not)[^.]*(reason|record|explain|say)/i] },
  { id: "N5", cat: "unanswerable", turns: ["How many Instagram followers does Beardo have?"], must: [/(not|no)[^.]*(available|data|record|contain|track|include)/i] },
  // execution (draft only, never writes without confirmation)
  { id: "E1", cat: "execution", turns: ["Draft a task for Kabir Shah to pause the Brand Discovery Email campaign and move his hours to warm introductions, due 2025-03-20."],
    check: async (r, ctx) => (r.proposals.length < 1 ? "no task proposal returned" : (await taskCount()) !== ctx.tasksBefore ? "a task was written without confirmation" : null), mustNot: [/(has been|was|successfully) (created|added|saved)/i] },
  // deck-consistency & reworded questions (Q4..Q16)
  { id: "K1", cat: "deck-consistency", turns: ["What are our 2027 base and stretch cash targets by T-14, and what is the likely range?"], must: [/54\.1/, /1\.27\s?Cr|127\.4/, /42\.0/, /65\.8/], mustNot: [/35\.0|50\.0\s?L/i] },
  { id: "K2", cat: "deck-consistency", turns: ["Why did we pick Mumbai instead of Delhi NCR for CampusFest 2027?"], must: [/8\.95/, /8\.90|8\.9/, /0\.05/, /bank|UPI|NPCI|SBI/i], mustNot: [/venue partner depth|creator network density/i] },
  { id: "K3", cat: "deck-consistency", turns: ["How are brands distributed across owners, and is anyone overloaded?"], must: [/126/, /180/, /Kabir/i] },
  { id: "K4", cat: "deck-consistency", turns: ["How many days from MoU to advance paid? Did any advance exceed 15 days, and which payments are overdue?"], must: [/Mosaic Mobility/i, /15\s?days|15-day/i, /Aster Pantry|23/i], mustNot: [/no advance exceeded 15/i] },
  { id: "K5", cat: "deck-consistency", turns: ["Draft tasks for our stalled deals."],
    check: async (r, ctx) => (r.proposals.length < 1 ? "no stalled-deal task proposal returned" : (await taskCount()) !== ctx.tasksBefore ? "written without confirm" : null),
    mustNot: [/Mosaic Mobility|invoice|PAY0\d+/i] },
  { id: "K6", cat: "deck-consistency", turns: ["How many stalled deals do we have, what are they worth, and how do they split between cold and warm?"], must: [/\b26\b/, /14\.4/, /cold/i, /0.*warm|warm.*0/i], mustNot: [/20\.9/i] },
  { id: "K7", cat: "deck-consistency", turns: ["How does our 2027 plan define hybrid deals? Are they in-kind with zero guaranteed cash?"], must: [/50%/, /bonus|CPA/i], mustNot: [/hybrid.*in-kind.*₹?0 guaranteed/i] },
  { id: "K8", cat: "deck-consistency", turns: ["Judge all 5 bets using our Scale and Stop plan thresholds."], must: [/120%/, /70%/, /vertical/i, /anchor/i, /hybrid/i] },
  { id: "K9", cat: "deck-consistency", turns: ["What is the modelled downside if no anchor sponsor signs?"], must: [/41\.0/] },
  { id: "K10", cat: "deck-consistency", turns: ["Compare the 15 March forecast against the actual confirmed deals."], must: [/26\.9/, /\b24\b/] },
  { id: "K11", cat: "deck-consistency", turns: ["What specific actions should we take if we miss our Week 6 and Week 9 checkpoints?"], must: [/cold/i, /re-?price|co-title/i, /100% advance/i] },
  // reworded consistency checks
  { id: "R1", cat: "reworded", turns: ["If D2C or quick-commerce sponsors led the mix instead of banks/UPI, which city would win?"], must: [/Delhi[- ]?NCR/i, /8\.95/, /8\.90|8\.9/] },
  { id: "R2", cat: "reworded", turns: ["Give me the Monte Carlo P10-P90 band and stretch goal in the 2027 model."], must: [/42\.0/, /65\.8/, /1\.27\s?Cr|127\.4/] },
  { id: "R3", cat: "reworded", turns: ["Are dataset brand industries the same as the 2027 plan's verticals?"], must: [/title|hackathon|pro-?night|arena|summit/i, /industry|Food and beverage|Mobility/i] },
];

async function main() {
  const rows: string[] = [];
  let pass = 0;
  await api("/api/admin/reset", "POST", { confirm: "RESET" });
  for (const c of CASES) {
    const ctx: Ctx = { tasksBefore: await taskCount() };
    let verdict = "PASS", note = "", reply = "";
    const tools: string[] = [];
    try {
      await c.setup?.();
      const msgs: Msg[] = [];
      let res: ChatRes | null = null;
      for (const t of c.turns) {
        msgs.push({ role: "user", content: t });
        res = await chat(msgs, c.asOf);
        msgs.push({ role: "assistant", content: res.reply });
        tools.push(...res.trace.map((x) => x.tool));
      }
      reply = res!.reply;
      const miss = (c.must ?? []).filter((re) => !re.test(reply)).map(String);
      const bad = (c.mustNot ?? []).filter((re) => re.test(reply)).map(String);
      const extra = c.check ? await c.check(res!, ctx) : null;
      if (miss.length || bad.length || extra) { verdict = "FAIL"; note = [miss.length ? `missing ${miss.join(", ")}` : "", bad.length ? `forbidden ${bad.join(", ")}` : "", extra ?? ""].filter(Boolean).join("; "); }
      if (!tools.length && c.cat !== "unanswerable") { verdict = "FAIL"; note += " no tool used (ungrounded)"; }
    } catch (e) { verdict = "ERROR"; note = (e as Error).message; }
    finally { await c.teardown?.(); }
    if (verdict === "PASS") pass++;
    console.log(`${c.id} [${c.cat}] ${verdict} ${note}`);
    rows.push(`### ${c.id} · ${c.cat} · **${verdict}**\n\n**Q:** ${c.turns.join("  →  ")}\n\n**Tools:** ${[...new Set(tools)].join(", ") || "none"}${note ? `\n\n**Note:** ${note}` : ""}\n\n<details><summary>Answer</summary>\n\n${reply.replace(/\n/g, "\n> ").replace(/^/, "> ")}\n\n</details>\n`);
    await new Promise((r) => setTimeout(r, 3000)); // stay under free-tier rate limits
  }
  await api("/api/admin/reset", "POST", { confirm: "RESET" });
  const md = `# Copilot evaluation\n\nTarget: ${BASE} · ${new Date().toISOString()}\n\n**${pass}/${CASES.length} passed** (automatic regex + structural grading)\n\n${rows.join("\n")}`;
  writeFileSync("scripts/eval-results.md", md);
  console.log(`\n${pass}/${CASES.length} passed -> scripts/eval-results.md`);
}

main();
