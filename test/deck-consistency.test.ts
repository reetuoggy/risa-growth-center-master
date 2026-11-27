import { describe, expect, it, vi, beforeEach } from "vitest";
import seed from "../data/seed.json";
import type { DB, Payment } from "../lib/types";
import { snapshot, cashCollection, stalled, bottlenecks, ownerRows, funnelRows } from "../lib/metrics";
import { betSignals } from "../lib/bets";
import { plan2027 } from "../lib/plan";
import { runTool, queryRecords } from "../lib/copilot/tools";
import { searchKnowledge } from "../lib/copilot/knowledge";
import { buildTurnRoutingCue, detectStalledTaskMismatch, isStalledTaskRequest, isSubstantiveQuery, isTaskDraftRequest, resolveTurnScope } from "../lib/copilot/routing";
import { systemPrompt } from "../lib/copilot/prompt";

const db = seed as unknown as DB;

describe("Q1 & Q2: store brands (Partner Interest Form SC04) and 50/50 vs upfront", () => {
  const s = snapshot(db, "2025-04-20");
  it("has 7 confirmed SC04 brands, 6 cash deals all 50/50 and 0 paid 100% upfront", () => {
    const res = runTool(db, "list_opportunities", { campaign: "SC04", stage: "partner_confirmed" }, "2025-04-20").result as {
      count: number;
      rows: { opportunity_id: string; support_type: string }[];
    };
    expect(res.count).toBe(7);
    const cashIds = res.rows.filter((r) => r.support_type === "cash").map((r) => r.opportunity_id);
    expect(cashIds.length).toBe(6);
    for (const id of cashIds) {
      const pays = db.payments.filter((p) => p.opportunity_id === id);
      expect(pays.map((p) => p.installment).sort()).toEqual(["advance", "balance"]);
      expect(pays[0].amount_inr).toBe(pays[1].amount_inr);
    }
    expect(s.asOf).toBe("2025-04-20");
  });
});

describe("Q4, Q5, Q14, Q15, Q16: 2027 plan, range, downside, hybrid, city tiebreak, gates", () => {
  const plan = plan2027();

  it("Q15: returns ₹54.1L base, ₹42.0L-₹65.8L likely range, ₹1.27 Cr stretch, ₹14.1L replay", () => {
    expect(plan.headline_summary.base_cash_by_t14).toBe("₹54.1L");
    expect(plan.headline_summary.likely_range_p10_p90).toBe("₹42.0L to ₹65.8L");
    expect(plan.headline_summary.stretch_cash_by_t14).toBe("₹1.27 Cr");
    expect(plan.headline_summary.status_quo_2025_replay_cash).toBe("₹14.1L");
    expect(plan.uncertainty.p10).toBe(42.0);
    expect(plan.uncertainty.p90).toBe(65.8);
  });

  it("Q16: exposes weighted city scores and sponsor-mix tiebreak (Mumbai vs Delhi NCR)", () => {
    expect(plan.city_selection.selected_city).toBe("Mumbai");
    const scores = Object.fromEntries(plan.city_selection.weighted_scores_out_of_10.map((c) => [c.city, c.score]));
    expect(scores["Delhi NCR"]).toBe(8.95);
    expect(scores["Mumbai"]).toBe(8.9);
    expect(plan.city_selection.tiebreak_rule).toMatch(/0\.05/);
    expect(plan.city_selection.tiebreak_rule).toMatch(/bank and UPI/i);
    expect(plan.city_selection.mumbai_anchor_buyers_sourced.join(" ")).toMatch(/NPCI.*SBI.*Union Bank.*IDFC FIRST/);
  });

  it("Q4: cites modelled downside sensitivities including no anchor = ₹41.0L", () => {
    expect(plan.headline_summary.downside_no_anchor).toMatch(/₹41\.0L/);
    const noAnchor = plan.sensitivities.find((x) => /no anchor/i.test(x.case));
    expect(noAnchor?.cash_lakh).toBe(41.0);
    expect(noAnchor?.delta_lakh).toBe(-13.2);
  });

  it("Q5: defines hybrid (Segment E / Bet 5) as 50% guaranteed fixed fee + capped CPA, not in-kind ₹0", () => {
    const segE = plan.base.segments.find((s) => s.key === "E")!;
    expect(segE.guaranteed_share).toBe(0.5);
    expect(segE.cash_lakh).toBe(1.0);
    expect(plan.definitions_and_disambiguation.hybrid_vs_in_kind).toMatch(/NOT in-kind/i);
    expect(plan.definitions_and_disambiguation.hybrid_vs_in_kind).toMatch(/50% guaranteed/i);
  });

  it("Q14: global gates specify stop cold (cut cold ABM), reprice anchor, and 100% advance", () => {
    const w6 = plan.gates.find((g) => g.gate === "Week 6")!;
    const w9 = plan.gates.find((g) => g.gate === "Week 9")!;
    expect(w6.action).toMatch(/cold/i);
    expect(w6.action).toMatch(/re-price anchor/i);
    expect(w9.action).toMatch(/100% advance/i);
  });

  it("distinguishes 2027 unbundled vertical titles from 2025 dataset brand industries", () => {
    expect(plan.definitions_and_disambiguation.verticals_vs_dataset_industries).toMatch(/unbundled fest sub-property titles/i);
    expect(plan.definitions_and_disambiguation.verticals_vs_dataset_industries).toMatch(/brands\.industry/i);
  });
});

describe("Q6: 2027 bet signals include 120%/70% plan thresholds across ALL 5 bets", () => {
  const b = betSignals(snapshot(db, "2025-04-20"));
  it("returns all 5 bets with non-empty plan_thresholds and scale/change/stop actions", () => {
    expect(b.bets.map((x) => x.bet)).toEqual(["warm", "store", "verticals", "anchor", "hybrid"]);
    expect(b.rule).toMatch(/120%/);
    expect(b.rule).toMatch(/70%/);
    for (const bet of b.bets) {
      expect(bet.plan_thresholds.length).toBeGreaterThan(0);
      expect(bet.actions.scale).toBeTruthy();
      expect(bet.actions.change).toBeTruthy();
      expect(bet.actions.stop).toBeTruthy();
    }
    const by = Object.fromEntries(b.bets.map((x) => [x.bet, x]));
    // Bets 3-5 remain NOT_MEASURABLE in 2025 data while exposing full thresholds
    expect(by.verticals.signal).toBe("NOT_MEASURABLE");
    expect(by.verticals.plan_thresholds[0]).toMatchObject({ metric: "avg_ask_lakh", plan: 6, scale_at: 7.2, stop_below: 4.2 });
    expect(by.anchor.signal).toBe("NOT_MEASURABLE");
    expect(by.anchor.plan_thresholds[0]).toMatchObject({ metric: "anchors_at_proposal_wk6", plan: 2, scale_at: 3, stop_below: 1 });
    expect(by.hybrid.signal).toBe("NOT_MEASURABLE");
    expect(by.hybrid.plan_thresholds[0]).toMatchObject({ metric: "guaranteed_share", plan: 0.5, scale_at: 0.6, stop_below: 0.35 });
  });
});

describe("Q7: stalled deals value (₹14.4L) and warm vs cold separation", () => {
  it("reports 26 stalled deals worth ₹14.4L, 100% cold outbound and 0 warm/inbound", () => {
    const s = snapshot(db, "2025-04-20");
    const bn = bottlenecks(s);
    expect(bn.stalled_open_opportunities.count).toBe(26);
    expect(bn.stalled_open_opportunities.value_inr).toBe(1_440_000);
    expect(bn.stalled_open_opportunities.value_lakh).toBe(14.4);
    expect(bn.stalled_open_opportunities.by_channel_group["cold outbound"]).toEqual({ count: 26, value_inr: 1_440_000, value_lakh: 14.4 });
    expect(bn.stalled_open_opportunities.by_channel_group["warm/inbound"]).toEqual({ count: 0, value_inr: 0, value_lakh: 0 });
    for (const item of stalled(s)) {
      expect(item.channel_group).toBe("cold outbound");
      expect(item.owner_id).toBeTruthy();
      expect(item.brand_id).toBeTruthy();
      expect(item.sponsor_campaign_id).toBeTruthy();
    }
  });

  it("dynamically separates warm stalled deals if a warm deal becomes stalled", () => {
    const modDb: DB = structuredClone(db);
    // O001 (Beardo, SC02 warm introduction) -> inject a negotiating version on 2025-03-05 after removing its confirmation
    modDb.opp_history = modDb.opp_history.filter((h) => !(h.opportunity_id === "O001" && h.stage === "partner_confirmed"));
    modDb.opp_history.push({
      opportunity_id: "O001", brand_id: "A001", brand_name: "Beardo", opportunity_name: "Beardo x CampusFest",
      stage: "negotiating", proposed_value_inr: 200_000, confirmed_value_inr: 0, owner_id: "T01", owner_name: "Riya Kapoor",
      effective_at: "2025-03-05T12:00:00+05:30", history_id: "OH999",
    });
    const bn = bottlenecks(snapshot(modDb, "2025-04-20"));
    expect(bn.stalled_open_opportunities.by_channel_group["warm/inbound"]).toEqual({ count: 1, value_inr: 200_000, value_lakh: 2.0 });
    expect(bn.stalled_open_opportunities.by_channel_group["cold outbound"].count).toBe(26);
  });
});

describe("Q8: owner overload (126 of 180 brands held by Kabir Shah vs 3 deal owners)", () => {
  it("exposes 126/180 brand ownership overload in get_funnel(owner), get_kpis, and diagnose_campaigns", () => {
    const s = snapshot(db, "2025-04-20");
    const rows = ownerRows(s);
    const t02 = rows.find((r) => r.key === "T02")!;
    expect(t02.brands_owned).toBe(126);
    expect(t02.brands_owned_share).toBe(0.7);
    expect(t02.opportunities).toBe(0);

    const kpiRes = runTool(db, "get_kpis", {}, "2025-04-20").result as {
      owner_workload_summary: { total_brands_owned: number; overload_note: string };
    };
    expect(kpiRes.owner_workload_summary.total_brands_owned).toBe(180);
    expect(kpiRes.owner_workload_summary.overload_note).toMatch(/Kabir Shah.*126 of 180 brands/);

    const funnelOwner = runTool(db, "get_funnel", { group_by: "owner" }, "2025-04-20").result as {
      owner_workload_summary: { brand_ownership_by_owner: { owner_id: string; brands_owned: number }[] };
    };
    expect(funnelOwner.owner_workload_summary.brand_ownership_by_owner[0]).toMatchObject({ owner_id: "T02", brands_owned: 126 });
  });
});

describe("Q10: forecast backtest visibility (15 Mar 26.9 vs 24 actual)", () => {
  it("puts reliability_backtest before open rows with 15 Mar = 26.9 vs 24", () => {
    const res = runTool(db, "forecast", {}, "2025-04-20").result as Record<string, unknown>;
    const keys = Object.keys(res);
    expect(keys.indexOf("reliability_backtest")).toBeLessThan(keys.indexOf("open"));
    const bt = res.reliability_backtest as { summary: string; actual_confirmed_at_event_eve: number; points: { as_of: string; projected: number }[] };
    expect(bt.actual_confirmed_at_event_eve).toBe(24);
    expect(bt.points.find((p) => p.as_of === "2025-03-15")?.projected).toBe(26.9);
    expect(bt.summary).toMatch(/26\.9.*24/);
  });
});

describe("Q11 vs Q12: MoU-to-advance-paid (15d target) vs invoice-to-paid and overdue consistency", () => {
  it("measures MoU to advance paid (not invoice to paid) and reconciles Mosaic Mobility overdue", () => {
    const cc = cashCollection(snapshot(db, "2025-04-20"));
    expect(cc.mou_to_advance.target_days).toBe(15);
    expect(cc.mou_to_advance.total_advances).toBe(20);
    expect(cc.mou_to_advance.paid_count).toBe(19);
    expect(cc.mou_to_advance.unpaid_count).toBe(1);
    expect(cc.mou_to_advance.paid_exceeded_15_days_count).toBe(6);
    expect(cc.mou_to_advance.unpaid_exceeded_15_days_count).toBe(1);
    expect(cc.mou_to_advance.total_exceeded_15_days_count).toBe(7);

    const mosaicOverdue = cc.overdue.find((o) => o.brand === "Mosaic Mobility" && o.installment === "advance");
    expect(mosaicOverdue).toBeDefined();
    expect(mosaicOverdue?.days_since_mou).toBe(18);
    expect(cc.mou_to_advance.exceeded_15_days_list.some((x) => x.brand === "Mosaic Mobility" && x.status === "overdue_unpaid")).toBe(true);

    // query_records on payments returns the exact same 7 advances breaching 15 days from MoU
    const q = queryRecords(snapshot(db, "2025-04-20"), {
      table: "payments",
      filters: [{ field: "exceeded_15_days_from_mou", op: "eq", value: true }],
    }) as unknown as { matched_rows: number; rows: { brand_name: string }[] };
    expect(q.matched_rows).toBe(7);
    expect(q.rows.some((r) => r.brand_name === "Mosaic Mobility")).toBe(true);
  });

  it("distinguishes MoU-to-advance-paid from invoice-to-paid when invoicing lags MoU", () => {
    const modDb: DB = structuredClone(db);
    // Shift PAY005 (O009 Aster Studio, MoU 2025-02-17, paid 2025-02-24 -> 7d) to have invoice delayed to 2025-02-22, paid 2025-03-06:
    // invoice->paid = 12 days (<=15), but MoU->paid = 17 days (>15)!
    const p = modDb.payments.find((x: Payment) => x.payment_id === "PAY005")!;
    p.invoiced_at = "2025-02-22T12:00:00+05:30";
    p.due_at = "2025-03-09T12:00:00+05:30";
    p.received_at = "2025-03-06T12:00:00+05:30";
    const cc = cashCollection(snapshot(modDb, "2025-04-20"));
    const item = cc.mou_to_advance.exceeded_15_days_list.find((x) => x.payment_id === "PAY005");
    expect(item).toBeDefined();
    expect(item?.days_mou_to_paid).toBe(17);
  });

  it("honours point-in-time as-of for Mosaic Mobility advance (not visible before 2025-04-02, not overdue on 2025-04-05, exact day 15 boundary on 2025-04-17)", () => {
    const apr1 = cashCollection(snapshot(db, "2025-04-01"));
    expect(apr1.overdue.some((o) => o.brand === "Mosaic Mobility")).toBe(false);
    const apr5 = cashCollection(snapshot(db, "2025-04-05"));
    expect(apr5.overdue.some((o) => o.brand === "Mosaic Mobility")).toBe(false);
    expect(apr5.mou_to_advance.exceeded_15_days_list.some((x) => x.brand === "Mosaic Mobility")).toBe(false);
    // Exact day 15 after 2025-04-02 MoU (2025-04-17): days_since_mou === 15 -> NOT > 15
    const apr17 = cashCollection(snapshot(db, "2025-04-17"));
    expect(apr17.mou_to_advance.exceeded_15_days_list.some((x) => x.brand === "Mosaic Mobility")).toBe(false);
    const q17 = queryRecords(snapshot(db, "2025-04-17"), {
      table: "payments",
      filters: [{ field: "payment_id", op: "eq", value: "PAY039" }],
    }) as unknown as { rows: { days_since_mou: number; exceeded_15_days_from_mou: boolean }[] };
    expect(q17.rows[0].days_since_mou).toBe(15);
    expect(q17.rows[0].exceeded_15_days_from_mou).toBe(false);
    // Day 16 (2025-04-18): now exceeds 15 days
    const apr18 = cashCollection(snapshot(db, "2025-04-18"));
    expect(apr18.mou_to_advance.exceeded_15_days_list.some((x) => x.brand === "Mosaic Mobility")).toBe(true);
  });

  it("exposes live payment_terms_summary (all 50/50, 0 paid 100% upfront) and keeps tool payloads under 24KB", () => {
    const cc = runTool(db, "get_cash_collection", {}, "2025-04-20").result as {
      payment_terms_summary: {
        all_cash_confirmed_deals: number;
        split_50_50_deals: number;
        paid_100_pct_upfront_deals: number;
        sc04_store_proxy_confirmed_deals: number;
        sc04_cash_50_50_deals: number;
        sc04_in_kind_deals: number;
        sc04_paid_100_pct_upfront_deals: number;
      };
    };
    expect(cc.payment_terms_summary).toEqual({
      all_cash_confirmed_deals: 20,
      split_50_50_deals: 20,
      paid_100_pct_upfront_deals: 0,
      sc04_store_proxy_confirmed_deals: 7,
      sc04_cash_50_50_deals: 6,
      sc04_in_kind_deals: 1,
      sc04_paid_100_pct_upfront_deals: 0,
    });
    const listAll = runTool(db, "list_opportunities", {}, "2025-04-20").result;
    expect(JSON.stringify(listAll).length).toBeLessThan(24000);
    const kpiRes = runTool(db, "get_kpis", {}, "2025-04-20").result as {
      stalled_open_opportunities: { count: number; value_lakh: number; by_channel_group: Record<string, { count: number; value_lakh: number }> };
    };
    expect(kpiRes.stalled_open_opportunities.count).toBe(26);
    expect(kpiRes.stalled_open_opportunities.value_lakh).toBe(14.4);
    expect(kpiRes.stalled_open_opportunities.by_channel_group["warm/inbound"].count).toBe(0);
  });
});

describe("RAG search_strategy_docs & reworded question consistency", () => {
  const rewordedCases: [string, string[], string][] = [
    ["city", ["Why did we choose Mumbai over Delhi NCR?", "Which city wins if D2C sponsors lead?", "Explain the 0.05 city score tiebreak", "What if consumer D2C brands are our main sponsors?", "Why early March for the festival dates?"], "deck-slide1-city-tiebreak"],
    ["targets", ["What are the 2027 base, stretch, and P10-P90 range?", "How much cash are we aiming for in base vs stretch with likely band?"], "deck-slide1-targets"],
    ["downside", ["What happens if no anchor signs?", "What is our modelled downside risk on the anchor?", "What is the sensitivity if no-anchor occurs?"], "deck-slide1-downside-risks"],
    ["say-no", ["What are we saying no to or rejecting in 2027?"], "deck-slide2-five-bets-ranking"],
    ["hybrid", ["Are hybrid deals in-kind with zero guaranteed cash?", "How does Bet 5 hybrid fee structure work?", "Are hybrid deals basically barter or in-kind?"], "definitions-hybrid-vs-inkind"],
    ["verticals", ["What does verticals mean in the 2027 plan vs the 2025 dataset?", "Explain unbundled vertical titles vs brand industries"], "definitions-verticals-vs-industries"],
    ["thresholds", ["Judge all 5 bets against our 120% scale and 70% stop plan thresholds", "Which bets hit Scale vs Stop and what about bets 3 to 5?"], "deck-slide3-bet-thresholds"],
    ["gates", ["What should we do if we miss our Week 6 or Week 9 checkpoints?", "What happens if we miss our checkpoints?", "Playbook when falling more than 15% behind plan"], "deck-slide3-pacing-gates"],
    ["overload", ["Is any team owner overloaded with brands?", "Why does the deck say one owner held 126 of 180 brands?", "How is brand ownership split across the team?"], "baseline-2025-overload-stalled"],
    ["backtest", ["How accurate was our March 15 forecast compared to the 24 actual deals?", "Compare 15 Mar forecast vs actual and MoU advance target", "How fast do sponsors pay after signing?"], "collections-mou-to-advance-forecast"],
  ];

  for (const [label, phrasings, expectedChunk] of rewordedCases) {
    it(`retrieves ${expectedChunk} consistently across rewordings for ${label}`, () => {
      for (const q of phrasings) {
        const res = searchKnowledge(q, 3);
        expect(res.hits.length).toBeGreaterThan(0);
        expect(res.hits.slice(0, 2).map((h) => h.id)).toContain(expectedChunk);
        expect(buildTurnRoutingCue(q)).toBeTruthy();
        expect(isSubstantiveQuery(q)).toBe(true);
      }
    });
  }

  it("does not hijack 2025 historical campaign/KPI queries (F1, F3, D1, D2, E1) toward 2027 bets/plan", () => {
    expect(buildTurnRoutingCue("How many confirmed partnerships do we have, and what is the target?")).toBeUndefined();
    const f3Cue = buildTurnRoutingCue("What is the total confirmed partnership value, and how much of it is in-kind?") ?? "";
    expect(f3Cue).not.toMatch(/get_bet_signals|get_2027_plan/);
    const d1Cue = buildTurnRoutingCue("Why are we behind the confirmed-partnership target?") ?? "";
    expect(d1Cue).not.toMatch(/get_2027_plan/);
    const d2Cue = buildTurnRoutingCue("Which campaigns should we stop and which should we scale?") ?? "";
    expect(d2Cue).toMatch(/diagnose_campaigns/);
    expect(d2Cue).not.toMatch(/get_bet_signals/);
    const stopAlertCue = buildTurnRoutingCue("Should we stop Brand Discovery Email? Show the evidence and where to move the effort.") ?? "";
    expect(stopAlertCue).toMatch(/diagnose_campaigns/);
    expect(stopAlertCue).not.toMatch(/get_bet_signals/);
    const e1Cue = buildTurnRoutingCue("Draft a task for Kabir Shah to pause the Brand Discovery Email campaign and move his hours to warm introductions, due 2025-03-20.") ?? "";
    expect(e1Cue).not.toMatch(/get_funnel\(group_by='owner'\)/);
  });

  it("treats trivial greetings as non-substantive", () => {
    expect(isSubstantiveQuery("hi")).toBe(false);
    expect(isSubstantiveQuery("Thanks!")).toBe(false);
    expect(isSubstantiveQuery("Why Mumbai?")).toBe(true);
  });
});

describe("Q13, Q17, Q18: stalled-deal task alignment guard, unanswerable honesty & draft-only safety", () => {
  it("blocks payment-chasing tasks when user asked for stalled-deal tasks, even on elliptical follow-ups or brand-only calls", () => {
    const msg = "Draft tasks for our stalled deals";
    expect(buildTurnRoutingCue(msg, "Which payments are overdue?")).toMatch(/ONLY target stalled OPEN pipeline opportunities/);
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Chase overdue advance for Mosaic Mobility", opportunity_id: "O004" }, "partner_confirmed")).toMatch(/MISMATCH/);
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Unblock stalled Mosaic Mobility invoice", opportunity_id: "O004" }, "partner_confirmed")).toMatch(/MISMATCH/);
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Follow up on Mosaic Mobility", brand_id: "A004" }, null, { brandHasOpenOpp: false, brandHasConfirmedOpp: true })).toMatch(/MISMATCH/);
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Chase balance invoice on confirmed deals" }, null)).toMatch(/MISMATCH/);
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Unblock Cedar Pantry stalled negotiating deal", opportunity_id: "O028" }, "negotiating")).toBeNull();
  });

  it("allows payment-chasing tasks when user explicitly asks about overdue payments", () => {
    const msg = "Draft tasks to chase overdue payments";
    expect(detectStalledTaskMismatch(msg, "propose_task", { title: "Chase overdue advance for Mosaic Mobility", opportunity_id: "O004" }, "partner_confirmed")).toBeNull();
  });

  it("preserves Q17 (unanswerable fields/data) and Q18 (draft-only opportunity updates never mutate db)", () => {
    const dd = runTool(db, "data_dictionary", {}, "2025-04-20").result as { not_available: string[] };
    expect(dd.not_available.join(" ")).toMatch(/bank receipts|causal impact|Attendee counts/i);
    const beforeLen = db.opp_history.length;
    const upd = runTool(db, "propose_opportunity_update", { opportunity_id: "O028", stage: "lost", rationale: "test" }, "2025-04-20");
    expect(upd.proposal?.kind).toBe("opportunity_update");
    expect(db.opp_history.length).toBe(beforeLen);
  });

  it("includes SOURCE OF TRUTH rules in systemPrompt without leaking raw 2025 counts", () => {
    const p = systemPrompt(db, "2025-04-20", "Call get_2027_plan.");
    expect(p).toContain("TURN ROUTING CUE: Call get_2027_plan.");
    expect(p).toContain("SOURCE OF TRUTH & DEFINITIONS");
  });
});

// ------------------------------------------------------------------ End-to-end route test with mocked Gemini client & store
vi.mock("server-only", () => ({}));
vi.mock("@/lib/store", () => ({
  getStore: () => ({
    kind: "local-file",
    load: async () => structuredClone(db),
  }),
}));

const mockGenerateContent = vi.fn();
vi.mock("@google/genai", async () => {
  const actual = await vi.importActual<typeof import("@google/genai")>("@google/genai");
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent: mockGenerateContent };
    },
  };
});

describe("POST /api/chat route integration (mocked Gemini)", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("forces FunctionCallingConfigMode.ANY on substantive round 0 and returns tool-grounded reply", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [
          { id: "c1", name: "get_2027_plan", args: {} },
          { id: "c2", name: "search_strategy_docs", args: { query: "Why Mumbai over Delhi NCR?" } },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_2027_plan", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Delhi NCR scores 8.95 vs Mumbai 8.90 (0.05 gap within noise), and Mumbai wins via the bank/UPI sponsor-mix tiebreak.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Why Mumbai over Delhi NCR?" }], as_of: "2025-04-20" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].config.toolConfig.functionCallingConfig.mode).toBe("ANY");
    expect(mockGenerateContent.mock.calls[1][0].config.toolConfig).toBeUndefined();
    expect(json.trace.map((t: { tool: string }) => t.tool)).toEqual(["get_2027_plan", "search_strategy_docs"]);
    expect(json.reply).toContain("8.95");
  });

  it("falls back cleanly and nudges for tool calls if toolConfig ANY is unsupported and model tries to answer ungrounded", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockRejectedValueOnce(new Error("400 INVALID_ARGUMENT: tool_config ANY not supported"))
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Base is ₹35.0L and stretch is ₹50.0L.",
      })
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "get_2027_plan", args: {} }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_2027_plan", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Base is ₹54.1L (likely range ₹42.0L to ₹65.8L) and stretch is ₹1.27 Cr.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "What are the base and stretch targets?" }], as_of: "2025-04-20" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.trace.map((t: { tool: string }) => t.tool)).toEqual(["get_2027_plan"]);
    expect(json.reply).toContain("₹54.1L");
    expect(json.reply).not.toContain("₹35.0L");
  });

  it("rejects payment-chasing task drift when user asks for stalled-deal tasks (incl. brand-only & elliptical follow-up) and nudges into stalled-deal task", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [
          { id: "c1", name: "diagnose_campaigns", args: {} },
          {
            id: "c2",
            name: "propose_task",
            args: { title: "Follow up on Mosaic Mobility", brand_id: "A004", owner_id: "T01", rationale: "Pending payment" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Sorry, could not draft.",
      })
      .mockResolvedValueOnce({
        functionCalls: [
          {
            id: "c3",
            name: "propose_task",
            args: { title: "Unblock Cedar Pantry negotiating deal", owner_id: "T01", opportunity_id: "O028", brand_id: "A027", sponsor_campaign_id: "SC03", due_date: "2025-04-25", priority: "high", rationale: "Stalled 33 days in negotiating at ₹1.10L" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "propose_task", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Drafted a task to unblock Cedar Pantry (O028), stalled 33 days in negotiating. Click Confirm to save.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Which deals are stalled?" },
          { role: "assistant", content: "26 cold deals worth ₹14.4L are stalled." },
          { role: "user", content: "Draft tasks for them." },
        ],
        as_of: "2025-04-20",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.proposals).toHaveLength(1);
    expect(json.proposals[0].payload.opportunity_id).toBe("O028");
    expect(json.trace.some((t: { result: { error?: string } }) => t.result?.error?.includes("MISMATCH"))).toBe(true);
  });

  it("keeps grounding nudge and stalled-task rescue nudge independent (separate nudgedGrounding / nudgedTaskDraft)", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      // Round 0: toolConfig ANY fails 400 -> fallback returns ungrounded text -> triggers nudgedGrounding
      .mockRejectedValueOnce(new Error("400 INVALID_ARGUMENT: tool_config ANY not supported"))
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "You should check stalled deals manually.",
      })
      // Round 1: calls diagnose_campaigns + payment-chasing propose_task (rejected -> rejectedStalledTask=true)
      .mockResolvedValueOnce({
        functionCalls: [
          { id: "c1", name: "diagnose_campaigns", args: {} },
          {
            id: "c2",
            name: "propose_task",
            args: { title: "Chase overdue advance for Mosaic Mobility", opportunity_id: "O004", brand_id: "A004", owner_id: "T01", rationale: "Overdue payment" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      // Round 2: gives up with text-only response -> MUST still trigger nudgedTaskDraft
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Unable to create task.",
      })
      // Round 3: proposes stalled open deal O028
      .mockResolvedValueOnce({
        functionCalls: [
          {
            id: "c3",
            name: "propose_task",
            args: { title: "Unblock Cedar Pantry negotiating deal", owner_id: "T01", opportunity_id: "O028", brand_id: "A027", sponsor_campaign_id: "SC03", due_date: "2025-04-25", priority: "high", rationale: "Stalled 33 days in negotiating" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "propose_task", args: {} } }] } }],
      })
      // Round 4: final summary
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Drafted task for Cedar Pantry (O028). Click Confirm to save.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Draft tasks for our stalled deals" }], as_of: "2025-04-20" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(6);
    expect(json.proposals).toHaveLength(1);
    expect(json.proposals[0].payload.opportunity_id).toBe("O028");
    expect(json.trace.some((t: { result: { error?: string } }) => t.result?.error?.includes("MISMATCH"))).toBe(true);
  });

  it("triggers one-time propose_task rescue nudge when explicit E1 task request runs read tools then outputs text-only tasks", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "diagnose_campaigns", args: {} }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Task 1: Kabir Shah should pause Brand Discovery Email and move hours to warm intros by 2025-03-20.",
      })
      .mockResolvedValueOnce({
        functionCalls: [
          {
            id: "c2",
            name: "propose_task",
            args: { title: "Pause Brand Discovery Email and shift hours to warm intros", owner_id: "T02", sponsor_campaign_id: "SC01", due_date: "2025-03-20", priority: "high", rationale: "SC01 has 0/91 closes (STOP verdict)" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "propose_task", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Drafted the task for Kabir Shah (T02). Click Confirm to save.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Draft a task for Kabir Shah to pause the Brand Discovery Email campaign and move his hours to warm introductions, due 2025-03-20." }],
        as_of: "2025-03-15",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    expect(json.proposals).toHaveLength(1);
    expect(json.proposals[0].payload.owner_id).toBe("T02");
    expect(json.proposals[0].payload.sponsor_campaign_id).toBe("SC01");
    const rescueContents = mockGenerateContent.mock.calls[2][0].contents as { role: string; parts: { text?: string }[] }[];
    const rescueText = rescueContents.flatMap((c) => c.parts ?? []).map((p) => p.text ?? "").join("\n");
    expect(rescueText).toMatch(/ACTION REQUIRED:.*propose_task/);
  });

  it("only triggers the propose_task rescue nudge once if the model still refuses to call propose_task", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "diagnose_campaigns", args: {} }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Task 1: Pause Brand Discovery Email.",
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Still returning text only.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Draft a task for Kabir Shah to pause Brand Discovery Email." }],
        as_of: "2025-03-15",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(json.proposals).toHaveLength(0);
    expect(json.reply).toBe("Still returning text only.");
  });

  it("rescues non-pronoun short stalled follow-up ('Draft tasks to unblock the top 3') when model answers text-only first", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "diagnose_campaigns", args: {} }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "1. Follow up with Cedar Pantry. 2. Follow up with top stalled deals.",
      })
      .mockResolvedValueOnce({
        functionCalls: [
          {
            id: "c2",
            name: "propose_task",
            args: { title: "Unblock Cedar Pantry negotiating deal", owner_id: "T01", opportunity_id: "O028", brand_id: "A027", sponsor_campaign_id: "SC03", due_date: "2025-04-25", priority: "high", rationale: "Top stalled open deal" },
          },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "propose_task", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Drafted task for Cedar Pantry (O028).",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Which deals are stalled?" },
          { role: "assistant", content: "26 cold deals worth ₹14.4L are stalled." },
          { role: "user", content: "Draft tasks to unblock the top 3" },
        ],
        as_of: "2025-04-20",
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.proposals).toHaveLength(1);
    expect(json.proposals[0].payload.opportunity_id).toBe("O028");
    const rescueContents = mockGenerateContent.mock.calls[2][0].contents as { role: string; parts: { text?: string }[] }[];
    const rescueText = rescueContents.flatMap((c) => c.parts ?? []).map((p) => p.text ?? "").join("\n");
    expect(rescueText).toMatch(/ACTION REQUIRED:.*stalled OPEN pipeline/i);
  });

  it("does not trigger task-draft rescue nudge on overdue-task status queries", async () => {
    const { POST } = await import("../app/api/chat/route");
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "get_tasks", args: { overdue_only: true } }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_tasks", args: { overdue_only: true } } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Two tasks are overdue (TK0001 and TK0002). No explicit blocker reason field is recorded beyond status.",
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Which tasks are overdue and what is blocking them?" }], as_of: "2025-04-20" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(json.trace.map((t: { tool: string }) => t.tool)).toEqual(["get_tasks"]);
    expect(json.proposals).toHaveLength(0);
  });
});

describe("Audit fixes: dynamic ownerWorkloadSummary, early funnelRows(owner), and routing/RAG edge cases", () => {
  it("includes brand-only owners at early as_of dates (2025-01-15) and dynamically computes opps & deal owners", () => {
    const sEarly = snapshot(db, "2025-01-15");
    const fEarly = funnelRows(sEarly, "owner");
    expect(fEarly.map((r) => r.key).sort()).toEqual(["T01", "T02", "T05"]);
    const oEarly = ownerRows(sEarly);
    expect(oEarly.find((r) => r.key === "T01")?.brands_owned).toBe(3);
    expect(oEarly.find((r) => r.key === "T02")?.brands_owned).toBe(2);
    expect(oEarly.find((r) => r.key === "T05")?.brands_owned).toBe(2);

    const kEarly = runTool(db, "get_kpis", {}, "2025-01-15").result as {
      owner_workload_summary: { total_brands_owned: number; total_opportunities: number; deal_owners: number; overload_note: string };
    };
    expect(kEarly.owner_workload_summary.total_brands_owned).toBe(7);
    expect(kEarly.owner_workload_summary.total_opportunities).toBe(0);
    expect(kEarly.owner_workload_summary.deal_owners).toBe(0);
    expect(kEarly.owner_workload_summary.overload_note).toMatch(/Riya Kapoor \(T01\) holds 3 of 7 brands/);
    expect(kEarly.owner_workload_summary.overload_note).toMatch(/0 opportunities/);
    expect(kEarly.owner_workload_summary.overload_note).not.toMatch(/58 opportunities|3 deal owners/);

    const fFeb = runTool(db, "get_funnel", { group_by: "owner" }, "2025-02-01").result as {
      owner_workload_summary: { total_brands_owned: number; total_opportunities: number; deal_owners: number; overload_note: string };
    };
    expect(fFeb.owner_workload_summary.total_brands_owned).toBe(52);
    expect(fFeb.owner_workload_summary.total_opportunities).toBe(7);
    expect(fFeb.owner_workload_summary.deal_owners).toBe(2);
    expect(fFeb.owner_workload_summary.overload_note).toMatch(/Kabir Shah \(T02\) holds 34 of 52 brands/);
    expect(fFeb.owner_workload_summary.overload_note).toMatch(/7 opportunities sit across 2 deal owners/);
    expect(fFeb.owner_workload_summary.overload_note).not.toMatch(/58 opportunities|3 deal owners/);
  });

  it("updates ownerWorkloadSummary and funnelRows dynamically on live brand/opportunity edits", () => {
    const modDb: DB = structuredClone(db);
    modDb.brands.push({
      brand_id: "A999",
      brand_name: "Test Brand Co",
      industry: "Education",
      owner_id: "T04",
      owner_name: "Aarav Sen",
      created_at: "2025-01-15T09:00:00+05:30",
    });
    modDb.opportunities.push({
      opportunity_id: "O999",
      opportunity_name: "Test Brand Co x CF",
      brand_id: "A999",
      brand_name: "Test Brand Co",
      primary_contact_id: "C001",
      primary_contact_name: "Test",
      originating_campaign_name: "Brand Discovery Email",
      sponsor_campaign_id: "SC01",
      support_type: "cash",
      created_at: "2025-04-10T09:00:00+05:30",
    });
    modDb.opp_history.push({
      history_id: "OH9999",
      opportunity_id: "O999",
      opportunity_name: "Test Brand Co x CF",
      brand_id: "A999",
      brand_name: "Test Brand Co",
      stage: "proposal_sent",
      proposed_value_inr: 150_000,
      confirmed_value_inr: 0,
      owner_id: "T02",
      owner_name: "Kabir Shah",
      effective_at: "2025-04-10T10:00:00+05:30",
    });
    const res = runTool(modDb, "get_funnel", { group_by: "owner" }, "2025-04-20").result as {
      rows: { key: string; brands_owned?: number }[];
      owner_workload_summary: { total_brands_owned: number; total_opportunities: number; deal_owners: number; overload_note: string };
    };
    expect(res.rows.some((r) => r.key === "T04" && r.brands_owned === 1)).toBe(true);
    expect(res.owner_workload_summary.total_brands_owned).toBe(181);
    expect(res.owner_workload_summary.total_opportunities).toBe(59);
    expect(res.owner_workload_summary.deal_owners).toBe(4);
    expect(res.owner_workload_summary.overload_note).toMatch(/59 opportunities sit across 4 deal owners/);
  });

  it("routes overdue-task queries to get_tasks without falsely firing mentionsPayments", () => {
    for (const q of [
      "Which tasks are overdue and what is blocking them?",
      "Are any team tasks overdue or blocked?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_tasks/);
      expect(cue).not.toMatch(/get_cash_collection/);
    }
    for (const q of [
      "Which sponsor payments are overdue and who should chase them?",
      "Which payments are overdue?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_cash_collection/);
      expect(cue).not.toMatch(/get_tasks/);
    }
  });

  it("matches Q1/Q2 store paid-in-full, payment splits, and installments rewordings", () => {
    for (const q of [
      "Did any store brands pay in full or use payment splits?",
      "Were Partner Interest Form deals paid in full or in installments?",
      "Do SC04 brands settle in full or have payment splits?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_cash_collection/);
      expect(cue).toMatch(/payment_terms_summary/);
      expect(cue).toMatch(/list_opportunities\(campaign='SC04'\)/);
      expect(cue).toMatch(/get_funnel\(group_by='campaign'\)/);
      const rag = searchKnowledge(q, 2);
      expect(rag.hits.map((h) => h.id)).toContain("baseline-2025-overload-stalled");
    }
  });

  it("matches Q5 performance deals/packages without literal 'hybrid' in routing and RAG", () => {
    for (const q of [
      "Are performance deals treated as barter with zero cash?",
      "How are performance packages structured in the plan?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_bet_signals/);
      expect(cue).toMatch(/get_2027_plan/);
      expect(cue).toMatch(/search_strategy_docs/);
      const rag = searchKnowledge(q, 2);
      expect(rag.hits.map((h) => h.id)).toContain("definitions-hybrid-vs-inkind");
    }
    const f3 = buildTurnRoutingCue("What is the total confirmed partnership value, and how much of it is in-kind?") ?? "";
    expect(f3).not.toMatch(/get_bet_signals|get_2027_plan/);
  });

  it("matches Q8 owner-overload rewordings like 'Who is carrying too many brands in the team?'", () => {
    for (const q of [
      "Who is carrying too many brands in the team?",
      "Is anyone carrying too many brands across the team?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_funnel\(group_by='owner'\)/);
      expect(cue).toMatch(/get_kpis/);
      const rag = searchKnowledge(q, 2);
      expect(rag.hits.map((h) => h.id)).toContain("baseline-2025-overload-stalled");
    }
  });

  it("matches Q14 contingency, Q10 projections, Q11/12 signing/unpaid, and Q13 cold-deal / non-pronoun short task follow-ups", () => {
    for (const q of [
      "What is our fallback playbook if sponsorship revenue falls 15% behind?",
      "How do our milestones work if revenue falls behind plan?",
    ]) {
      const cue = buildTurnRoutingCue(q) ?? "";
      expect(cue).toMatch(/get_2027_plan/);
      const rag = searchKnowledge(q, 2);
      expect(rag.hits.map((h) => h.id)).toContain("deck-slide3-pacing-gates");
    }
    // D1 alert with "this week" and "behind" must still NOT hijack to get_2027_plan
    expect(buildTurnRoutingCue("Why are we behind the confirmed-partnership target, and what should we do this week?")).toBeUndefined();

    for (const q of [
      "How accurate were our March 15 projections vs actuals?",
      "What was forecasted on March 15 and how is our forecasting reliability?",
    ]) {
      expect(buildTurnRoutingCue(q) ?? "").toMatch(/forecast/);
    }

    for (const q of [
      "How many days from signing did advances take to pay?",
      "Which sponsors haven't paid or are unpaid?",
      "What are the average days to pay from signing?",
    ]) {
      expect(buildTurnRoutingCue(q) ?? "").toMatch(/get_cash_collection/);
      expect(searchKnowledge(q, 2).hits.map((h) => h.id)).toContain("collections-mou-to-advance-forecast");
    }

    expect(isStalledTaskRequest("Draft tasks to unstick the 26 cold deals")).toBe(true);
    expect(buildTurnRoutingCue("Draft tasks to unstick the 26 cold deals") ?? "").toMatch(/ONLY target stalled OPEN pipeline opportunities/);

    const followScope = resolveTurnScope("Draft tasks to unblock the top 3", "Which deals are stalled?");
    expect(followScope).toContain("Which deals are stalled?");
    expect(isStalledTaskRequest(followScope)).toBe(true);
    expect(buildTurnRoutingCue("Draft tasks to unblock the top 3", "Which deals are stalled?") ?? "").toMatch(/ONLY target stalled OPEN pipeline opportunities/);

    expect(isTaskDraftRequest("Draft tasks to unblock the top 3")).toBe(true);
    expect(isTaskDraftRequest("Draft a task for Kabir Shah to pause email, due 2025-03-20.")).toBe(true);
    expect(isTaskDraftRequest("Which tasks are overdue and what is blocking them?")).toBe(false);
    expect(isTaskDraftRequest("Don't create tasks without confirmation")).toBe(false);
  });

  it("prevents false task-drafting & stalled-task detection on informational/how-to/stuck-task queries", () => {
    for (const q of [
      "How do I create tasks in the Growth Center?",
      "Did anyone create tasks for Riya?",
      "Can I make tasks manually?",
      "Which tasks did we create?",
      "Which tasks are late or stuck?",
      "How many tasks exist for stalled deals?",
      "Did anyone draft tasks for stalled deals yet?",
      "How are tasks distributed across owners?",
    ]) {
      expect(isTaskDraftRequest(q)).toBe(false);
      expect(isStalledTaskRequest(q)).toBe(false);
    }

    const stuckTasksCue = buildTurnRoutingCue("Which tasks are late or stuck?") ?? "";
    expect(stuckTasksCue).toMatch(/get_tasks/);
    expect(stuckTasksCue).not.toMatch(/propose_task|diagnose_campaigns/);

    const distTasksCue = buildTurnRoutingCue("How are tasks distributed across owners?") ?? "";
    expect(distTasksCue).toMatch(/get_tasks/);
    expect(distTasksCue).not.toMatch(/get_funnel\(group_by='owner'\)/);
  });

  it("supports 3-turn elliptical scope chains while isolating topic switches and standalone unblock prompts", () => {
    const chain3 = resolveTurnScope("Draft tasks to unblock the top 3", ["Which deals are stalled?", "Which ones are in negotiating?"]);
    expect(chain3).toContain("Which deals are stalled?");
    expect(chain3).toContain("Which ones are in negotiating?");
    expect(isStalledTaskRequest(chain3)).toBe(true);

    const topicSwitch = resolveTurnScope("Draft tasks to unblock the top 3", ["Which deals are stalled?", "Which payments are overdue?"]);
    expect(topicSwitch).not.toContain("Which deals are stalled?");
    expect(topicSwitch).toContain("Which payments are overdue?");
    expect(isStalledTaskRequest(topicSwitch)).toBe(false);

    expect(resolveTurnScope("Draft a task for Riya to unblock Acme", ["Which payments are overdue?"])).toBe("Draft a task for Riya to unblock Acme");
    expect(resolveTurnScope("Draft tasks to unblock Beardo", ["Which deals are stalled?"])).toBe("Draft tasks to unblock Beardo");
  });

  it("covers additional Q1/Q2, Q4, Q5, Q6, Q8, Q10, Q15 rewordings and avoids 15-Mar forecast hijacks", () => {
    const schedCue = buildTurnRoutingCue("What payment schedule did our inbound store partners get?") ?? "";
    expect(schedCue).toMatch(/list_opportunities\(campaign='SC04'\)/);
    expect(schedCue).toMatch(/get_cash_collection/);
    expect(searchKnowledge("What payment schedule did our inbound store partners get?", 2).hits[0].id).toBe("baseline-2025-overload-stalled");

    for (const q of ["Who holds the most brands?", "Which seller is holding most of our brands?"]) {
      expect(buildTurnRoutingCue(q) ?? "").toMatch(/get_funnel\(group_by='owner'\)/);
      expect(searchKnowledge(q, 2).hits[0].id).toBe("baseline-2025-overload-stalled");
    }

    expect(searchKnowledge("Are verticals, anchor, and hybrid skipped or judged by close rate?", 2).hits.map((h) => h.id)).toContain("deck-slide3-bet-thresholds");
    expect(searchKnowledge("What happens to 2027 cash if we fail to land an anchor sponsor?", 2).hits.map((h) => h.id)).toContain("deck-slide1-downside-risks");
    expect(buildTurnRoutingCue("What happens to 2027 cash if we fail to land an anchor sponsor?") ?? "").toMatch(/get_2027_plan/);
    expect(buildTurnRoutingCue("What is the likely cash band for next year's fest?") ?? "").toMatch(/get_2027_plan/);
    expect(searchKnowledge("What is the likely cash band for next year's fest?", 2).hits.map((h) => h.id)).toContain("deck-slide1-targets");
    expect(buildTurnRoutingCue("Are performance-based sponsorships treated as in-kind?") ?? "").toMatch(/get_bet_signals/);
    expect(searchKnowledge("Are performance-based sponsorships treated as in-kind?", 2).hits[0].id).toBe("definitions-hybrid-vs-inkind");
    expect(buildTurnRoutingCue("How close was the pipeline model in mid-March compared to actuals?") ?? "").toMatch(/forecast/);
    expect(searchKnowledge("How close was the pipeline model in mid-March compared to actuals?", 2).hits[0].id).toBe("collections-mou-to-advance-forecast");

    // 15 March date comparison/KPI turns must NOT trigger forecast routing cues
    expect(buildTurnRoutingCue("Compare 1 Mar vs 15 Mar: what changed?")).toBeUndefined();
    expect(buildTurnRoutingCue("How many brands were qualified as of 15 March 2025?")).toBeUndefined();
    expect(buildTurnRoutingCue("How many partnerships were confirmed between 1 March and 15 March 2025?")).toBeUndefined();

    // C3 / C4 campaign & channel rate queries steer to get_funnel instead of raw row counts
    expect(buildTurnRoutingCue("What share of brands touched by Brand Leader LinkedIn replied?") ?? "").toMatch(/get_funnel/);
    expect(buildTurnRoutingCue("Brand-to-confirmed conversion: warm/inbound channels versus cold outbound?") ?? "").toMatch(/get_funnel/);
  });

  it("handles zero-brands snapshot in ownerWorkloadSummary cleanly", () => {
    const emptyRes = runTool(db, "get_kpis", {}, "2025-01-01").result as {
      owner_workload_summary: { total_brands_owned: number; total_opportunities: number; deal_owners: number; overload_note: string };
    };
    expect(emptyRes.owner_workload_summary).toEqual({
      total_brands_owned: 0,
      total_opportunities: 0,
      deal_owners: 0,
      brand_ownership_by_owner: [],
      overload_note: "",
    });
  });

  it("route handles 3-turn stalled follow-up, skips rescue nudge on informational task queries, and validates as_of", async () => {
    const { POST } = await import("../app/api/chat/route");

    // 1. Informational task question ("Did anyone create tasks for Riya?") must NOT trigger propose_task rescue nudge
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c1", name: "get_tasks", args: { owner: "Riya" } }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_tasks", args: { owner: "Riya" } } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Yes, Riya Kapoor has tasks on file.",
      });
    const infoRes = await (await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Did anyone create tasks for Riya?" }], as_of: "2025-02-30" }),
    }))).json();
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(infoRes.proposals).toHaveLength(0);
    // Invalid calendar date 2025-02-30 safely falls back to defaultAsOf (2025-04-20)
    expect(infoRes.as_of).toBe("2025-04-20");

    // 2. 3-turn stalled chain retains MISMATCH guard across intermediate elliptical refinement turn
    mockGenerateContent.mockReset();
    mockGenerateContent
      .mockResolvedValueOnce({
        functionCalls: [
          { id: "c1", name: "diagnose_campaigns", args: {} },
          { id: "c2", name: "propose_task", args: { title: "Chase Mosaic Mobility advance", opportunity_id: "O004", brand_id: "A004", owner_id: "T01", rationale: "Overdue" } },
        ],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "diagnose_campaigns", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [{ id: "c3", name: "propose_task", args: { title: "Unblock Cedar Pantry negotiating deal", opportunity_id: "O028", brand_id: "A027", owner_id: "T01", sponsor_campaign_id: "SC03", rationale: "Stalled negotiating" } }],
        candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "propose_task", args: {} } }] } }],
      })
      .mockResolvedValueOnce({
        functionCalls: [],
        text: "Drafted task for Cedar Pantry (O028).",
      });
    const chainRes = await (await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Which deals are stalled?" },
          { role: "assistant", content: "26 cold deals worth ₹14.4L are stalled." },
          { role: "user", content: "Which ones are in negotiating?" },
          { role: "assistant", content: "8 negotiating deals including Cedar Pantry." },
          { role: "user", content: "Draft tasks to unblock the top 3" },
        ],
        as_of: "2025-04-20",
      }),
    }))).json();
    expect(chainRes.trace.some((t: { result: { error?: string } }) => t.result?.error?.includes("MISMATCH"))).toBe(true);
    expect(chainRes.proposals).toHaveLength(1);
    expect(chainRes.proposals[0].payload.opportunity_id).toBe("O028");
  });
});

