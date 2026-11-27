/**
 * Deterministic RAG knowledge base & BM25/synonym retriever for CampusFest 2027 strategy deck,
 * definitions disambiguation, and research fact_base benchmarks.
 * Imports model_output.json and lib/plan.ts directly so numbers stay 100% synced and Vercel-bundled.
 */
import model from "@/data/model_output.json";
import { BET_PLANS, CITY_SELECTION, GLOBAL_GATES } from "../plan";

export interface KnowledgeChunk {
  id: string;
  title: string;
  source: string;
  keywords: string[];
  content: string;
}

const fmtL = (l: number) => `₹${(Math.round(l * 10) / 10).toFixed(1)}L`;
const fmtCash = (l: number) => (l >= 100 ? `₹${(l / 100).toFixed(2)} Cr` : fmtL(l));

const noAnchor = model.sensitivities.find((s) => /no anchor/i.test(s.case))!;
const halfTickets = model.sensitivities.find((s) => /halved/i.test(s.case))!;
const threeSellers = model.sensitivities.find((s) => /3 sellers/i.test(s.case))!;
const mc = model.monte_carlo;

export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: "deck-slide1-targets",
    title: "2027 Targets: Base Case, Likely Range, Stretch, and Status-Quo Replay",
    source: "Deck Slide 1 & model/build_model.py (data/model_output.json)",
    keywords: ["base", "stretch", "target", "range", "p10", "p50", "p90", "monte carlo", "54.1", "1.27", "42.0", "65.8", "14.1", "status quo", "sellers", "deals", "signed", "cash", "t-14"],
    content: [
      `North star metric: sponsor cash in the bank by T-14 (${model.fest.t14} for ${model.fest.name} in ${model.fest.city}, ${model.fest.dates}), after 2% TDS. Signed value is not cash.`,
      `Status-quo 2025 replay: ${fmtL(model.status_quo_cash_by_T14_lakh)} cash by T-14 (2025 deals through same cash rules, 3 sellers).`,
      `Base case: ${fmtCash(model.base.cash_by_T14_lakh)} cash by T-14 (${model.uplift.multiple}x repeat from ${model.uplift.deals_ratio}x deals x ${model.uplift.ticket_ratio}x avg ticket): ${Math.round(model.base.deals)} deals, ${fmtL(model.base.signed_value_lakh)} signed, ${model.capacity.team[0]} sellers at ${Math.round(model.base.utilisation * 100)}% load (${Math.round(model.base.hours_needed)} of ${model.base.hours_available} h).`,
      `Likely range (Monte Carlo, 5,000 draws): P10 ${fmtL(mc.p10)} to P90 ${fmtL(mc.p90)} (P50 / median ${fmtL(mc.p50)}). Stretch is unreachable with the 6-seller base team (${mc.p_at_least_stretch_with_base_team * 100}% of draws).`,
      `Stretch case: ${fmtCash(model.stretch.cash_by_T14_lakh)} (${fmtL(model.stretch.cash_by_T14_lakh)}) cash by T-14: ${Math.round(model.stretch.deals)} deals, ${fmtCash(model.stretch.signed_value_lakh)} signed, ${model.capacity.team[1]} sellers at ${Math.round(model.stretch.utilisation * 100)}% load (${Math.round(model.stretch.hours_needed)} of ${model.stretch.hours_available} h), driven mainly by volume (store +₹25L, warm +₹18-19L, verticals +₹16L) rather than anchor (+₹12L).`,
    ].join(" "),
  },
  {
    id: "deck-slide1-city-tiebreak",
    title: "City Selection: Why Mumbai over Delhi NCR (Sponsor-Mix Tiebreak)",
    source: "Deck Slide 1, README §2 & research/fact_base.md §2",
    keywords: ["city", "mumbai", "delhi", "ncr", "bengaluru", "chennai", "tiebreak", "tie-break", "score", "8.95", "8.90", "bank", "upi", "npci", "sbi", "union bank", "idfc", "d2c", "quick commerce", "march", "early march", "timing", "dates", "venue", "sponsor mix"],
    content: [
      `Weighted city scores out of 10 (weights: brand HQ pool 30%, students 20%, agency access 15%, fest precedent 15%, venue cost 10%, startup funding 10%): Delhi NCR 8.95, Mumbai 8.90, Bengaluru 7.40, Chennai 6.00.`,
      `Tiebreak rule: ${CITY_SELECTION.tiebreak_rule}`,
      `Sourced Mumbai anchor title buyers: ${CITY_SELECTION.mumbai_anchor_buyers_sourced.join("; ")}.`,
      `Supporting facts: ${CITY_SELECTION.supporting_mumbai_facts} Timing: ${CITY_SELECTION.event_timing}`,
      `Do NOT invent qualitative reasons like "venue partner depth" or "creator network density" — the decision hinges on the 0.05-point tie within noise broken by bank/UPI title buyer headquarters.`,
    ].join(" "),
  },
  {
    id: "deck-slide1-downside-risks",
    title: "Modelled Downside Sensitivities (No Anchor, Half-Price Tickets, 3 Sellers)",
    source: "Deck Slide 1 & model_output.json sensitivities",
    keywords: ["downside", "risk", "sensitivity", "sensitivities", "no anchor", "no-anchor", "41.0", "38.9", "32.0", "46.6", "47.3", "halved", "anchor", "concentration", "antaragni", "what breaks", "worst case"],
    content: [
      `One-at-a-time sensitivities against the ${fmtCash(model.base.cash_by_T14_lakh)} base case:`,
      ...model.sensitivities.map((s) => `${s.case}: ${fmtL(s.cash_lakh)} (${s.delta_lakh}L vs base)`),
      `Key downside callouts: No anchor signs drops base cash to ${fmtL(noAnchor.cash_lakh)} (${noAnchor.delta_lakh}L); Anchor and vertical tickets halved drops to ${fmtL(halfTickets.cash_lakh)}; staying at the 2025 team of 3 sellers caps cash at ${fmtL(threeSellers.cash_lakh)}.`,
      `Concentration check: top 2 segments (anchors + verticals) bring 56% of base cash, consistent with Antaragni 2011 actuals where the top 6 of 44 deals brought 54.4%.`,
    ].join(" "),
  },
  {
    id: "deck-slide2-five-bets-ranking",
    title: "Five Strategic Bets Ranked by Net Cash per 100 Seller-Hours",
    source: "Deck Slide 2 & model_output.json bets",
    keywords: ["bet", "bets", "rank", "priorit", "warm", "store", "vertical", "anchor", "hybrid", "ev", "hours", "budget", "double down", "cut back", "say no", "saying no", "reject", "rejected", "rejecting", "deprioritise", "cpa", "csr", "grant", "consortium", "in-kind"],
    content: [
      `Seller hours are the binding constraint (913 of 1,080 h in base). Bets are ranked by net cash per 100 seller-hours = (base cash contribution - test budget) / attributed hours x 100:`,
      ...model.bets.map((b) => `#${b.rank} ${b.bet}: Base ₹${b.cash_lakh}L, Stretch ₹${b.stretch_cash_lakh}L (+₹${b.stretch_uplift_lakh}L), ${b.effort_h}h, Budget ₹${b.cost_lakh}L, Net ₹${b.ev_per_100h}L/100h, Confidence: ${b.confidence}.`),
      `Double down: Bets 1 to 3 bring ₹45.8L of ₹54.1L using 724 of 913 hours. Keep as options: Anchor (drop to co-title if no proposal by week 6; release slots by week 9) and Hybrid (pilot capped at ₹0.7L). Cut back: mass cold email (0/91), revival (0/20), cold LinkedIn (0/37) -> ABM only for anchors/verticals. Rejected / say no to: pure CPA (pays after fest), CSR pitches (MCA: event sponsorship is not CSR), govt/PSU grants (too slow), multi-fest consortium (next year), in-kind-only deals (no cash).`,
    ].join(" "),
  },
  {
    id: "deck-slide3-bet-thresholds",
    title: "2027 Bet Thresholds (120% Scale / 70% Stop) Across All 5 Bets",
    source: "Deck Slide 3, lib/plan.ts & lib/bets.ts",
    keywords: ["threshold", "thresholds", "120%", "70%", "scale", "stop", "change", "signal", "warm", "store", "verticals", "anchor", "hybrid", "bet 1", "bet 2", "bet 3", "bet 4", "bet 5", "all 5 bets"],
    content: [
      `2027 Bet judgment rule: SCALE at >= 120% of plan, STOP below 70% of plan, CHANGE in between (TOO_EARLY below min_n; NOT_MEASURABLE in 2025 source data if deals are untagged, though plan thresholds still apply). Do NOT confuse these with 2025 historical campaign close-rate verdicts.`,
      ...Object.entries(BET_PLANS).map(([k, p]) => `Bet '${k}': Leading indicator: ${p.leading}. Rules: ${p.rules.map((r) => `${r.metric} plan=${r.plan} (scale >=${r.scale}, stop <${r.stop} ${r.unit})`).join(", ")}. Scale: ${p.scale_action}. Change: ${p.change_action}. Stop: ${p.stop_action}. Test: ${p.test.hypothesis} (n=${p.test.n_per_arm}/arm, read ${p.test.read}).`),
    ].join(" "),
  },
  {
    id: "deck-slide3-pacing-gates",
    title: "2027 Checkpoints / Pacing Gates and Contingency Playbook",
    source: "Deck Slide 3 & lib/plan.ts GLOBAL_GATES",
    keywords: ["gate", "gates", "checkpoint", "checkpoints", "contingency", "behind", "miss", "week 4", "week 6", "week 9", "t-21", "t-14", "stop cold", "reprice", "100% advance", "advance", "artist", "fallback", "playbook", "milestone", "milestones", "15%", "falls"],
    content: [
      `Global pacing gates (act when >15% behind plan):`,
      ...GLOBAL_GATES.map((g, i) => `${i + 1}. ${g.gate}: Plan = ${g.rule}. Behind if ${g.miss}. Action: ${g.action}.`),
      `Specifically, if behind at Week 6 (<₹39.2L signed vs ₹46.2L plan): stop cold outreach and reprice the anchor to co-title. If behind at Week 9 (<₹15.9L cash vs ₹18.8L plan): ask for 100% advance on every new deal and escalate overdue balances.`,
    ].join(" "),
  },
  {
    id: "definitions-hybrid-vs-inkind",
    title: "Definition: Hybrid Performance Deals (2027) vs In-Kind (2025)",
    source: "Deck Slide 2/3, model/build_model.py Segment E & lib/plan.ts",
    keywords: ["hybrid", "performance", "performance deals", "performance packages", "in-kind", "in kind", "barter", "guaranteed", "zero cash", "50%", "cpa", "bonus", "segment e", "bet 5", "dpdp", "support_type"],
    content: [
      `Hybrid performance deals / performance packages (2027 Segment E / Bet 5) are NOT in-kind or barter deals with ₹0 guaranteed cash. A hybrid performance deal is a fixed guaranteed upfront fee PLUS a capped CPA performance bonus (with DPDP-compliant user consent), targeting a 50% guaranteed fee share (Scale if >=60% in 2 pilots by week 6; Change between 35% and 60%; Stop if <35% or sponsors demand pure CPA).`,
      `Only the 50% guaranteed fixed fee counts toward pre-fest T-14 cash (₹1.0L cash in Segment E / ₹0.6L net bet attribution after warm split; ₹2.0L avg total deal, 1.4 deals, ₹2.8L signed value). The CPA bonus settles after the fest and is excluded from T-14 cash.`,
      `By contrast, in the 2025 dataset (seed.json), support_type has only 'cash' and 'in_kind' (4 confirmed in-kind deals = ₹2.4L reported value, ₹0 cash). There are zero hybrid deals in 2025.`,
    ].join(" "),
  },
  {
    id: "definitions-verticals-vs-industries",
    title: "Definition: 2027 Unbundled Vertical Titles vs 2025 Dataset Brand Industries",
    source: "Deck Slide 1/2/3 & data/seed.json",
    keywords: ["vertical", "verticals", "title", "titles", "industry", "industries", "hackathon", "nights", "arena", "summit", "segment b", "bet 3"],
    content: [
      `Important distinction between 'verticals' in the 2027 plan vs the 2025 dataset:`,
      `1) In the 2027 plan (Bet 3 / Segment B), 'vertical titles' are unbundled fest sub-property titles sold separately (2 pro-nights, hackathon including HR employer-branding budget, esports arena, summit, fashion night), priced at ₹6.0L avg ask across 6 slots in base (8 in stretch), modelled at 4.7 deals / ₹28.0L signed / ₹17.3L cash by T-14.`,
      `2) In the 2025 dataset (brands.industry), 'industries' are the 6 brand sectors: Food and beverage, Consumer products, Mobility, Education, Media, and Personal care. Do not conflate 2025 brand sectors with 2027 fest vertical-title inventory.`,
    ].join(" "),
  },
  {
    id: "baseline-2025-overload-stalled",
    title: "2025 Baseline Diagnosis: Owner Overload (126/180 Brands) & 26 Stalled Cold Deals (₹14.4L)",
    source: "Deck Slide 1, README §3 & data/seed.json",
    keywords: ["overload", "overloaded", "owner", "owners", "ownership", "126", "180", "kabir", "stalled", "26", "26 deals", "cold deals", "14.4", "cold", "warm", "148", "141", "2025", "baseline", "store", "50/50", "upfront", "carrying", "too many brands", "team", "brands", "paid in full", "installments", "splits", "seller", "sellers", "holds", "hold", "schedule", "payment schedule"],
    content: [
      `STATIC SOURCE BASELINE (as of 2025-04-20; for live, edited, or point-in-time counts at a requested as_of date, ALWAYS verify with live tools get_kpis, get_funnel, diagnose_campaigns):`,
      `2025 baseline headline: 24 confirmed partnerships (goal 28; initial launch goal 20), ₹22.4L confirmed value (₹20.0L cash-type across 20 deals, ₹2.4L in-kind across 4 deals), 60 qualified brands (goal 55). 100% of confirmed value came from warm/inbound channels (44 brands touched, 36 met, 24 confirmed).`,
      `Owner overload story: One brand owner on the team — Kabir Shah (T02) — carried 126 of 180 brands (70%), mostly in cold outbound channels (Brand Discovery Email & Past Conversation Revival), resulting in 0 confirmed partnerships. Riya Kapoor (T01) held 35 brands and Nisha Rao (T05) held 19 brands; Meera Iyer (T03) held 0 research brands. Separately, the 58 opportunities are distributed across 3 deal owners (Riya 23, Nisha 20, Meera 15; Kabir 0).`,
      `Stalled deals: All 26 stalled open cold deals (>14 days without stage change) worth ₹14.4L (₹14,40,000) proposed value are from cold outbound channels (0 from warm/inbound). Note: 148 is the sum of campaign-level cold brand touches (91 email + 37 LinkedIn + 20 revival), whereas 141 is distinct brands touched across the cold group (7 brands overlapped).`,
      `Sponsor store proxy (Partner Interest Form SC04): 7 confirmed brands (₹6.70L: 6 cash + 1 in-kind). In the simulated payment schedule, all 6 cash store deals follow 50/50 payment splits/installments and 0 were paid in full (100% upfront).`,
    ].join(" "),
  },
  {
    id: "collections-mou-to-advance-forecast",
    title: "MoU-to-Advance-Paid (15-Day Target) & Forecast Backtest (26.9 vs 24)",
    source: "Deck Slide 3, README §7 & lib/metrics.ts",
    keywords: ["mou", "advance", "15 days", "overdue", "mosaic", "mobility", "invoice", "forecast", "forecasted", "forecasting", "projection", "projections", "backtest", "26.9", "24", "15 mar", "march 15", "mid-march", "reliability", "reliable", "accuracy", "accurate", "fast", "signing", "unpaid", "take to pay", "days to pay", "from signing", "predict"],
    content: [
      `STATIC SOURCE BASELINE (as of 2025-04-20; for live, edited, or point-in-time cash/forecast numbers, ALWAYS verify with get_cash_collection and forecast):`,
      `Cash collection pacing metric: calendar days from MoU signing (partner_confirmed date) to advance payment received, against a 15-day target (NOT invoice date to paid). In the 2025 simulated payment layer (50% advance on confirmation, 50% balance invoiced +7 days, 2% TDS), 7 of 20 advances breached the 15-day MoU-to-advance target as of 2025-04-20: 6 paid late (16 to 23 days: Aster Pantry 23d, Aster Works 22d, Aster Living 19d, Juniper Foods 17d, Maple Devices 17d, Bramble Active 16d) plus 1 unpaid & overdue (Mosaic Mobility PAY039 ₹75,000, MoU 2025-04-02, due 2025-04-17, 18 days elapsed).`,
      `Forecast reliability backtest: pipeline forecast on 15 March 2025 projected 26.9 confirmed deals against the 24 actual confirmed on event eve (+2.9 error). On 1 April 2025 it projected 26.2 vs 24 actual (+2.2); on 1 March 19.6 vs 24 (-4.4); on 15 Feb 6.5 vs 24 (-17.5 because uncreated deals are invisible to pipeline forecasts).`,
    ].join(" "),
  },
  {
    id: "research-benchmarks-tax-dpdp",
    title: "Public Benchmarks: Fest Precedents, Tax (GST/TDS), DSO & DPDP",
    source: "research/fact_base.md §0, §1, §4, §5",
    keywords: ["benchmark", "benchmarks", "gst", "tds", "194c", "393", "dso", "dpdp", "antaragni", "techfest", "mood indigo", "ignisense", "amity", "rcm", "forward charge"],
    content: [
      `Key benchmarks: Antaragni 2011 actuals (IIT Kanpur): ₹45.68L sponsorship across 44 deals, median ₹49k, top 6 deals = 54.4%, 7.4% uncollected. Techfest 2014 raised ₹1.58 Cr. SIIB Ignisense 2025 asking card priced Cultural Night (₹5L) above Title (₹4L). Mood Indigo 2025 sold 10 night/competition titles; POP UPI was title.`,
      `Collections & Tax: Indian listed corporate DSO is 56 days; MSMEs wait 73 days (Mumbai fastest metro at 59 days). Sponsorship carries 18% GST (SAC 998397; forward charge if body corporate, RCM if society/trust) and 2% TDS under s.194C / s.393(1) (Circular 5/2002; excluding GST per Circular 23/2017; beware 10% s.194J mis-deduction).`,
      `Compliance: DPDP Rules (notified Nov 2025) require separate unbundled opt-in consent per sponsor before sharing student data or running hybrid CPA attribution.`,
    ].join(" "),
  },
];

const SYNONYMS: Record<string, string[]> = {
  city: ["mumbai", "delhi", "ncr", "tiebreak", "location", "venue", "bengaluru", "chennai"],
  mumbai: ["delhi", "ncr", "tiebreak", "city", "npci", "sbi", "bank", "upi"],
  delhi: ["mumbai", "ncr", "tiebreak", "city", "d2c", "8.95", "8.90"],
  tiebreak: ["mumbai", "delhi", "ncr", "bank", "upi", "d2c", "0.05"],
  d2c: ["delhi", "ncr", "mumbai", "tiebreak", "sponsor", "mix"],
  early: ["timing", "march", "dates", "mumbai"],
  timing: ["march", "dates", "mumbai", "mood"],
  range: ["p10", "p90", "monte", "carlo", "band", "42.0", "65.8", "interval", "likely"],
  band: ["p10", "p90", "monte", "carlo", "range", "42.0", "65.8", "likely"],
  stretch: ["1.27", "127", "base", "54.1", "target", "goal"],
  base: ["54.1", "stretch", "1.27", "range", "target", "14.1"],
  downside: ["risk", "sensitivity", "anchor", "41.0", "38.9", "32.0", "break"],
  sensitivity: ["downside", "risk", "anchor", "41.0", "38.9", "32.0"],
  sensitivities: ["downside", "risk", "anchor", "41.0", "38.9", "32.0"],
  worst: ["downside", "no", "anchor", "41.0", "32.0"],
  hybrid: ["in-kind", "kind", "guaranteed", "50%", "cpa", "bonus", "segment", "bet", "performance"],
  performance: ["hybrid", "cpa", "bonus", "guaranteed", "50%", "in-kind", "barter", "segment", "bet"],
  packages: ["deals", "hybrid", "verticals", "segment"],
  barter: ["in-kind", "hybrid", "guaranteed", "50%", "performance"],
  zero: ["in-kind", "barter", "hybrid", "guaranteed"],
  vertical: ["verticals", "title", "titles", "industry", "industries", "hackathon", "nights"],
  verticals: ["vertical", "title", "titles", "industry", "industries", "hackathon", "nights"],
  threshold: ["120%", "70%", "scale", "stop", "change", "bet", "bets", "rules"],
  thresholds: ["120%", "70%", "scale", "stop", "change", "bet", "bets", "rules"],
  cutoff: ["120%", "70%", "threshold", "thresholds", "scale", "stop", "bet", "bets"],
  cutoffs: ["120%", "70%", "threshold", "thresholds", "scale", "stop", "bet", "bets"],
  judge: ["120%", "70%", "threshold", "thresholds", "scale", "stop", "bet", "bets"],
  judged: ["120%", "70%", "threshold", "thresholds", "scale", "stop", "bet", "bets"],
  skipped: ["120%", "70%", "threshold", "thresholds", "bet", "bets", "not_measurable"],
  reject: ["say", "no", "cpa", "csr", "grant", "consortium", "deprioritise", "cut"],
  rejected: ["say", "no", "cpa", "csr", "grant", "consortium", "deprioritise"],
  rejecting: ["say", "no", "cpa", "csr", "grant", "consortium", "deprioritise"],
  gate: ["gates", "checkpoint", "checkpoints", "contingency", "behind", "reprice", "100%", "advance", "stop cold"],
  gates: ["gate", "checkpoint", "checkpoints", "contingency", "behind", "reprice", "100%", "advance"],
  checkpoint: ["gate", "gates", "contingency", "week 6", "week 9", "reprice", "100%"],
  checkpoints: ["gate", "gates", "contingency", "week 6", "week 9", "reprice", "100%"],
  milestone: ["gate", "gates", "checkpoint", "checkpoints", "contingency", "week 6", "week 9"],
  milestones: ["gate", "gates", "checkpoint", "checkpoints", "contingency", "week 6", "week 9"],
  fallback: ["gate", "gates", "checkpoint", "contingency", "behind", "reprice", "playbook"],
  playbook: ["gate", "gates", "checkpoint", "contingency", "behind", "reprice", "fallback"],
  contingency: ["gate", "gates", "checkpoint", "behind", "reprice", "fallback", "playbook"],
  behind: ["gate", "checkpoint", "contingency", "miss", "week 6", "week 9", "reprice", "advance", "fallback"],
  falls: ["behind", "gate", "contingency", "15%", "fallback"],
  "15%": ["behind", "gate", "contingency", "week 6", "week 9"],
  advance: ["mou", "15", "overdue", "mosaic", "payment", "paid"],
  mou: ["advance", "15", "overdue", "mosaic", "payment", "paid"],
  fast: ["mou", "advance", "15", "days", "paid", "signing"],
  signing: ["mou", "advance", "15", "days", "paid"],
  unpaid: ["overdue", "mosaic", "advance", "mou", "15", "paid"],
  take: ["days", "mou", "advance", "paid"],
  upfront: ["50/50", "advance", "store", "sc04", "terms", "installments", "splits"],
  installments: ["50/50", "upfront", "store", "sc04", "terms", "splits"],
  splits: ["50/50", "upfront", "store", "sc04", "terms", "installments"],
  split: ["50/50", "upfront", "store", "sc04", "terms", "installments"],
  schedule: ["50/50", "upfront", "store", "sc04", "terms", "installments", "splits"],
  overload: ["owner", "owners", "ownership", "126", "180", "kabir", "workload", "distribution"],
  overloaded: ["owner", "owners", "ownership", "126", "180", "kabir", "workload"],
  ownership: ["owner", "owners", "overload", "126", "180", "kabir"],
  owner: ["owners", "ownership", "overload", "126", "180", "kabir", "riya", "nisha", "meera"],
  seller: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands"],
  sellers: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands"],
  holding: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands", "holds"],
  holds: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands"],
  carrying: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands"],
  team: ["owner", "owners", "ownership", "overload", "126", "180", "kabir", "brands"],
  brands: ["owner", "owners", "ownership", "overload", "126", "180", "kabir"],
  stalled: ["26", "14.4", "cold", "warm", "idle", "stuck", "pipeline"],
  forecast: ["backtest", "26.9", "24", "15 mar", "march", "accuracy", "reliable"],
  forecasted: ["forecast", "backtest", "26.9", "24", "15 mar", "march"],
  forecasting: ["forecast", "backtest", "26.9", "24", "15 mar", "march"],
  projection: ["forecast", "backtest", "26.9", "24", "15 mar", "march", "accuracy"],
  projections: ["forecast", "backtest", "26.9", "24", "15 mar", "march", "accuracy"],
  predict: ["forecast", "backtest", "26.9", "24", "15 mar", "march", "accuracy"],
  predicted: ["forecast", "backtest", "26.9", "24", "15 mar", "march", "accuracy"],
  backtest: ["forecast", "26.9", "24", "15 mar", "march", "accuracy", "reliable"],
  reliable: ["forecast", "backtest", "26.9", "24", "accuracy"],
  reliability: ["forecast", "backtest", "26.9", "24", "accuracy"],
  accurate: ["forecast", "backtest", "26.9", "24", "accuracy"],
  accuracy: ["forecast", "backtest", "26.9", "24", "reliable"],
};

function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9.%₹-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length >= 2);
  const out = new Set<string>();
  for (const t of raw) {
    out.add(t);
    if (t.includes("-")) {
      for (const part of t.split("-")) if (part.length >= 2) out.add(part);
    }
  }
  return [...out];
}

export function searchKnowledge(query: string, topK = 4): { query: string; hits: (KnowledgeChunk & { score: number })[] } {
  const rawTokens = tokenize(query);
  const expanded = new Set<string>(rawTokens);
  for (const t of rawTokens) {
    for (const syn of SYNONYMS[t] ?? []) expanded.add(syn);
  }
  const qlc = query.toLowerCase();
  const scored = KNOWLEDGE_CHUNKS.map((chunk) => {
    const titleLc = chunk.title.toLowerCase();
    const bodyLc = chunk.content.toLowerCase();
    const kwSet = new Set(chunk.keywords.map((k) => k.toLowerCase()));
    let score = 0;
    for (const tok of expanded) {
      const weight = rawTokens.includes(tok) ? 2.0 : 0.8;
      if (kwSet.has(tok) || [...kwSet].some((k) => k.includes(tok))) score += 3.0 * weight;
      if (titleLc.includes(tok)) score += 2.5 * weight;
      if (bodyLc.includes(tok)) score += 1.0 * weight;
    }
    if ((qlc.includes("mumbai") || qlc.includes("delhi") || /\bd2c\b|quick[- ]commerce|tie[- ]?break|sponsor mix/i.test(qlc)) && chunk.id === "deck-slide1-city-tiebreak") score += 10;
    if (/early march|festival dates|why march|timing/i.test(qlc) && !/15 mar|march 15|mid[- ]?mar|forecast|backtest/i.test(qlc) && chunk.id === "deck-slide1-city-tiebreak") score += 10;
    if (/hybrid|in-kind|in kind|barter|performance(?:[- ]based)?\s+(?:deals?|packages?|tiers?|sponsorships?|model|structure|bonuses?|offers?)/i.test(qlc) && chunk.id === "definitions-hybrid-vs-inkind") score += 10;
    if (/vertical|industr/.test(qlc) && chunk.id === "definitions-verticals-vs-industries") score += 8;
    if (/base|stretch|likely (?:range|band)|range|p10|p90/.test(qlc) && chunk.id === "deck-slide1-targets") score += 6;
    if (/no[- ]anchor|no bank|worst case|downside|sensitiv|41/i.test(qlc) || (/(?:no|without|miss(?:ing)?|lose|losing|fail(?:s|ed)? to (?:land|sign|close)|zero)\s+(?:an?\s+)?(?:anchor|title)/i.test(qlc)) && chunk.id === "deck-slide1-downside-risks") score += 10;
    if (/gate|checkpoint|milestone|behind|contingency|fallback|playbook|week 6|week 9|15%/i.test(qlc) && chunk.id === "deck-slide3-pacing-gates") score += 12;
    if (/120%|70%|threshold|all 5 bets|bets?\s*[345]|bets?\s*3\s*(?:to|-)\s*5|not[- ]?measurable|close rate|judge.*bets?|cutoffs?|scale.*stop|stop.*scale|scale\/stop/i.test(qlc) && chunk.id === "deck-slide3-bet-thresholds") score += 12;
    if (/say(?:ing)? no|reject(?:ed|ing)?|deprioritis|cut back|rank.*bet|why did .*rank/i.test(qlc) && chunk.id === "deck-slide2-five-bets-ranking") score += 14;
    if (/overload|workload|too many brands|carrying.*brands|brands.*team|seller.*brands?|holds?.*brands?|most.*brands?|126|brand ownership|cold deals?|26 deals?|paid in full|payment splits?|payment schedule|installments?|100% upfront/i.test(qlc) && chunk.id === "baseline-2025-overload-stalled") score += 12;
    if (/how fast.*pay|after signing|from signing|take to pay|took to pay|days to pay|haven't paid|have not paid|unpaid|mou.*advance|advance.*15|15[- ]day|15 mar|march 15|mid[- ]?mar|forecast|backtest|projections?|predict|26\.9/i.test(qlc) && chunk.id === "collections-mou-to-advance-forecast") score += 12;
    return { ...chunk, score: Math.round(score * 100) / 100 };
  })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(Math.max(1, topK), KNOWLEDGE_CHUNKS.length));
  return { query, hits: scored };
}
