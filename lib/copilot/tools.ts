/**
 * Copilot tools. Every number the assistant states must come from one of these (or the calculate tool).
 * All read tools take an optional as_of (YYYY-MM-DD, end of day IST) and operate on LIVE store data,
 * so edits made in the app are reflected immediately.
 */
import type { DB } from "../types";
import { OPEN_STAGES } from "../types";
import {
  snapshot, kpis, funnelRows, scaleChangeStop, bottlenecks, forecast, cashCollection, weeklySeries,
  opportunityList, findBrands, forecastBacktest, parseAsOf, paymentAsOf, eodIST, brandDetail, taskView, dataDictionary, stalled, dedupe, ts, ownerRows, mouStartByOpp, calendarDaysIST, WARM_CHANNELS, Snapshot,
} from "../metrics";
import { evaluate } from "./calc";
import { plan2027 } from "../plan";
import { betSignals } from "../bets";
import { searchKnowledge } from "./knowledge";

type Json = Record<string, unknown>;
const AS_OF = { type: "string", description: "Snapshot date YYYY-MM-DD (end of day, Asia/Kolkata). Omit to use the dashboard's current as-of date." };

export const TOOL_DECLARATIONS = [
  { name: "get_kpis", description: "Headline 2025 KPIs at a date: targets & attainment, qualified brands, confirmed partnerships, confirmed value (cash-type vs in-kind), open pipeline, stage counts, outreach volumes, brand ownership distribution (180 brands by owner), linear pacing, forecast, simulated cash, duplicate rows removed.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF } } },
  { name: "get_funnel", description: "Brand-level funnel grouped by campaign, owner (includes brands_owned across 180 brands and opportunity ownership across deal owners), industry (2025 brand sectors — distinct from 2027 fest vertical titles) or channel_group (warm/inbound vs cold outbound).", parametersJsonSchema: { type: "object", properties: { group_by: { type: "string", enum: ["campaign", "owner", "industry", "channel_group"] }, as_of: AS_OF }, required: ["group_by"] } },
  { name: "diagnose_campaigns", description: "2025 bottleneck diagnosis: SCALE/CHANGE/STOP/TOO_EARLY verdicts for historical campaigns SC01-SC06 (close-rate rules), weakest funnel step, owner workload summary, and stalled OPEN opportunities (>14 days idle, with warm vs cold split and brand/owner/opp IDs). Note: for 2027 bets and 120%/70% thresholds, use get_bet_signals.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF } } },
  { name: "list_opportunities", description: "List opportunities with their LATEST stage at the as-of date, including channel_group (warm/inbound vs cold outbound) and by_stage/by_channel_group summaries. Filters are optional.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF, stage: { type: "string", enum: ["prospecting", "contacted", "proposal_sent", "negotiating", "partner_confirmed", "lost", "withdrawn"] }, campaign: { type: "string", description: "campaign name substring or SC id" }, owner: { type: "string", description: "owner name substring or T id" }, support_type: { type: "string", enum: ["cash", "in_kind"] }, brand: { type: "string" }, open_only: { type: "boolean" }, min_value: { type: "number" }, limit: { type: "number" } } } },
  { name: "get_brand", description: "Everything about one brand at the as-of date: contacts (with opt-out flags), qualification history, interaction timeline, opportunities with stage history, simulated payments, activations, tasks. Accepts brand name or id (A001...).", parametersJsonSchema: { type: "object", properties: { name_or_id: { type: "string" }, as_of: AS_OF }, required: ["name_or_id"] } },
  { name: "forecast", description: "Projected confirmed partnerships/value at the as-of date from open pipeline plus historical reliability_backtest (including 15 Mar forecast 26.9 vs actual 24). Optional what-if: close or drop specific opportunity ids.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF, close_opportunity_ids: { type: "array", items: { type: "string" } }, drop_opportunity_ids: { type: "array", items: { type: "string" } } } } },
  { name: "get_cash_collection", description: "SIMULATED invoices/receipts (no bank data exists): invoiced, received net of 2% TDS, outstanding, overdue list, cash by T-14, AND mou_to_advance tracking calendar days from MoU (partner_confirmed date) to advance paid against the 15-day target.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF } } },
  { name: "compare_dates", description: "Compare KPIs between two dates to explain what changed (deltas in qualified, confirmed, value, pipeline, outreach).", parametersJsonSchema: { type: "object", properties: { date_a: { type: "string" }, date_b: { type: "string" } }, required: ["date_a", "date_b"] } },
  { name: "get_trend", description: "Weekly cumulative series from history start to as-of: qualified, confirmed, confirmed value, simulated cash, goals.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF } } },
  { name: "get_targets", description: "All target plan versions (launch and revised) with effective dates.", parametersJsonSchema: { type: "object", properties: {} } },
  { name: "get_tasks", description: "Team tasks with owner, due date, status, priority, linked entity; overdue is relative to the as-of date.", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF, status: { type: "string", enum: ["todo", "in_progress", "blocked", "done"] }, owner: { type: "string" }, overdue_only: { type: "boolean" } } } },
  { name: "query_records", description: "Flexible read-only query for questions the other tools don't cover. Prefer group_by + aggregate when summarizing >50 rows (default limit is 50). Tables (snapshot at as_of): brands, contacts, interactions, opportunities, opportunity_versions, qualification_versions, payments (simulated, includes mou_at & days_mou_to_paid), tasks, campaigns, activations.", parametersJsonSchema: { type: "object", properties: { table: { type: "string", enum: ["brands", "contacts", "interactions", "opportunities", "opportunity_versions", "qualification_versions", "payments", "tasks", "campaigns", "activations"] }, as_of: AS_OF, filters: { type: "array", items: { type: "object", properties: { field: { type: "string" }, op: { type: "string", enum: ["eq", "neq", "in", "contains", "gt", "gte", "lt", "lte", "is_null", "not_null"] }, value: { type: "string", description: "Comparison value as text: number (25000), date YYYY-MM-DD, true/false, or comma-separated list for 'in'." } }, required: ["field", "op"] } }, group_by: { type: "array", items: { type: "string" } }, aggregate: { type: "string", enum: ["count", "count_distinct", "sum", "avg", "min", "max"] }, field: { type: "string", description: "field for the aggregate (count_distinct/sum/avg/min/max)" }, sort_by: { type: "string" }, sort_desc: { type: "boolean" }, limit: { type: "number" } }, required: ["table"] } },
  { name: "calculate", description: "Exact arithmetic. Use for every derived number (ratios, differences, percentages, what-ifs). Supports + - * / ^ ( ) and min(), max(), round(x, digits), abs().", parametersJsonSchema: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] } },
  { name: "data_dictionary", description: "What data exists, field meanings, key definitions (incl. 2025 industries vs 2027 vertical titles, in_kind vs hybrid, MoU->advance 15d target, brand vs deal ownership), which tables are SIMULATED, and what the data cannot answer.", parametersJsonSchema: { type: "object", properties: {} } },
  { name: "get_bet_signals", description: "Live SCALE/CHANGE/STOP/TOO_EARLY/NOT_MEASURABLE signal AND 2027 plan thresholds (120% scale / 70% stop) for ALL 5 bets (warm, store, verticals, anchor, hybrid).", parametersJsonSchema: { type: "object", properties: { as_of: AS_OF } } },
  { name: "get_2027_plan", description: "Forward-looking CampusFest 2027 (Mumbai) sponsorship plan & deck model: base cash ₹54.1L, Monte Carlo range P10-P90 ₹42.0L-₹65.8L, stretch ₹1.27 Cr, status-quo ₹14.1L, city selection & Mumbai vs Delhi NCR sponsor-mix tiebreak, segment model (incl. hybrid 50% guaranteed + capped CPA & vertical titles), downside sensitivities (no anchor ₹41.0L), 5 ranked bets, 120%/70% thresholds, and global gates (stop cold, reprice anchor, 100% advance). MODEL PROJECTIONS, not actuals.", parametersJsonSchema: { type: "object", properties: {} } },
  { name: "search_strategy_docs", description: "Retrieve authoritative CampusFest 2027 strategy deck slides, city selection & sponsor-mix tiebreak (Mumbai vs Delhi NCR), definitions disambiguation (hybrid vs in-kind, vertical titles vs dataset industries, MoU-to-advance 15d), forecast backtest, and fact_base research benchmarks.", parametersJsonSchema: { type: "object", properties: { query: { type: "string", description: "Search query about strategy, city choice, definitions, deck numbers, gates, or benchmarks." }, top_k: { type: "number" } }, required: ["query"] } },
  { name: "propose_task", description: "Draft a task for the team. Does NOT save anything: the user must click Confirm in the chat. Use real owner ids from the system prompt and link brand_id, opportunity_id, and/or sponsor_campaign_id. IMPORTANT: When drafting tasks for stalled deals, target ONLY stalled open pipeline opportunities (from diagnose_campaigns.stalled_list) — NEVER draft payment/invoice-chasing tasks on confirmed deals.", parametersJsonSchema: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, owner_id: { type: "string" }, due_date: { type: "string", description: "YYYY-MM-DD" }, priority: { type: "string", enum: ["low", "medium", "high"] }, brand_id: { type: "string" }, opportunity_id: { type: "string" }, sponsor_campaign_id: { type: "string" }, rationale: { type: "string", description: "data evidence behind this task" } }, required: ["title", "rationale"] } },
  { name: "propose_opportunity_update", description: "Draft a stage/value change for an opportunity (appends a new version). Does NOT save: the user must click Confirm.", parametersJsonSchema: { type: "object", properties: { opportunity_id: { type: "string" }, stage: { type: "string", enum: ["prospecting", "contacted", "proposal_sent", "negotiating", "partner_confirmed", "lost", "withdrawn"] }, effective_date: { type: "string" }, proposed_value_inr: { type: "number" }, confirmed_value_inr: { type: "number" }, rationale: { type: "string" } }, required: ["opportunity_id", "stage", "rationale"] } },
];

export interface Proposal { kind: "task" | "opportunity_update"; payload: Json; rationale: string; warnings: string[] }

// ------------------------------------------------------------------ query engine
function tableRows(s: Snapshot, table: string): Json[] {
  const db = s.db;
  const brand = new Map(db.brands.map((b) => [b.brand_id, b]));
  switch (table) {
    case "brands":
      return db.brands.filter((b) => s.brandsVisible.has(b.brand_id)).map((b) => ({ ...b, qualification_status: s.qualLatest.get(b.brand_id)?.qualification_status ?? null, qualification_source_campaign: s.qualLatest.get(b.brand_id)?.source_campaign_name ?? null }));
    case "contacts": {
      const opted = new Set(s.interactions.filter((r) => r.event_type === "opt_out").map((r) => r.contact_id));
      return db.contacts.filter((c) => ts(c.created_at) <= s.cutoff).map((c) => ({ ...c, opted_out: opted.has(c.contact_id), industry: brand.get(c.brand_id)?.industry }));
    }
    case "interactions": return s.interactions.map((r) => ({ ...r, industry: brand.get(r.brand_id)?.industry }));
    case "opportunities": return opportunityList(s).map((o) => ({ ...o, industry: brand.get(o.brand_id)?.industry }));
    case "opportunity_versions": return s.oppHistory.map((h) => ({ ...h }));
    case "qualification_versions": return dedupe(db.qualification, "history_id").rows.filter((q) => ts(q.effective_at) <= s.cutoff).map((q) => ({ ...q }));
    case "payments": {
      const mouMap = mouStartByOpp(s);
      return db.payments.filter((p) => ts(p.invoiced_at) <= s.cutoff).map((p) => {
        const ps = paymentAsOf(p, s.cutoff);
        const mouAt = mouMap.get(p.opportunity_id) ?? null;
        const daysMouToPaid = mouAt && ps.received_as_of && ps.received_at ? calendarDaysIST(ts(mouAt), ts(ps.received_at)) : null;
        const daysSinceMou = mouAt ? calendarDaysIST(ts(mouAt), s.cutoff) : null;
        const daysInvoicedToPaid = ps.received_as_of && ps.received_at ? calendarDaysIST(ts(p.invoiced_at), ts(ps.received_at)) : null;
        const exceeded15 = p.installment === "advance" && ps.status_as_of !== "void"
          ? (daysMouToPaid !== null ? daysMouToPaid > 15 : (daysSinceMou !== null && daysSinceMou > 15))
          : null;
        return {
          ...ps,
          brand_name: brand.get(p.brand_id)?.brand_name,
          mou_at: mouAt,
          days_mou_to_paid: daysMouToPaid,
          days_since_mou: daysSinceMou,
          days_invoiced_to_paid: daysInvoicedToPaid,
          exceeded_15_days_from_mou: exceeded15,
        };
      });
    }
    case "tasks": return taskView(s) as unknown as Json[];
    case "campaigns": { const plan = new Map(db.campaign_plan.map((p) => [p.sponsor_campaign_id, p])); return db.campaigns.map((c) => ({ ...c, simulated_budget_inr: plan.get(c.sponsor_campaign_id)?.budget_inr, simulated_planned_hours: plan.get(c.sponsor_campaign_id)?.planned_hours })); }
    case "activations": return db.activations.filter((a) => ts(a.linked_at) <= s.cutoff).map((a) => ({ ...a }));
    default: throw new Error(`Unknown table ${table}`);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}T/;
function matches(row: Json, f: { field: string; op: string; value?: unknown }) {
  const v = row[f.field];
  const lc = (x: unknown) => String(x ?? "").toLowerCase().trim();
  const val = f.value;
  // Dates: a bare YYYY-MM-DD compared with a timestamp field covers the whole IST day.
  if (typeof val === "string" && DATE_RE.test(val) && typeof v === "string" && (TS_RE.test(v) || DATE_RE.test(v))) {
    const t = ts(v), start = Date.parse(`${val}T00:00:00+05:30`), end = eodIST(val);
    switch (f.op) {
      case "eq": return t >= start && t <= end;
      case "neq": return !(t >= start && t <= end);
      case "gt": return t > end;
      case "gte": return t >= start;
      case "lt": return t < start;
      case "lte": return t <= end;
    }
  }
  const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" && isFinite(Number(x)) ? Number(x) : NaN);
  const a = num(v), b = num(val);
  const numeric = isFinite(a) && isFinite(b);
  switch (f.op) {
    case "eq": return numeric ? a === b : lc(v) === lc(val);
    case "neq": return numeric ? a !== b : lc(v) !== lc(val);
    case "in": { const list = Array.isArray(val) ? val : String(val ?? "").split(","); return list.map(lc).includes(lc(v)); }
    case "contains": return lc(v).includes(lc(val));
    case "gt": return numeric ? a > b : String(v) > String(val);
    case "gte": return numeric ? a >= b : String(v) >= String(val);
    case "lt": return numeric ? a < b : String(v) < String(val);
    case "lte": return numeric ? a <= b : String(v) <= String(val);
    case "is_null": return v === null || v === undefined || v === "";
    case "not_null": return !(v === null || v === undefined || v === "");
    default: return true;
  }
}

export function queryRecords(s: Snapshot, a: { table: string; filters?: { field: string; op: string; value?: unknown }[]; group_by?: string[]; aggregate?: string; field?: string; sort_by?: string; sort_desc?: boolean; limit?: number }) {
  let rows = tableRows(s, a.table);
  const fields = rows.length ? Object.keys(rows[0]) : [];
  const unknown = [...(a.filters ?? []).map((f) => f.field), ...(a.group_by ?? []), ...(a.sort_by ? [a.sort_by] : []), ...(a.field ? [a.field] : [])].filter((f) => fields.length && !fields.includes(f));
  if (unknown.length) return { error: `Unknown field(s) ${unknown.map((f) => `'${f}'`).join(", ")} for ${a.table}. The data has no such field: say so rather than guessing.`, available_fields: fields };
  if (a.aggregate && a.aggregate !== "count" && !a.field) return { error: `Aggregate '${a.aggregate}' needs a 'field'.`, available_fields: fields };
  for (const f of a.filters ?? []) rows = rows.filter((r) => matches(r, f));
  const limit = Math.min(a.limit ?? 50, 200);
  const agg = (rs: Json[]) => {
    const vals = a.field ? rs.map((r) => r[a.field!]) : [];
    const nums = vals.map(Number).filter((x) => isFinite(x));
    switch (a.aggregate) {
      case "count_distinct": return new Set(vals.map(String)).size;
      case "sum": return nums.reduce((x, y) => x + y, 0);
      case "avg": return nums.length ? Math.round((nums.reduce((x, y) => x + y, 0) / nums.length) * 100) / 100 : null;
      case "min": return nums.length ? Math.min(...nums) : null;
      case "max": return nums.length ? Math.max(...nums) : null;
      default: return rs.length;
    }
  };
  if (a.group_by?.length) {
    const g = new Map<string, Json[]>();
    for (const r of rows) { const k = JSON.stringify(a.group_by.map((f) => r[f] ?? null)); if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); }
    const out = [...g.entries()].map(([k, rs]) => ({ ...Object.fromEntries(a.group_by!.map((f, i) => [f, JSON.parse(k)[i]])), value: agg(rs) }));
    out.sort((x, y) => (a.sort_desc === false ? 1 : -1) * ((Number(x.value) || 0) - (Number(y.value) || 0)));
    return { table: a.table, as_of: s.asOf, aggregate: a.aggregate ?? "count", field: a.field ?? null, matched_rows: rows.length, groups: out.slice(0, limit), truncated: out.length > limit };
  }
  if (a.aggregate) return { table: a.table, as_of: s.asOf, aggregate: a.aggregate, field: a.field ?? null, matched_rows: rows.length, value: agg(rows) };
  if (a.sort_by) rows = [...rows].sort((x, y) => { const p = x[a.sort_by!], q = y[a.sort_by!]; const c = typeof p === "number" && typeof q === "number" ? p - q : String(p).localeCompare(String(q)); return a.sort_desc ? -c : c; });
  return { table: a.table, as_of: s.asOf, matched_rows: rows.length, rows: rows.slice(0, limit), truncated: rows.length > limit, available_fields: fields };
}

function ownerWorkloadSummary(s: Snapshot) {
  const rows = ownerRows(s);
  const byBrandOwnership = [...rows]
    .sort((a, b) => b.brands_owned - a.brands_owned || b.opportunities - a.opportunities || a.key.localeCompare(b.key))
    .map((r) => ({
      owner_id: r.key,
      owner_name: r.label,
      brands_owned: r.brands_owned,
      brands_owned_share: r.brands_owned_share,
      brands_touched: r.brands_touched,
      opportunities: r.opportunities,
      confirmed: r.confirmed,
    }));
  const totalOpportunities = byBrandOwnership.reduce((sum, x) => sum + x.opportunities, 0);
  const dealOwners = byBrandOwnership.filter((x) => x.opportunities > 0);
  const topBrandOwner = byBrandOwnership[0];
  const topOwnerInteractions = topBrandOwner ? s.interactions.filter((r) => r.owner_id === topBrandOwner.owner_id) : [];
  const topOwnerColdCount = topOwnerInteractions.filter((r) => !WARM_CHANNELS.has(r.channel)).length;
  const mostlyCold = topOwnerInteractions.length > 0 && topOwnerColdCount / topOwnerInteractions.length > 0.5;
  const dealOwnersNote = totalOpportunities > 0
    ? `Meanwhile the ${totalOpportunities} opportunit${totalOpportunities === 1 ? "y" : "ies"} ${totalOpportunities === 1 ? "sits" : "sit"} across ${dealOwners.length} deal owner${dealOwners.length === 1 ? "" : "s"} (${dealOwners.map((x) => `${x.owner_name}: ${x.opportunities} opp${x.opportunities === 1 ? "" : "s"}`).join(", ")}).`
    : "Meanwhile 0 opportunities exist across 0 deal owners at this date.";
  const overload_note = s.brandsVisible.size === 0
    ? (totalOpportunities > 0 ? `0 brands exist at this date. ${dealOwnersNote}` : "")
    : topBrandOwner
      ? `${topBrandOwner.owner_name} (${topBrandOwner.owner_id}) holds ${topBrandOwner.brands_owned} of ${s.brandsVisible.size} brands (${Math.round((topBrandOwner.brands_owned_share ?? 0) * 100)}%)${mostlyCold ? ", mostly cold outbound," : ","} with ${topBrandOwner.opportunities} opportunit${topBrandOwner.opportunities === 1 ? "y" : "ies"} and ${topBrandOwner.confirmed} confirmed. ${dealOwnersNote}`
      : "";
  return {
    total_brands_owned: s.brandsVisible.size,
    total_opportunities: totalOpportunities,
    deal_owners: dealOwners.length,
    brand_ownership_by_owner: byBrandOwnership,
    overload_note,
  };
}

// ------------------------------------------------------------------ executor
export function runTool(db: DB, name: string, args: Json, defaultAsOf: string): { result: unknown; proposal?: Proposal } {
  if (args.as_of !== undefined && args.as_of !== null && args.as_of !== "" && !parseAsOf(args.as_of))
    return { result: { error: `Invalid as_of '${String(args.as_of)}'. Use a real date as YYYY-MM-DD.` } };
  const asOf = parseAsOf(args.as_of) ?? defaultAsOf;
  const S = () => snapshot(db, asOf);
  switch (name) {
    case "get_kpis": {
      const s = S();
      return {
        result: {
          ...kpis(s),
          stalled_open_opportunities: bottlenecks(s).stalled_open_opportunities,
          owner_workload_summary: ownerWorkloadSummary(s),
        },
      };
    }
    case "get_funnel": {
      const s = S();
      const g = ((args.group_by as string) ?? "campaign") as "campaign" | "owner" | "industry" | "channel_group";
      const rows = g === "owner" ? ownerRows(s) : funnelRows(s, g);
      return {
        result: {
          as_of: s.asOf,
          group_by: g,
          ...(g === "owner" ? { owner_workload_summary: ownerWorkloadSummary(s) } : {}),
          rows: g === "campaign" ? rows.map((r) => ({ ...r, ...scaleChangeStop(r as ReturnType<typeof funnelRows>[number]) })) : rows,
          note: g === "industry"
            ? "Grouped by 2025 dataset brands.industry (brand sectors), NOT 2027 fest vertical titles. Rates are brand-level."
            : "Rates are brand-level (distinct brands), not attempts. simulated_* fields come from the SIMULATED campaign_plan.",
        },
      };
    }
    case "diagnose_campaigns": {
      const s = S();
      return {
        result: {
          as_of: s.asOf,
          scope_note: "Evaluates the 6 historical 2025 campaigns (SC01-SC06) by brand close-rate rules. For 2027 strategic bets and 120%/70% thresholds, call get_bet_signals and get_2027_plan. Stalled deals below are OPEN pipeline opportunities idle >14 days (not confirmed payment invoices).",
          ...bottlenecks(s),
          owner_workload_summary: ownerWorkloadSummary(s),
          rules: "SCALE if brand->confirmed >= 30%; STOP if >=20 brands & 0 confirmed with >=5 opportunities, or meeting rate <10% after >=50 sends; TOO_EARLY if <8 brands; else CHANGE.",
          stalled_list: stalled(s).slice(0, 30),
        },
      };
    }
    case "list_opportunities": {
      const s = S();
      const rows = opportunityList(s, { stage: args.stage as string, campaign: args.campaign as string, owner: args.owner as string, support_type: args.support_type as string, brand: args.brand as string, open_only: args.open_only as boolean, min_value: args.min_value as number });
      const lim = Math.min(Number(args.limit ?? 40), 100);
      const by_stage: Record<string, { count: number; proposed_inr: number; confirmed_inr: number }> = {};
      const by_channel_group: Record<string, { count: number; proposed_inr: number; confirmed_inr: number }> = {};
      for (const r of rows) {
        const b = (by_stage[r.stage] ??= { count: 0, proposed_inr: 0, confirmed_inr: 0 });
        b.count++; b.proposed_inr += r.proposed_value_inr; b.confirmed_inr += r.confirmed_value_inr;
        const cg = (by_channel_group[r.channel_group] ??= { count: 0, proposed_inr: 0, confirmed_inr: 0 });
        cg.count++; cg.proposed_inr += r.proposed_value_inr; cg.confirmed_inr += r.confirmed_value_inr;
      }
      return { result: { as_of: s.asOf, count: rows.length, total_proposed_inr: rows.reduce((a, r) => a + r.proposed_value_inr, 0), total_confirmed_inr: rows.reduce((a, r) => a + r.confirmed_value_inr, 0),
        by_stage, by_channel_group, totals_note: "Quote count/total/by_stage/by_channel_group figures exactly; never add row values by hand (use calculate for any other sum).", rows: rows.slice(0, lim), truncated: rows.length > lim } };
    }
    case "get_brand": {
      const s = S();
      const q = String(args.name_or_id ?? "");
      const hits = findBrands(db, q);
      if (!hits.length) return { result: { found: false, message: `No brand matches '${q}'.` } };
      if (hits.length > 1 && hits[0].brand_name.toLowerCase() !== q.toLowerCase() && hits[0].brand_id.toLowerCase() !== q.toLowerCase())
        return { result: { found: false, ambiguous: true, candidates: hits.slice(0, 10).map((b) => ({ brand_id: b.brand_id, brand_name: b.brand_name })) } };
      return { result: { found: true, as_of: s.asOf, ...brandDetail(s, hits[0].brand_id) } };
    }
    case "forecast": {
      const f = forecast(S(), { close_ids: args.close_opportunity_ids as string[] | undefined, drop_ids: args.drop_opportunity_ids as string[] | undefined });
      const bt = forecastBacktest(db, ["2025-02-15", "2025-03-01", "2025-03-15", "2025-04-01"]);
      const p15 = bt.points.find((p) => p.as_of === "2025-03-15");
      const p01 = bt.points.find((p) => p.as_of === "2025-04-01");
      const { open, ...rest } = f;
      return {
        result: {
          as_of: asOf,
          ...rest,
          reliability_backtest: {
            summary: `15 Mar forecast: ${p15?.projected} projected vs ${bt.actual_confirmed_at_event_eve} actual confirmed (${p15 && p15.error !== null && p15.error >= 0 ? "+" : ""}${p15?.error}); 1 Apr forecast: ${p01?.projected} vs ${bt.actual_confirmed_at_event_eve} actual.`,
            ...bt,
            note: "Projection made at each date vs actual confirmed on the event eve. Pipeline forecasts cannot see deals not yet created, so early dates under-forecast.",
          },
          open: open.slice(0, 40),
        },
      };
    }
    case "get_cash_collection": return { result: { as_of: asOf, ...cashCollection(S()) } };
    case "compare_dates": {
      const da = parseAsOf(args.date_a), dbb = parseAsOf(args.date_b);
      if (!da || !dbb) return { result: { error: "date_a and date_b must be real dates as YYYY-MM-DD." } };
      const a = kpis(snapshot(db, da)), b = kpis(snapshot(db, dbb));
      const keys = ["qualified_brands", "confirmed_partnerships", "confirmed_value_inr", "confirmed_cash_type_value_inr", "open_opportunities", "open_pipeline_proposed_inr", "lost_or_withdrawn", "brands_contacted", "outreach_attempts", "replies", "meetings_held"] as const;
      return { result: { date_a: a.as_of, date_b: b.as_of, targets_a: a.targets, targets_b: a.targets, deltas: Object.fromEntries(keys.map((k) => [k, { a: a[k], b: b[k], change: (b[k] as number) - (a[k] as number) }])), stages_a: a.opportunities_by_stage, stages_b: b.opportunities_by_stage } };
    }
    case "get_trend": return { result: { as_of: asOf, weekly: weeklySeries(db, asOf) } };
    case "get_targets": return { result: { as_of: asOf, versions: db.targets, note: "These are 2025 partnership-count targets (latest with effective_at <= as_of). For 2027 cash targets (₹54.1L base, ₹42.0L-₹65.8L likely range, ₹1.27 Cr stretch), call get_2027_plan." } };
    case "get_tasks": return { result: { as_of: asOf, tasks: taskView(S(), { status: args.status as string, owner: args.owner as string, overdue_only: args.overdue_only as boolean }) } };
    case "query_records": return { result: queryRecords(S(), args as never) };
    case "calculate": {
      try { return { result: { expression: args.expression, value: evaluate(String(args.expression)) } }; }
      catch (e) { return { result: { error: (e as Error).message } }; }
    }
    case "data_dictionary": {
      const d = dataDictionary(db);
      return { result: { as_of: asOf, ...d, field_guide: d.field_guide.map((f) => `${f.source_table}.${f.field}: ${f.meaning}`) } };
    }
    case "get_2027_plan": return { result: { dashboard_as_of: asOf, ...plan2027() } };
    case "get_bet_signals": return { result: betSignals(S()) };
    case "search_strategy_docs": return { result: { dashboard_as_of: asOf, ...searchKnowledge(String(args.query ?? ""), Number(args.top_k ?? 4)) } };
    case "propose_task": {
      const warnings: string[] = [];
      const s = S();
      const owners = new Set(s.owners.keys());
      if (args.owner_id && !owners.has(String(args.owner_id))) warnings.push(`Unknown owner ${args.owner_id}`);
      if (args.brand_id && !db.brands.some((b) => b.brand_id === args.brand_id)) warnings.push(`Unknown brand ${args.brand_id}`);
      if (args.opportunity_id && !db.opportunities.some((o) => o.opportunity_id === args.opportunity_id)) warnings.push(`Unknown opportunity ${args.opportunity_id}`);
      const oppStage = args.opportunity_id ? s.oppLatest.get(String(args.opportunity_id))?.stage ?? null : null;
      const brandOpps = args.brand_id ? [...s.oppLatest.values()].filter((h) => h.brand_id === String(args.brand_id)) : [];
      const brandHasOpenOpp = brandOpps.some((h) => OPEN_STAGES.includes(h.stage));
      const brandHasConfirmedOpp = brandOpps.some((h) => h.stage === "partner_confirmed");
      const payload = { title: args.title, description: args.description ?? "", owner_id: args.owner_id ?? null, due_date: args.due_date ?? null, priority: args.priority ?? "medium", brand_id: args.brand_id ?? null, opportunity_id: args.opportunity_id ?? null, sponsor_campaign_id: args.sponsor_campaign_id ?? null, source: "copilot" };
      return { result: { status: "DRAFT_ONLY_NOT_SAVED", message: "Shown to the user with a Confirm button. Tell the user to review and confirm; do not claim it was created.", opportunity_stage: oppStage, brand_has_open_opp: brandHasOpenOpp, brand_has_confirmed_opp: brandHasConfirmedOpp, draft: payload, warnings }, proposal: { kind: "task", payload, rationale: String(args.rationale ?? ""), warnings } };
    }
    case "propose_opportunity_update": {
      const warnings: string[] = [];
      const s = S();
      const cur = s.oppLatest.get(String(args.opportunity_id));
      if (!cur) warnings.push(`Opportunity ${args.opportunity_id} not found at ${asOf}`);
      if (args.stage === "partner_confirmed" && !(Number(args.confirmed_value_inr ?? cur?.proposed_value_inr) > 0)) warnings.push("Confirmed value must be > 0");
      if (cur && !OPEN_STAGES.includes(cur.stage)) warnings.push(`Current stage is already ${cur.stage}`);
      const payload = { opportunity_id: args.opportunity_id, brand: cur?.brand_name, from_stage: cur?.stage, stage: args.stage, effective_date: args.effective_date ?? asOf, proposed_value_inr: args.proposed_value_inr ?? cur?.proposed_value_inr, confirmed_value_inr: args.confirmed_value_inr ?? null };
      return { result: { status: "DRAFT_ONLY_NOT_SAVED", draft: payload, warnings }, proposal: { kind: "opportunity_update", payload, rationale: String(args.rationale ?? ""), warnings } };
    }
    default: return { result: { error: `Unknown tool ${name}` } };
  }
}

