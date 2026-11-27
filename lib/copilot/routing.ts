/**
 * Deterministic turn routing cues, substantive-query detection, and task-topic alignment guards
 * to keep weak/fast Gemini models grounded in the right tools and definitions.
 */
import { searchKnowledge } from "./knowledge";

const GREETING_RE = /^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you|thx|ok|okay|cool|got it|bye|goodbye)[!.\s]*$/i;
const EXPLICIT_SCOPE_RE = /\b(stalled|stuck|idle|stagnant|open deals?|pipeline deals?|open pipeline|cold pipeline|cold deals?|26 deals?|payments?|invoices?|overdue|advance|bets?|city|mumbai|delhi|campaigns?|SC0[1-6]|Brand Discovery|LinkedIn|Revival|Referrals|Warm Partner|Interest Form)\b/i;

export function isSubstantiveQuery(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return !GREETING_RE.test(t);
}

export function isTaskDraftRequest(text: string): boolean {
  const q = text.trim();
  if (!q) return false;
  if (/\b(don't|do not|never|without)\s+(draft|create|assign|make|add|propose)\b/i.test(q)) return false;
  if (/\bwithout (?:my |user )?confirm(?:ation|ing)?\b/i.test(q)) return false;
  // Exclude informational, past-tense, and UI how-to questions about tasks rather than requests to draft tasks
  if (/^\s*(?:how\s+(?:do|can|would|to)\s+(?:i|we|you|users?)|where\s+(?:do|can)\s+(?:i|we)|can\s+i\b|did\s+(?:anyone|someone|we|they|you)|have\s+(?:we|they|you)|has\s+(?:anyone|someone)|were\s+(?:any\s+)?tasks?|why\s+(?:did|would|do)\b)/i.test(q)) {
    return false;
  }
  if (/^\s*(?:which|what)\s+tasks?\s+(?:did|have|were|are)\b/i.test(q)) return false;
  const hasDraftVerb = /\b(draft|create|assign|propose|suggest|make|add|generate|write|prepare|set up)\b/i.test(q);
  const hasTaskNoun = /\b(tasks?|to-?dos?|action items?|follow[- ]?up tasks?)\b/i.test(q);
  if (hasDraftVerb && hasTaskNoun) return true;
  if (/\b(draft|create|assign|propose)\b/i.test(q) && /\bfollow[- ]?ups?\b/i.test(q)) return true;
  return false;
}

function isEllipticalTurn(text: string): boolean {
  const q = text.trim();
  if (!q || EXPLICIT_SCOPE_RE.test(q)) return false;
  const hasPronoun =
    /\b(them|those|these|it|ones?|they|their)\b/i.test(q)
    || /\b(?:for|on|about|of|to|with|in|do|is|was)\s+that\b|\bthat\s+(?:one|deal|campaign|owner|brand|bet)\b/i.test(q);
  const hasNamedUnblockTarget =
    /\b(?:unblock|unstick)\s+(?!them\b|those\b|these\b|it\b|ones?\b|the\s+(?:top|first|biggest|largest|highest|worst|remaining|stalled|stuck|cold|open|deals?|owners?|pipeline)\b)[a-z0-9]/i.test(q);
  const isEllipticalTaskFollowUp =
    /\b(draft|create|assign|propose|suggest|make|add|write|prepare)\b/i.test(q)
    && /\b(tasks?|action items?|follow[- ]?ups?|to-?dos?|unblock|unstick)\b/i.test(q)
    && !hasNamedUnblockTarget
    && (
      /\b(the top \d+|top \d+|first \d+|biggest|largest|highest|worst|each|remaining|the owners?|the deals?)\b/i.test(q)
      || q.split(/\s+/).length <= 5
    );
  const isShortFilterRefinement =
    q.split(/\s+/).length <= 7
    && /^(?:only|just|filter|what about|how about|and\b|also\b|show only|for\s+(?:riya|nisha|meera|kabir))\b/i.test(q);
  return hasPronoun || isEllipticalTaskFollowUp || isShortFilterRefinement;
}

export function resolveTurnScope(userText: string, recentUserText: string | string[] = ""): string {
  const q = userText.trim();
  if (!q) return q;
  const priorList = (Array.isArray(recentUserText) ? recentUserText : [recentUserText])
    .map((x) => x.trim())
    .filter(Boolean);
  if (!priorList.length || !isEllipticalTurn(q)) return q;
  const collected: string[] = [];
  for (let i = priorList.length - 1; i >= 0 && collected.length < 3; i--) {
    const prev = priorList[i];
    collected.unshift(prev);
    if (!isEllipticalTurn(prev)) break;
  }
  return [...collected, q].join("\n");
}

export function buildTurnRoutingCue(userText: string, recentUserText: string | string[] = ""): string | undefined {
  const q = userText.trim();
  if (!q || !isSubstantiveQuery(q)) return undefined;
  const scopeText = resolveTurnScope(q, recentUserText);
  const cues: string[] = [];

  const mentions2025Campaign = /\b(campaigns?|Brand Discovery Email|Brand Leader LinkedIn|Past Conversation Revival|Creator Network Referrals|Warm Partner Introductions|Partner Interest Form|SC0[1-6])\b/i.test(scopeText);
  const mentionsCity = /\b(mumbai|delhi|ncr|bengaluru|chennai|city|cities|location|venue|tie-?break(?:er)?|early march|festival dates?|6-7 march|timing)\b/i.test(scopeText)
    || (/\b(d2c|quick[- ]commerce|sponsor mix)\b/i.test(scopeText) && /\b(win|wins|pick|choose|lead|led|main|primary|mostly|sponsors?|better|prefer)\b/i.test(scopeText));
  const mentions2027Plan =
    /\b(2027|base|stretch|likely (?:range|band)|confidence interval|next year(?:'s)?(?:\s+fest)?|p10|p50|p90|monte carlo|bands?|downsides?|sensitiv(?:e|ity|ities)|no[- ]anchor|no bank|worst case|what breaks|repeat 2025|14\.1|54\.1|1\.27|42\.0|65\.8|41\.0|t-14|t-21|deck|slides?|gates?|checkpoints?|contingenc(?:y|ies)|fallback|playbook|milestones?|week 4|week 6|week 9|say(?:ing)? no|reject(?:ed|ing)?|deprioritis|cut back|double down)\b/i.test(scopeText)
    || /\b(?:no|without|miss(?:ing)?|lose|losing|fail(?:s|ed)? to (?:land|sign|close)|zero)\s+(?:an?\s+)?(?:anchor|title)\b/i.test(scopeText)
    || (
      (/\b(behind|miss(?:ed|ing)?|fall(?:ing)? short|lag(?:ging)?)\b/i.test(scopeText) || /\bfall(?:s|ing)?\b.{0,30}\b(behind|short)\b/i.test(scopeText))
      && (/\b(2027|plan|checkpoints?|gates?|milestones?|week\s*[469]|cash|pace|pacing|strategy|sponsorship revenue)\b/i.test(scopeText) || /\b15%/.test(scopeText))
    );
  const mentionsBetOrPlanThreshold =
    /\b(bets?|thresholds?|plan thresholds?|all 5|verticals?|anchor|hybrid|segment [a-e])\b/i.test(scopeText)
    || /\b(?:120|70)%/i.test(scopeText)
    || /\bperformance(?:[- ]based)?\s+(?:deals?|packages?|tiers?|sponsorships?|model|structure|bonuses?|offers?)\b/i.test(scopeText)
    || (/\b(in-?kind|barter)\b/i.test(scopeText) && (/\b(hybrid|2027|plan|bets?|guaranteed|cpa|segment|performance)\b/i.test(scopeText) || /\b50%|\b(?:0|zero)\s*(?:guaranteed|cash)\b/i.test(scopeText)))
    || (!mentions2025Campaign && /\b(scale|stop)\b/i.test(scopeText) && /\b(plan|2027|judge|evaluate)\b/i.test(scopeText));
  const mentionsTaskWord = /\b(tasks?|to-?dos?|action items?)\b/i.test(scopeText);
  const mentionsBrandOwnershipVerb =
    /\b(?:who|which\s+(?:owner|seller|rep|person|member)|anyone|someone|each\s+(?:owner|seller|rep))\b[^.?]{0,40}\b(?:hold|holds|holding|own|owns|owning|carry|carrying|manage|manages|managing|has|have)\b[^.?]{0,30}\bbrands?\b/i.test(scopeText)
    || /\b(?:most|majority|bulk|share|how many)\b[^.?]{0,25}\bbrands?\b[^.?]{0,30}\b(?:hold|holds|holding|own|owns|owning|team|sellers?|reps?|person|owners?)\b/i.test(scopeText)
    || /\b(?:sellers?|reps?|team members?)\b[^.?]{0,30}\b(?:hold|holds|holding|own|owns|owning|carry|carrying|manage|manages|managing)\b[^.?]{0,20}\bbrands?\b/i.test(scopeText);
  const mentionsOwnerOverload =
    /\b(overload(?:ed|ing)?|workload|bandwidth|rebalance|ownership|sales team|team members?|reps?|180|126|too many brands|brand (?:load|split|share|allocation|ownership))\b/i.test(scopeText)
    || (/\bdistribution\b/i.test(scopeText) && !mentionsTaskWord)
    || /\bcarrying\b.*\bbrands?\b|\bbrands?\b.*\b(?:in|across|on) the team\b/i.test(scopeText)
    || (/\bteam\b/i.test(scopeText) && /\bbrands?\b/i.test(scopeText) && /\b(who|how|split|share|hold|holds|carry|carrying|many|most|across|own|owns)\b/i.test(scopeText) && !isTaskDraftRequest(q))
    || mentionsBrandOwnershipVerb
    || (/\b(owners?|kabir|riya|nisha|meera)\b/i.test(scopeText) && !isTaskDraftRequest(q) && !mentionsTaskWord);
  const mentionsDealOrPipeline = /\b(deals?|opps?|opportunities|pipeline|cold|26)\b/i.test(scopeText);
  const mentionsStalled =
    (/\b(stalled|idle|stagnant|haven't moved|hasn't moved|not moved|cold pipeline|cold deals?|26 deals?|unstick)\b/i.test(scopeText)
      || (/\bstuck\b/i.test(scopeText) && (mentionsDealOrPipeline || !mentionsTaskWord)))
    && !(mentionsTaskWord && !mentionsDealOrPipeline && !isTaskDraftRequest(q));
  const hasExplicitPaymentTerm =
    /\b(advance|mou|15[ -]?day|payments?|invoices?|tds|cash collection|receivables?|mosaic|upfront|50\/50|how fast.*pay|after signing|from signing|take to pay|took to pay|days to pay|haven't paid|have not paid|unpaid|paid in full|pay in full|payment splits?|installments?|dso)\b/i.test(scopeText)
    || /\b(paid|pay|settled|deals?|store|sc04|inbound|terms|splits?|installments?)\b.*\bin full\b|\bin full\b.*\b(paid|pay|deals?|store|sc04|inbound|terms|splits?|installments?)\b/i.test(scopeText);
  const mentionsTasksQuery = mentionsTaskWord
    && !hasExplicitPaymentTerm
    && !isTaskDraftRequest(q)
    && /\b(overdue|blocked|blocking|pending|open|late|stuck|distributed|distribution|assigned|owner|owners|exist|which|what|how many|list|show|status|did|have|were|riya|kabir|nisha|meera)\b/i.test(scopeText);
  const mentionsPayments = hasExplicitPaymentTerm || (/\boverdue\b/i.test(scopeText) && !mentionsTaskWord);
  const mentionsStore = /\b(inbound|sponsor store|store|partner interest form|sc04)\b/i.test(scopeText);
  const mentionsStoreTerms = /\b(upfront|50\/50|meeting|fast|terms|schedule|payment(?:s| terms| schedule| splits?)?|paid|pay|paid in full|pay in full|in full|splits?|installments?|confirmed|closed|deals?|brands?|how many)\b/i.test(scopeText);
  const isPure2027StorePlan = (mentions2027Plan || /\b2027\b/i.test(scopeText)) && !hasExplicitPaymentTerm && !/\b(sc04|partner interest form|2025)\b/i.test(scopeText);
  const mentionsForecast =
    /\b(forecast(?:s|ed|ing)?|projections?|backtest|26\.9|reliab(?:le|ility)|accura(?:te|cy)|predict(?:ion|ed|ing)?|pipeline model)\b/i.test(scopeText)
    || (/\b(15 mar|march 15|mid[- ]?mar(?:ch)?)\b/i.test(scopeText) && /\b(forecast(?:s|ed|ing)?|project(?:ed|ions?)?|backtest|actuals?|24|26\.9|model|predict(?:ed|ion)?|reliab|accura)\b/i.test(scopeText));
  const mentionsBenchmarks = /\b(gst|tds|194c|393|dpdp|antaragni|techfest|mood indigo|ignisense|amity|benchmarks?)\b/i.test(scopeText);

  if (mentionsCity) {
    cues.push("Call get_2027_plan and search_strategy_docs for weighted city scores and the bank/UPI vs D2C sponsor-mix tiebreak (never invent city factors).");
  }
  if (mentions2027Plan) {
    cues.push("Call get_2027_plan (and search_strategy_docs for strategy context/gates). Quote exact headline_summary, uncertainty band, sensitivities, and gates.");
  }
  if (mentionsBetOrPlanThreshold) {
    cues.push("For 2027 bets/thresholds/definitions, call get_bet_signals, get_2027_plan, and search_strategy_docs. Cover all 5 bets using plain-text 120% SCALE / <70% STOP plan thresholds (do not wrap 120% or 70% in LaTeX math, and do not confuse with 2025 campaign close rates), and distinguish 2027 hybrid (50% guaranteed + capped CPA) from 2025 in_kind, and 2027 vertical titles from 2025 dataset industries.");
  }
  if (mentions2025Campaign && /\b(stop|scale|change|verdict|diagnos|bottleneck|weakest)\b/i.test(scopeText)) {
    cues.push("For 2025 campaign verdicts, call diagnose_campaigns (and get_funnel group_by='campaign') and report exact campaign names, counts, and close-rate rules.");
  } else if (
    (mentions2025Campaign || /\b(warm\/inbound|cold outbound|warm vs\.? cold|warm versus cold)\b/i.test(scopeText))
    && /\b(share|rate|conversion|replied|reply|met|meeting|touched|confirmed|value|funnel|brands)\b/i.test(scopeText)
    && !isTaskDraftRequest(q)
  ) {
    cues.push("For 2025 campaign or channel brand-level counts and rates (brands_touched, brands_replied, reply_rate_brand, close_rate_brand), call get_funnel(group_by='campaign' or 'channel_group') rather than counting raw interaction rows.");
  }
  if (mentionsOwnerOverload) {
    cues.push("Call get_funnel(group_by='owner') and get_kpis; report BOTH brand ownership (db.brands across all 180 brands, checking owner_workload_summary) and opportunity ownership (deal owners).");
  }
  if (mentionsStalled) {
    cues.push("Call diagnose_campaigns (and list_opportunities open_only=true if needed). Report exact stalled count, proposed value, and cold outbound vs warm/inbound split.");
  }
  if (mentionsTasksQuery) {
    cues.push("Call get_tasks (e.g., overdue_only=true or unfiltered to inspect status, owner, and description/blockers) relative to the as-of date.");
  }
  if (mentionsPayments) {
    cues.push("Call get_cash_collection and inspect mou_to_advance (MoU-to-advance-paid calendar days vs 15-day target), overdue invoices, and payment_terms_summary (50/50 splits/installments vs 100% paid-in-full upfront) so answers are mutually consistent.");
  }
  if (mentionsStore && mentionsStoreTerms && !isPure2027StorePlan) {
    cues.push("Also call get_cash_collection (payment_terms_summary), list_opportunities(campaign='SC04'), get_funnel(group_by='campaign'), and get_bet_signals for SC04 sponsor store confirmed brands, meeting speed, and 50/50 vs 100% paid-in-full / installment terms.");
  }
  if (mentionsForecast) {
    cues.push("Call forecast and inspect reliability_backtest (especially 15 Mar forecast vs actual event-eve confirmed).");
  }
  if (isStalledTaskRequest(scopeText)) {
    cues.push("Task drafting scope: First call diagnose_campaigns to inspect stalled_list, then call propose_task to ONLY target stalled OPEN pipeline opportunities (prospecting/contacted/proposal_sent/negotiating). Do NOT draft payment-chasing or invoice tasks for confirmed deals.");
  }

  const wantsStrategyRag = mentionsCity || mentions2027Plan || mentionsBetOrPlanThreshold || mentionsBenchmarks;
  if (wantsStrategyRag) {
    const rag = searchKnowledge(scopeText, 3);
    const topDocs = rag.hits.filter((h) => h.score >= 8).map((h) => h.id);
    if (topDocs.length) {
      cues.push(`Relevant strategy doc chunks for search_strategy_docs: ${topDocs.join(", ")}.`);
    }
  }
  return cues.length ? cues.join(" ") : undefined;
}

export function isStalledTaskRequest(text: string): boolean {
  const lastLine = text.trim().split(/\n+/).at(-1) ?? text;
  const informationalQuestion =
    /^\s*(?:how\s+(?:do|can|would|to)\s+(?:i|we|you|users?)|where\s+(?:do|can)\s+(?:i|we)|can\s+i\b|did\s+(?:anyone|someone|we|they|you)|have\s+(?:we|they|you)|has\s+(?:anyone|someone)|were\s+(?:any\s+)?tasks?|why\s+(?:did|would|do)\b|(?:which|what|how many|are any|list|show)\s+tasks?\b)/i.test(lastLine);
  if (informationalQuestion && !isTaskDraftRequest(lastLine)) return false;
  const asksTask =
    isTaskDraftRequest(lastLine)
    || /\b(?:draft|create|assign|propose|suggest|make|add|write|prepare)\b[^.\n]{0,50}\b(?:unblock|unstick)\b/i.test(lastLine)
    || /\btasks?\s+to\s+(?:unblock|unstick|address|move|re-?engage|follow[- ]?up|push)\b/i.test(lastLine);
  const asksStalled = /\b(stalled|stuck|idle|stagnant|open deals?|pipeline deals?|open pipeline|cold pipeline|cold deals?|26 deals?|haven't moved|hasn't moved|not moved)\b/i.test(text);
  const asksPayment = /\b(payments?|invoices?|overdue|advance|balance|cash collection|receivables?|unpaid|haven't paid)\b/i.test(text);
  return asksTask && asksStalled && !asksPayment;
}

export function detectStalledTaskMismatch(
  userText: string,
  toolName: string,
  args: Record<string, unknown>,
  oppStage: string | null,
  brandFlags?: { brandHasOpenOpp?: boolean; brandHasConfirmedOpp?: boolean },
): string | null {
  if (toolName !== "propose_task") return null;
  if (!isStalledTaskRequest(userText)) return null;
  const titleDesc = `${String(args.title ?? "")} ${String(args.description ?? "")}`;
  const fullText = `${titleDesc} ${String(args.rationale ?? "")}`;
  const explicitPaymentTerm = /\b(invoices?|payments?|tds|utr|overdue|receivables?|collect cash|chase (?:the )?(?:payment|balance|advance|invoice)|overdue advance|pending advance|50% balance)\b/i.test(fullText)
    || (oppStage === null && /\badvance\b/i.test(titleDesc));
  const nonOpenStage = oppStage === "partner_confirmed" || oppStage === "lost" || oppStage === "withdrawn";
  const confirmedOnlyBrand = !args.opportunity_id && !!args.brand_id && !!brandFlags?.brandHasConfirmedOpp && !brandFlags?.brandHasOpenOpp;

  if (nonOpenStage || confirmedOnlyBrand || explicitPaymentTerm) {
    return "MISMATCH: The user asked for tasks on STALLED OPEN PIPELINE DEALS (open opportunities idle >14 days in prospecting/contacted/proposal_sent/negotiating), NOT payment-chasing tasks on confirmed deals. Call diagnose_campaigns to inspect stalled_list and call propose_task for those stalled open deals.";
  }
  return null;
}
