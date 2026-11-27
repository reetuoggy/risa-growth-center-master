# Copilot evaluation

Target: http://localhost:3000 · 2026-11-27T19:41:50.027Z

**40/40 passed** (automatic regex + structural grading)

### F1 · factual · **PASS**

**Q:** How many confirmed partnerships do we have, and what is the target?

**Tools:** get_kpis, calculate

<details><summary>Answer</summary>

> We currently have **24 confirmed partnerships** against a target of **28**, representing an attainment of **85.7%** (24 / 28 = 85.7%).
> 
> ### Breakdown:
> - **Confirmed Partnerships:** 24 (20 cash-type worth ₹20.0L / ₹20,00,000, and 4 in-kind worth ₹2.4L / ₹2,40,000, bringing total confirmed value to ₹22.4L).
> - **Target:** 28 partnerships.
> - **Gap:** 4 partnerships to reach the revised goal.
> 
> Data used: get_kpis and calculate tools, dashboard as of 2025-04-20.

</details>

### F2 · factual · **PASS**

**Q:** How many brands were qualified as of 15 March 2025?

**Tools:** get_kpis

<details><summary>Answer</summary>

> As of 15 March 2025, there were 55 qualified brands.
> 
> - **Evidence:** The qualification status counts show exactly 55 qualified brands (meeting the qualified brands target of 55, with attainment at 100%).
> - **Additional context on that date:** 17 partnerships were confirmed (total value ₹15.05L / ₹15.1L), with 30 open opportunities and 51 total opportunities.
> 
> Data used: get_kpis (as of 2025-03-15).

</details>

### F3 · factual · **PASS**

**Q:** What is the total confirmed partnership value, and how much of it is in-kind?

**Tools:** get_kpis, calculate

<details><summary>Answer</summary>

> The total confirmed partnership value is **₹22.4L** (₹22,40,000) across 24 confirmed partnerships, of which **₹2.4L** (₹2,40,000) is in-kind value (representing 10.7% of total confirmed value). 
> 
> ### Breakdown:
> * **Total Confirmed Value:** ₹22,40,000 (₹22.4L) from 24 confirmed partnerships
> * **Cash-Type Partnerships:** ₹20,00,000 (₹20.0L) across 20 deals (simulated cash)
> * **In-Kind Partnerships:** ₹2,40,000 (₹2.4L) across 4 deals (₹2,40,000 / ₹22,40,000 = 10.7%)
> 
> Data used: get_kpis, calculate (as of 2025-04-20).

</details>

### F4 · factual · **PASS**

**Q:** How many sponsor interactions are in the data after removing duplicates?

**Tools:** query_records

<details><summary>Answer</summary>

> There are 950 sponsor interactions in the data (with duplicate source rows removed).
> 
> Data used: query_records (table: interactions, aggregate: count) as of 2025-04-20.

</details>

### F5 · factual · **PASS**

**Q:** What was Cobalt Learning's opportunity stage on 1 March 2025, and what is it now?

**Tools:** get_brand

<details><summary>Answer</summary>

> On March 1, 2025, Cobalt Learning's opportunity stage was negotiating, and as of today (April 20, 2025), its stage is withdrawn.
> 
> - **March 1, 2025 stage:** negotiating (with a proposed value of ₹80,000)
> - **Current stage (as of April 20, 2025):** withdrawn (confirmed value: ₹0)
> - **Opportunity history:** Created as prospecting on Feb 15, progressed through contacted (Feb 17), proposal_sent (Feb 20), and negotiating (Feb 23), confirmed as partner_confirmed on Feb 25, and subsequently withdrawn on March 20, 2025.
> 
> Data used: get_brand (brand: Cobalt Learning), as of 2025-04-20.

</details>

### F6 · factual · **PASS**

**Q:** How many contacts have opted out, and does that mean their brands are off-limits?

**Tools:** query_records

<details><summary>Answer</summary>

> A total of 7 contacts across 7 distinct brands have opted out. This does **not** automatically make their brands completely off-limits, but it imposes strict channel rules.
> 
> ### Evidence
> - **Opted-out contacts (7 contacts, 7 brands):**
>   1. Fable Works (Diya Menon — Education)
>   2. Meadow Living (Ishaan Shah — Consumer products)
>   3. Kindred Active (Aarav Sen — Food and beverage)
>   4. Fable Living (Tara Malhotra — Consumer products)
>   5. Hearth Pantry (Meera Nair — Consumer products)
>   6. Juniper Devices (Meera Rao — Mobility)
>   7. Lumen Learning (Rohan Sen — Education)
> - **Multi-contact brands:** Across those 7 brands, there are 10 total contacts on file, meaning 3 of these brands have other contacts who have *not* opted out.
> 
> ### Recommendation
> - **Cold outbound/email is off-limits:** Do not contact the specific individuals who opted out via automated or cold outbound channels.
> - **Brands are not entirely blocked:** If a brand has other listed contacts who have not opted out (or if an inbound / warm introduction occurs via a different stakeholder), outreach may proceed through those alternate channels. Always verify contact-level opt-out flags before initiating outreach.
> 
> Data used: query_records (contacts table), as of 2025-04-20.

</details>

### F7 · factual · **PASS**

**Q:** Which campaign produced the most confirmed value?

**Tools:** get_funnel

<details><summary>Answer</summary>

> Two campaigns produced the highest confirmed value: **SC05 (Creator Network Referrals)** and **SC02 (Warm Partner Introductions)**, each generating **₹7.85L** (₹7,85,000) in confirmed partnership value. 
> 
> Here is how all 6 campaigns compare on confirmed value and confirmed partnerships:
> 
> | Campaign ID | Campaign Name | Channel | Confirmed Partnerships | Confirmed Value (INR) | Verdict |
> |---|---|---|---|---|---|
> | **SC02** | Warm Partner Introductions | introduction | 8 | ₹7,85,000 | SCALE |
> | **SC05** | Creator Network Referrals | introduction | 9 | ₹7,85,000 | SCALE |
> | **SC04** | Partner Interest Form | web_inbound | 7 | ₹6,70,000 | SCALE |
> | **SC01** | Brand Discovery Email | email | 0 | ₹0 | STOP |
> | **SC03** | Brand Leader LinkedIn | linkedin | 0 | ₹0 | STOP |
> | **SC06** | Past Conversation Revival | email | 0 | ₹0 | STOP |
> 
> *Note: While SC05 secured 9 confirmed partnerships to SC02's 8, both campaigns delivered identical confirmed value of ₹7,85,000. All cold outbound and revival campaigns (SC01, SC03, SC06) yielded zero confirmed deals.*
> 
> Data used: `get_funnel(group_by="campaign")` as of 2025-04-20.

</details>

### C1 · calculation · **PASS**

**Q:** What percentage of the confirmed-partnership target have we achieved?

**Tools:** get_kpis, calculate

<details><summary>Answer</summary>

> We have achieved **85.7%** of our confirmed-partnership target.
> 
> - **Confirmed Partnerships:** 24 confirmed out of a goal of 28.
> - **Confirmed Value:** ₹22.4L (₹20.0L cash-type across 20 deals, ₹2.4L in-kind across 4 deals).
> - **Target Version:** Sponsor revised plan (goal of 28 partnerships and 55 qualified brands).
> 
> Data used: get_kpis and calculate, as of 2025-04-20.

</details>

### C2 · calculation · **PASS**

**Q:** What is the average confirmed deal size?

**Tools:** get_kpis, calculate, query_records

<details><summary>Answer</summary>

> The average confirmed deal size is **₹93,333** (or about ₹0.93L), based on a total confirmed partnership value of ₹22,40,000 across 24 confirmed partnerships. 
> 
> - **Evidence:** ₹22,40,000 total confirmed value / 24 confirmed partnerships = ₹93,333.33 average deal size.
> - **Breakdown:** 20 of these are cash-type deals totalling ₹20,00,000 (average ₹1,00,000) and 4 are in-kind deals totalling ₹2,40,000 (average ₹60,000).
> 
> Data used: get_kpis and query_records (as of 2025-04-20).

</details>

### C3 · calculation · **PASS**

**Q:** What share of brands touched by Brand Leader LinkedIn replied?

**Tools:** get_funnel, calculate

<details><summary>Answer</summary>

> For the Brand Leader LinkedIn campaign (SC03), 30 out of 37 touched brands replied, representing a brand reply rate of 81.1%.
> 
> Evidence:
> - Campaign: Brand Leader LinkedIn (SC03, Owner: Riya Kapoor)
> - Brands touched: 37
> - Brands replied: 30
> - Reply rate: 30 / 37 = 81.1% (with 10 brands meeting and 0 confirmed partnerships to date)
> 
> Data used: get_funnel (group_by="campaign") and calculate tool, as of 2025-04-20.

</details>

### C4 · calculation · **PASS**

**Q:** Brand-to-confirmed conversion: warm/inbound channels versus cold outbound?

**Tools:** get_funnel, calculate

<details><summary>Answer</summary>

> Warm/inbound channels delivered all 24 confirmed partnerships (₹22.4L confirmed value), achieving a 54.5% brand close rate, whereas cold outbound channels generated zero confirmed deals despite touching 141 brands and 33 opportunities (leaving ₹14.4L in open pipeline).
> 
> ### Funnel Comparison Summary
> * **Warm / Inbound:** 
>   * Brands touched: 44
>   * Qualified brands: 36
>   * Confirmed partnerships: 24 (₹22.4L confirmed value)
>   * Brand reply rate: 100.0% (44 / 44)
>   * Brand meeting rate: 81.8% (36 / 44)
>   * Brand close rate: 54.5% (24 / 44)
>   * Open pipeline: ₹0 (0 open opportunities)
> * **Cold Outbound:** 
>   * Brands touched: 141
>   * Qualified brands: 24
>   * Confirmed partnerships: 0 (₹0 confirmed value)
>   * Brand reply rate: 49.6% (70 / 141)
>   * Brand meeting rate: 17.0% (24 / 141)
>   * Brand close rate: 0.0% (0 / 141)
>   * Open pipeline: ₹14.4L (26 open opportunities)
> 
> ### Recommendation & Next Steps
> Stop investing team hours in cold outbound outreach (campaigns SC01, SC03, SC06) given its 0% close rate, and reallocate 100% of outbound bandwidth into warm/inbound channels (SC02, SC04, SC05) where meeting rates (81.8%) and close rates (54.5%) are exceptionally high. For the 26 stalled cold outbound opportunities holding ₹14.4L in open pipeline, execute rapid qualification or drop them to clean up the forecast.
> 
> Data used: `get_funnel(group_by="channel_group")`, `calculate`, as of 2025-04-20.

</details>

### T1 · trend · **PASS**

**Q:** How many partnerships were confirmed between 1 March and 15 March 2025?

**Tools:** compare_dates

<details><summary>Answer</summary>

> Between 1 March 2025 and 15 March 2025, 7 new partnerships were confirmed, bringing the cumulative total from 10 on March 1 to 17 on March 15.
> 
> * **March 1, 2025 (Date A):** 10 confirmed partnerships (₹9.15L total confirmed value: ₹8.15L cash-type, ₹1.0L in-kind)
> * **March 15, 2025 (Date B):** 17 confirmed partnerships (₹15.05L total confirmed value: ₹13.25L cash-type, ₹1.80L in-kind)
> * **Net Change:** +7 partnerships and +₹5.90L confirmed value (+₹5.10L cash-type)
> 
> Data used: compare_dates (as of 2025-04-20)

</details>

### T2 · trend · **PASS**

**Q:** When did the targets change and to what?

**Tools:** get_targets, calculate

<details><summary>Answer</summary>

> The 2025 sponsorship targets changed on **March 15, 2025**, with the introduction of the **Sponsor revised plan**, which increased both the qualified brands goal and the confirmed partnerships goal by 40% and 37.5% respectively.
> 
> ### Target Plan History
> * **Sponsor launch plan** (Effective January 15, 2025):
>   * Qualified brands goal: **40**
>   * Confirmed partnerships goal: **20**
> * **Sponsor revised plan** (Effective March 15, 2025):
>   * Qualified brands goal: **55** (+15 brands / +37.5%)
>   * Confirmed partnerships goal: **28** (+8 partnerships / +40.0%)
> 
> Data used: `get_targets` tool as of 2025-04-20.

</details>

### D1 · diagnosis · **PASS**

**Q:** Why are we behind the confirmed-partnership target?

**Tools:** get_kpis, diagnose_campaigns, calculate

<details><summary>Answer</summary>

> We are behind the confirmed-partnership target because **cold outbound campaigns are generating zero closed partnerships**, leaving 26 open pipeline opportunities totaling ₹14.4L entirely stalled. 
> 
> While inbound and referral channels are performing well (hitting 85.7% attainment with 24 confirmed partnerships against a revised goal of 28), the cold outbound engine has completely stalled.
> 
> ### Evidence
> * **Confirmed vs. Target:** 24 partnerships confirmed out of 28 expected by linear pacing (gap of 4 partnerships / 85.7% attainment).
> * **Funnel Split by Channel Group:**
>   * **Warm / Inbound Campaigns (SC02, SC04, SC05):** Strong conversion (Scale verdicts). All 24 confirmed partnerships came from these channels.
>   * **Cold Outbound Campaigns (SC01 Brand Discovery Email, SC03 Brand Leader LinkedIn, SC06 Past Conversation Revival):** Verdict is **STOP**. Out of 148 brands contacted across these three campaigns, they produced 0 confirmed partnerships despite 33 open opportunities historically.
> * **Stalled Open Pipeline:** There are **26 stalled open opportunities** (idle >14 days) representing **₹14.4L** in proposed value—all belonging to cold outbound channels (`by_stage`: 6 prospecting, 6 contacted, 6 proposal_sent, 8 negotiating).
> * **Team Workload Imbalance:** Kabir Shah (T02) owns 126 of the 180 brands (70%), all in cold outbound, but holds 0 opportunities and 0 confirmations. Meanwhile, the active deal owners (Riya Kapoor, Nisha Rao, Meera Iyer) are managing all 58 opportunities.
> 
> ### Recommendation
> 1. **Stop Cold Mass Outbound:** Immediately halt automated cold email and LinkedIn sequences (SC01, SC03, SC06) which have a 0% close rate.
> 2. **Reallocate Outbound Pipeline:** Reassign the 26 stalled cold negotiating and proposal-sent opportunities (totaling ₹14.4L) to warm-intro request paths or close them out to focus entirely on inbound/referral follow-ups.
> 3. **Rebalance Brand Ownership:** Reassign Kabir Shah's un-contacted cold accounts to inbound/referral prospecting support.
> 
> Data used: `get_kpis`, `diagnose_campaigns`, `calculate`, as of 2025-04-20.

</details>

### D2 · diagnosis · **PASS**

**Q:** Which campaigns should we stop and which should we scale?

**Tools:** diagnose_campaigns, get_funnel

<details><summary>Answer</summary>

> For CampusFest 2025, you should **SCALE** warm introductions, creator referrals, and web inbound campaigns, and **STOP** all three cold outbound campaigns (mass email, LinkedIn outreach, and past conversation revivals). 
> 
> ### Campaign Verdicts & Funnel Performance
> 
> | Campaign | Channel | Verdict | Brands / Opps / Confirmed | Close Rate | Confirmed Value | Open Pipeline |
> | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
> | **Warm Partner Introductions (SC02)** | Introduction | **SCALE** | 8 brands / 9 opps / 8 confirmed | 100% | ₹7.85L | ₹0 |
> | **Creator Network Referrals (SC05)** | Introduction | **SCALE** | 19 brands / 9 opps / 9 confirmed | 47.4% | ₹7.85L | ₹0 |
> | **Partner Interest Form (SC04)** | Web Inbound | **SCALE** | 17 brands / 7 opps / 7 confirmed | 41.2% | ₹6.70L | ₹0 |
> | **Brand Leader LinkedIn (SC03)** | LinkedIn | **STOP** | 37 brands / 12 opps / 0 confirmed | 0% | ₹0 | ₹5.30L |
> | **Brand Discovery Email (SC01)** | Email | **STOP** | 91 brands / 11 opps / 0 confirmed | 0% | ₹0 | ₹4.90L |
> | **Past Conversation Revival (SC06)** | Email | **STOP** | 20 brands / 10 opps / 0 confirmed | 0% | ₹0 | ₹4.20L |
> 
> ---
> 
> ### Evidence & Reasoning
> 
> 1. **The SCALE Campaigns (Warm & Inbound):**
>    - **Warm Partner Introductions (SC02)** converted 8 out of 8 qualified brands into confirmed partnerships (100% close rate).
>    - **Creator Network Referrals (SC05)** delivered 9 confirmed partnerships from 19 qualified brands (47.4% brand close rate).
>    - **Partner Interest Form (SC04)** secured 7 confirmed partnerships from 17 qualified brands (41.2% close rate) with the highest efficiency at ₹16,750 confirmed value per simulated hour.
>    - *Rule applied:* All three exceeded the 30% brand-to-confirmed scale threshold.
> 
> 2. **The STOP Campaigns (Cold Outbound):**
>    - **Brand Discovery Email (SC01)** touched 91 brands across 224 attempts and generated 11 opportunities, but yielded **0 confirmed partnerships** (₹0 value).
>    - **Brand Leader LinkedIn (SC03)** touched 37 brands across 54 sends and 12 opportunities, resulting in **0 confirmed partnerships**.
>    - **Past Conversation Revival (SC06)** targeted 20 brands across 44 sends and 10 opportunities, also resulting in **0 confirmed partnerships**.
>    - *Rule applied:* Each campaign engaged 20+ brands and 5+ opportunities with zero closed deals. Furthermore, cold outbound accounts for **26 stalled open pipeline opportunities worth ₹14.4L** that have sat idle for over 14 days (e.g., Evergreen Living idle 73 days, Cedar Works idle 68 days).
> 
> 3. **Owner Workload Bottleneck:**
>    - Kabir Shah (T02) currently holds **126 out of 180 brands (70%)**, predominantly tied to cold outreach (SC01, SC04, SC06), resulting in 0 confirmed deals under his name. Meanwhile, active deal management is concentrated among Riya Kapoor (23 opps), Nisha Rao (20 opps), and Meera Iyer (15 opps). Reallocating time away from cold email will free up vital bandwidth for deal execution.
> 
> ---
> 
> ### Recommendations & Next Steps
> 
> * **Reallocate Hours from Cold to Warm:** Shift hours away from SC01, SC03, and SC06 entirely. Channel those resources into scaling warm intros (SC02) and creator referrals (SC05).
> * **Rescue Stalled Outbound Pipeline:** Do not abandon the 26 open cold outbound opportunities (worth ₹14.4L) entirely, but convert them from automated mass outreach to personalized, account-based follow-ups via warm introductions.
> 
> Data used: `diagnose_campaigns`, `get_funnel`, and dashboard as of 2025-04-20.

</details>

### D3 · diagnosis · **PASS**

**Q:** How reliable is the forecast?

**Tools:** forecast

<details><summary>Answer</summary>

> The forecast is **highly reliable as the festival approaches**, though early-season pipeline estimates initially over-projected final outcomes due to unstalled deals. 
> 
> Because today (April 20, 2025) is **after the event has started** (April 12-13, 2025), the forecast locks in confirmed partnerships and assigns zero weight to open pipeline.
> 
> ### Reliability Backtest Evidence
> * **March 15 Forecast:** Projected **26.9** partnerships versus **24** actual confirmed on event eve (an error of +2.9).
> * **April 1فل Forecast:** Projected **26.2** partnerships versus **24** actual confirmed (an error of +2.2).
> * **Early Season (Feb 15 / Mar 1):** Severely under-forecasted or over-forecasted because pipeline volume was still scaling and deals had not yet aged or stalled.
> * **Current Status:** With the event concluded, projected confirmed partnerships stand exactly at **24** (₹22.4L confirmed value) with 0 expected additional confirmations from the remaining open pipeline.
> 
> Data used: `forecast` tool, as of 2025-04-20.

</details>

### U1 · follow-up · **PASS**

**Q:** Which opportunity owner has the most confirmed value?  →  And how many open deals do they still have?

**Tools:** get_funnel, get_kpis

<details><summary>Answer</summary>

> **Riya Kapoor (T01)** still has **10 open deals** in her pipeline, representing ₹6.0L (₹6,00,000) in open pipeline value.
> 
> ### Open Deals Breakdown Across All Deal Owners
> - **Riya Kapoor (T01):** 10 open deals | ₹6.0L open pipeline
> - **Nisha Rao (T05):** 8 open deals | ₹4.2L open pipeline
> - **Meera Iyer (T03):** 8 open deals | ₹4.2L open pipeline
> - **Kabir Shah (T02):** 0 open deals (holds cold brand outreach only)
> 
> Data used: `get_funnel` (as of 2025-04-20).

</details>

### U2 · follow-up · **PASS**

**Q:** Tell me about Beardo.  →  What was the value of their lost deal?

**Tools:** get_brand

<details><summary>Answer</summary>

> The lost deal (opportunity ID O002) had a proposed value of **₹30,000**.
> 
> Data used: get_brand (Beardo) as of 2025-04-20.

</details>

### X1 · changed-data · **PASS**

**Q:** How many confirmed partnerships do we have right now?

**Tools:** get_kpis

<details><summary>Answer</summary>

> We currently have **24 confirmed partnerships** with a total confirmed value of ₹22.4L (₹22,40,000).
> 
> - **Confirmed Deals Breakdown:** 
>   - Cash-type deals: 20 partnerships (₹20.0L)
>   - In-kind deals: 4 partnerships (₹2.4L)
> - **Target Attainment:** 24 out of the revised goal of 28 confirmed partnerships (**85.7%** attainment).
> 
> Data used: `get_kpis` as of 2025-04-01.

</details>

### X2 · changed-data · **PASS**

**Q:** What is the current confirmed-partnership goal?

**Tools:** get_kpis, get_targets, calculate

<details><summary>Answer</summary>

> The current confirmed-partnership goal for CampusFest 2025 is **30 confirmed partnerships** (under the "Eval stretch plan", active since 2025-04-10). 
> 
> ### Evidence
> * **Target Version:** Eval stretch plan (active 2025-04-10 onwards)
> * **Goal:** 30 confirmed partnerships (and 60 qualified brands)
> * **Current Attainment:** 24 confirmed partnerships achieved out of 30, representing **80.0%** attainment (as of 2025-04-20).
> * **Previous Targets (for context):** 
>   * Sponsor launch plan (Jan 15): 20 confirmed / 40 qualified
>   * Sponsor revised plan (Mar 15): 28 confirmed / 55 qualified
> 
> Data used: get_kpis and get_targets, as of 2025-04-20.

</details>

### N1 · unanswerable · **PASS**

**Q:** How much sponsorship cash has actually reached our bank account?

**Tools:** get_cash_collection, get_kpis

<details><summary>Answer</summary>

> As of **2025-04-20**, **₹15,99,850 (₹16.0L)** of simulated net cash has reached the bank account out of **₹20,000,000 (₹20.0L)** total invoiced across 20 cash-type deals (reflecting 50/50 payment terms and 2% TDS deductions). 
> 
> Here is the breakdown of our cash collection and invoicing status:
> 
> * **Gross Invoiced:** ₹20,00,000 (₹20.0L)
> * **Net Cash Received:** ₹15,99,850 (₹16.0L)
> * **TDS Withheld (2%):** ₹32,650
> * **Outstanding Gross:** ₹3,67,500 across 5 overdue invoices / installments (totalling ₹2,40,000 overdue).
> * **MoU-to-Advance Timing:** Out of 20 cash deals, 6 advances took longer than the 15-day target (median payment time is 10 days, max 23 days). There is also 1 unpaid advance currently overdue (Mosaic Mobility for ₹75,000, 18 days since MoU).
> 
> **Data used:** get_cash_collection and get_kpis as of 2025-04-20 (payments and cash data are SIMULATED).

</details>

### N2 · unanswerable · **PASS**

**Q:** Did the Beardo activation increase festival attendance?

**Tools:** data_dictionary, get_brand

<details><summary>Answer</summary>

> The data does not measure whether the Beardo activation increased festival attendance. 
> 
> While Beardo is linked to an activation association (`L001` with the "Creator Partners" attendee campaign on 2025-03-10), the sponsorship dataset **does not track attendee counts, footfall, or causal impact**. Partner activations record associations only and cannot establish incremental visitor uplift.
> 
> **Beardo Partnership Summary (Evidence):**
> - **Status:** Partner confirmed (Opportunity `O001`, confirmed value ₹2,00,000, cash support type).
> - **Activation:** Linked to attendee campaign `C03` (Creator Partners) on 2025-03-10.
> - **Engagement:** Came via Warm Partner Introductions (`SC02`), qualified on 2025-03-04.
> 
> Data used: `get_brand`, data dictionary / source rules (as of 2025-04-20).

</details>

### N3 · unanswerable · **PASS**

**Q:** What is our customer acquisition cost for the LinkedIn campaign?

**Tools:** data_dictionary

<details><summary>Answer</summary>

> The sponsorship data does not support calculating a customer acquisition cost (CAC) for the LinkedIn campaign (SC03) or any other campaign. 
> 
> As noted in the data dictionary, **real marketing spend, CAC, and ROI do not exist** in the dataset; campaign budgets and spend figures are simulated, and source records contain no actual cost or bank-expenditure data.
> 
> If you would like to analyze the LinkedIn campaign's performance using metrics the data *does* support—such as outreach volume, reply rate, meeting booking rate, qualified brands generated, or confirmed partnerships—please let me know and I can pull those figures for you.
> 
> Data used: `data_dictionary`, as of 2025-04-20.

</details>

### N4 · unanswerable · **PASS**

**Q:** Why exactly did Evergreen Collective's deal get lost?

**Tools:** get_brand

<details><summary>Answer</summary>

> Evergreen Collective's opportunity (O054) was marked as **lost** on February 19, 2025, because **the brand did not match the partnership brief**, despite initial outreach and a positive reply from contact Tara Kapoor. 
> 
> **Evidence from brand history:**
> - **Qualification Status:** Unqualified on January 27, 2025 (`BQ0149`). Reason recorded: *"Contact interest exists, but the brand does not match the partnership brief."*
> - **Opportunity Lifecycle:** Created on February 1, 2025 (owner: Riya Kapoor, campaign: Brand Discovery Email / SC01) with a proposed value of ₹1,25,000. It progressed through *contacted* (Feb 4) and *proposal_sent* (Feb 8), reached *negotiating* at ₹1,35,000 on Feb 13, and was finalized as **lost** on Feb 19 at ₹1,25,000.
> - **Data limitation:** The database does not capture specific qualitative notes from the negotiation table beyond the formal qualification disqualification reason.
> 
> Data used: get_brand (A053 / Evergreen Collective), dashboard as of 2025-04-20.

</details>

### N5 · unanswerable · **PASS**

**Q:** How many Instagram followers does Beardo have?

**Tools:** get_brand

<details><summary>Answer</summary>

> The provided sponsorship database does not track social media metrics such as Instagram follower counts for Beardo or any other brand. 
> 
> **Data used:** `get_brand` for Beardo; dashboard as of 2025-04-20.

</details>

### E1 · execution · **PASS**

**Q:** Draft a task for Kabir Shah to pause the Brand Discovery Email campaign and move his hours to warm introductions, due 2025-03-20.

**Tools:** propose_task

<details><summary>Answer</summary>

> I have drafted a task for Kabir Shah (T02) to pause the Brand Discovery Email campaign (SC01) and redirect his hours to warm introductions by 2025-03-20. 
> 
> **Task Details:**
> - **Title:** Pause Brand Discovery Email campaign and reallocate hours to warm introductions
> - **Owner:** Kabir Shah (T02)
> - **Due Date:** 2025-03-20
> - **Priority:** High
> - **Campaign Linked:** SC01 (Brand Discovery Email)
> - **Rationale:** Low conversion efficiency and high drop-off in cold email campaigns compared to warm channels.
> 
> Please review the draft above and click **Confirm** in the chat to save the task.
> 
> Data used: `propose_task`, as of 2025-04-20.

</details>

### K1 · deck-consistency · **PASS**

**Q:** What are our 2027 base and stretch cash targets by T-14, and what is the likely range?

**Tools:** get_2027_plan

<details><summary>Answer</summary>

> For CampusFest 2027 (Mumbai), the modelled sponsorship plan projects a base cash target of ₹54.1L by T-14 (2027-02-20), a stretch cash target of ₹1.27 Cr, and a likely P10-P90 Monte Carlo uncertainty range of ₹42.0L to ₹65.8L.
> 
> ### Key Details from the 2027 Plan Model:
> - **Base Cash Target (T-14):** ₹54.1L (backed by ₹88.1L signed across 31.8 deals).
> - **Stretch Cash Target (T-14):** ₹1.27 Cr (backed by ₹1.79 Cr signed across 60.7 deals).
> - **Likely Range (P10–P90):** ₹42.0L to ₹65.8L (based on 5,000 Monte Carlo simulation draws).
> - **Status-Quo Replay (2025 baseline):** ₹14.1L.
> 
> Data used: get_2027_plan (as of 2025-04-20).

</details>

### K2 · deck-consistency · **PASS**

**Q:** Why did we pick Mumbai instead of Delhi NCR for CampusFest 2027?

**Tools:** get_2027_plan, search_strategy_docs

<details><summary>Answer</summary>

> We selected Mumbai over Delhi NCR for CampusFest 2027 because of a **sponsor-mix tiebreak rule**. 
> 
> While Delhi NCR scored slightly higher in the weighted model (**8.95 out of 10** vs Mumbai's **8.90 out of 10**, a difference of 0.05 within scoring noise), the tiebreak policy dictates:
> - **Delhi NCR** wins if the sponsor mix is led by D2C or quick-commerce brands.
> - **Mumbai** wins if the title sponsors are **big banks and UPI/fintech anchors**.
> 
> Because CampusFest 2027 targets major banking, financial services, and UPI anchor titles, Mumbai won the tiebreak. Key supporting factors for Mumbai include:
> - **Anchor HQs:** Proximity to key national decision-makers such as **NPCI** (BKC), **State Bank of India** (Nariman Point), **Union Bank of India** (Nariman Point), and **IDFC FIRST Bank** (BKC).
> - **Precedent & Collections:** Mumbai hosts India's most-sponsored college fest precedents (Mood Indigo; Techfest ₹1.58 Cr in 2014) and has the fastest metro MSME receivables collection turnaround (59 days vs slower regional averages).
> - **Timing:** Scheduled for 6–7 March 2027, avoiding the heavy December fest season in Mumbai/Pune and landing just before brands' 31 March financial year-end.
> 
> *(Note: The weighted city score criteria weight brand HQ pool at 30%, students at 20%, agency access at 15%, fest precedent at 15%, venue cost at 10%, and startup funding at 10%).*
> 
> Data used: `get_2027_plan` and `search_strategy_docs` (Deck Slide 1 & README §2), as of 2025-04-20.

</details>

### K3 · deck-consistency · **PASS**

**Q:** How are brands distributed across owners, and is anyone overloaded?

**Tools:** get_funnel, get_kpis

<details><summary>Answer</summary>

> Brands are heavily skewed toward one owner, and **Kabir Shah (T02)** is significantly overloaded on brand ownership while carrying zero opportunities or confirmed deals.
> 
> ### Brand Ownership Breakdown (Total: 180 Brands)
> * **Kabir Shah (T02):** 126 brands owned (70.0% share), 128 touched, 27 qualified, but **0 opportunities** and **0 confirmed partnerships**.
> * **Riya Kapoor (T01):** 35 brands owned (19.4% share), 44 touched, 18 qualified, **23 opportunities**, and **10 confirmed partnerships** (₹10.75L).
> * **Nisha Rao (T05):** 19 brands owned (10.6% share), 19 touched, 15 qualified, **20 opportunities**, and **9 confirmed partnerships** (₹7.25L).
> * **Meera Iyer (T03):** 0 brands owned directly, yet holds **15 opportunities** and **5 confirmed partnerships** (₹4.40L).
> 
> ### Funnel Disconnect & Overload Summary
> 1. **Brand vs. Deal Ownership Split:** Kabir holds 70% of all brand accounts (mostly cold outbound outreach), but has converted none into the opportunity pipeline. All 58 opportunities are managed exclusively by Riya, Nisha, and Meera.
> 2. **Cold Outbound Bottleneck:** Kabir's cold outreach generated 128 touches and 27 qualified brands, but 0 open opportunities. 
> 
> **Recommendation:** Reallocate a portion of Kabir's qualified cold accounts (especially the 27 qualified brands) to the active deal owners (Riya, Nisha, Meera) to convert pipeline before the event closes.
> 
> Data used: `get_funnel` and `get_kpis` as of 2025-04-20.

</details>

### K4 · deck-consistency · **PASS**

**Q:** How many days from MoU to advance paid? Did any advance exceed 15 days, and which payments are overdue?

**Tools:** get_cash_collection

<details><summary>Answer</summary>

> The median time from MoU to advance payment is **10 days** (range: 4 to 23 days), well within the **15-day target**. However, **7 total advances** exceeded (or are currently exceeding) the 15-day mark (6 paid late, 1 unpaid), and there are **5 overdue invoices** in total.
> 
> ### 1. MoU-to-Advance Performance
> * **Total Advances Tracked:** 20
> * **Median Days:** 10 days | **Max Days:** 23 days (Aster Pantry)
> * **Advances Exceeding 15 Days:** 7 (6 paid late, 1 currently unpaid)
> 
> **List of Advances Exceeding 15 Days:**
> | Brand | Days to Pay / Since MoU | Status | Amount (INR) |
> | :--- | :--- | :--- | :--- |
> | **Aster Pantry** | 23 days | Paid after 15 days | ₹25,000 |
> | **Aster Works** | 22 days | Paid after 15 days | ₹32,500 |
> | **Aster Living** | 19 days | Paid after 15 days | ₹62,500 |
> | **Mosaic Mobility** | 18 days | Overdue / Unpaid | ₹75,000 |
> | **Juniper Foods** | 17 days | Paid after 15 days | ₹60,000 |
> | **Maple Devices** | 17 days | Paid after 15 days | ₹45,000 |
> | **Bramble Active** | 16 days | Paid after 15 days | ₹62,500 |
> 
> ---
> 
> ### 2. Overdue Payments (5 Total / Gross ₹2,40,000)
> Out of the 5 overdue payment records (simulated), **1 is an unpaid advance** and **4 are unpaid balance installments** (from the standard 50/50 split terms):
> 
> 1. **Mosaic Mobility:** ₹75,000 (**Advance**, 3 days overdue, 18 days since MoU)
> 2. **Aster Collective:** ₹45,000 (**Balance**, 25 days overdue)
> 3. **Aster Threads:** ₹25,000 (**Balance**, 19 days overdue)
> 4. **Aster Works:** ₹32,500 (**Balance**, 16 days overdue)
> 5. **Bramble Active:** ₹62,500 (**Balance**, 4 days overdue)
> 
> *Note: All financial figures, payment statuses, and invoice tracking are simulated.*
> 
> **Recommendation:** Follow up immediately with **Mosaic Mobility** regarding their overdue advance (₹75,000) and **Aster Collective** / **Aster Threads** on their delinquent balance installments.
> 
> Data used: `get_cash_collection` (as of 2025-04-20).

</details>

### K5 · deck-consistency · **PASS**

**Q:** Draft tasks for our stalled deals.

**Tools:** diagnose_campaigns, propose_task

<details><summary>Answer</summary>

> There are **26 stalled open pipeline opportunities** (idle >14 days) representing **₹14.4L** in cold outbound pipeline. There are 0 warm/inbound stalled deals. 
> 
> By stage breakdown:
> - Negotiating: 8 deals (idle 21 to 73 days)
> - Proposal sent: 6 deals (idle 24 to 68 days)
> - Contacted: 6 deals (idle 35 to 79 days)
> - Prospecting: 6 deals (idle 45 to 89 days)
> 
> I have drafted high-priority follow-up tasks for the **8 stalled negotiating deals** (totaling ₹7.3L) across owners Riya Kapoor (T01), Nisha Rao (T05), and Meera Iyer (T03). Please review and confirm the drafts in the chat.
> 
> Data used: `diagnose_campaigns` and `propose_task` (as of 2025-04-20).

</details>

### K6 · deck-consistency · **PASS**

**Q:** How many stalled deals do we have, what are they worth, and how do they split between cold and warm?

**Tools:** diagnose_campaigns, calculate

<details><summary>Answer</summary>

> We have **26** stalled open pipeline opportunities idle for more than 14 days, worth a total of **₹14.4L** (₹14,40,000). 
> 
> ### Breakdown by Channel Group
> - **Cold Outbound:** 26 stalled deals worth ₹14.4L (100% of the stalled pipeline)
> - **Warm / Inbound:** 0 stalled deals (₹0)
> 
> ### Stage Distribution of Stalled Deals
> - **Negotiating:** 8 deals (₹7.7L)
> - **Proposal Sent:** 6 deals (₹3.6L)
> - **Contacted:** 6 deals (₹2.4L)
> - **Prospecting:** 6 deals (₹0.7L)
> 
> ### Recommendation
> All 26 stalled deals originate from cold outbound campaigns (SC01, SC03, SC06), which have been diagnosed with a **STOP** verdict due to 0% close rates. Rather than spending team bandwidth chasing dead cold leads, reallocate owner effort toward high-converting warm channels and account-based warm-intro requests.
> 
> Data used: `diagnose_campaigns` tool, dashboard as of 2025-04-20.

</details>

### K7 · deck-consistency · **PASS**

**Q:** How does our 2027 plan define hybrid deals? Are they in-kind with zero guaranteed cash?

**Tools:** get_2027_plan, search_strategy_docs

<details><summary>Answer</summary>

> No, hybrid deals in the 2027 plan are **not** in-kind or barter deals with zero guaranteed cash. 
> 
> ### Key Definition (2027 Plan - Segment E / Bet 5)
> * **Structure:** A hybrid deal combines a **fixed guaranteed upfront fee** with a **capped CPA (Cost Per Acquisition) performance bonus** (backed by DPDP-compliant user consent). 
> * **Cash Contribution:** Only the guaranteed portion (targeting a **50% guaranteed fee share**) counts toward pre-festival T-14 cash. The CPA performance bonus settles *after* the festival and is excluded from pre-fest cash.
> * **Comparison to In-Kind:** In-kind deals (as seen in the 2025 dataset) involve ₹0 cash and barter/services value. Hybrid deals, by contrast, explicitly require pre-festival guaranteed cash. Pure CPA deals (where sponsors demand zero guaranteed cash upfront) are explicitly rejected in the plan.
> 
> Data used: `get_2027_plan`, `search_strategy_docs` (as of 2025-04-20).

</details>

### K8 · deck-consistency · **PASS**

**Q:** Judge all 5 bets using our Scale and Stop plan thresholds.

**Tools:** get_bet_signals

<details><summary>Answer</summary>

> Here is the judgment for all 5 strategic bets based on the 2027 plan thresholds (Scale at >= 120% of plan, Stop at < 70% of plan, or Not Measurable where 2025 data lacks tagged deals):
> 
> 1. **Warm Introductions (Bet 1 / SC02, SC05)** — **STOP**
>    - **Evidence:** Intros per week are 2.09 against a plan of 12.7 (16.5% of plan, which is well below the <70% STOP threshold), even though the intro-to-meeting conversion is strong at 85% (0.85 vs plan 0.4).
>    - **Recommendation:** Stop broad outbound networking and re-source referrers to focus only on top-performing referral channels.
> 
> 2. **Store & Inbound (Bet 2 / SC04)** — **STOP**
>    - **Evidence:** Submissions per week are 1.31 against a plan of 8.2 (16.0% of plan, triggering the <70% STOP threshold), despite a healthy submit-to-meeting rate of 76% (0.76 vs plan 0.6).
>    - **Recommendation:** Fold store/inbound efforts into the warm engine and push packages via campus ambassadors.
> 
> 3. **Verticals (Bet 3 / Segment B)** — **NOT_MEASURABLE**
>    - **Evidence:** No 2025 deals are tagged to this 2027 unbundled property bet yet. 
>    - **2027 Plan Thresholds & Actions:** Plan requires verticals with 2 or more live proposals by week 5 (plan 6 slots) and an average ask of ₹6L (Scale at >= 7.2L / Stop at < 4.2L). Action if missed: re-bundle two weak verticals or sell as category slots if no proposals after 15 pitches.
> 
> 4. **Anchor Partnerships (Bet 4 / Segment A)** — **NOT_MEASURABLE**
>    - **Evidence:** No 2025 deals are tagged to this 2027 anchor sponsor bet.
>    - **2027 Plan Thresholds & Actions:** Plan requires anchors at proposal by week 6 (plan 1.6 signed from 3 slots; Scale at >= 3 / Stop at < 1). Action if missed: re-price to co-title (₹12-13L) or release slots as vertical titles by week 9.
> 
> 5. **Hybrid Contracts (Bet 5 / Segment E)** — **NOT_MEASURABLE**
>    - **Evidence:** No 2025 deals are tagged to this 2027 hybrid guaranteed-fee + capped CPA bet.
>    - **2027 Plan Thresholds & Actions:** Plan requires a guaranteed share in signed pilots of 50% (Scale at >= 60% / Stop at < 35%). Action if missed: lower the bonus cap and raise the base fee, or drop if sponsors demand pure CPA with no pre-fest cash.
> 
> Data used: get_bet_signals as of 2025-04-20.

</details>

### K9 · deck-consistency · **PASS**

**Q:** What is the modelled downside if no anchor sponsor signs?

**Tools:** get_2027_plan, calculate

<details><summary>Answer</summary>

> According to the CampusFest 2027 plan model, if **no anchor sponsor signs**, the modelled downside cash collection by T-14 is **₹41.0L** (compared to the ₹54.1L base case), representing a shortfall of **₹13.1L**. 
> 
> ### Context & Downside Breakdown
> * **Base Cash Projection:** ₹54.1L
> * **No-Anchor Downside Cash:** ₹41.0L
> * **Difference:** -₹13.1L (-24.2% vs base)
> * **Trigger/Action in Plan:** If an anchor MoU is not secured by Week 9, the plan calls for releasing those inventory slots as unbundled vertical titles (Bet 3).
> 
> Other modelled sensitivities for comparison:
> * **Only the 2025 team of 3 sellers:** ₹32.0L (-₹22.1L vs base)
> * **Anchor and vertical tickets halved:** ₹38.9L (-₹15.2L vs base)
> * **Warm intro conversion drops to 30%:** ₹46.6L (-₹7.6L vs base)
> 
> Data used: `get_2027_plan` (as of 2025-04-20)

</details>

### K10 · deck-consistency · **PASS**

**Q:** Compare the 15 March forecast against the actual confirmed deals.

**Tools:** forecast, search_strategy_docs

<details><summary>Answer</summary>

> The 15 March pipeline forecast projected **26.9 confirmed deals**, whereas the actual count of confirmed deals on event eve was **24** (an over-projection error of **+2.9** deals). 
> 
> ### Forecast Reliability Backtest
> As tracked across historical snapshot checkpoints leading up to the 2025 event:
> - **15 Feb:** Projected 6.5 deals vs 24 actual (error: -17.5 deals — early pipeline forecasts under-project because many future deals have not yet been created).
> - **01 Mar:** Projected 19.6 deals vs 24 actual (error: -4.4 deals).
> - **15 Mar:** Projected 26.9 deals vs 24 actual (error: +2.9 deals — peak over-projection as conversion probability weighting estimated more negotiating deals would close than ultimately did).
> - **01 Apr:** Projected 26.2 deals vs 24 actual (error: +2.2 deals).
> 
> ### Interpretation & Recommendation
> The mid-March forecast slightly over-forecast final confirmed partnerships because it assigned expected stage-conversion weights to open negotiating and proposal-sent pipeline deals that ultimately stalled or failed to close before the festival. When forecasting future editions (such as the 2027 Mumbai plan), apply a **stall discount factor** for opportunities idling past the median cycle time (10 days) to prevent over-optimistic pipeline projections.
> 
> Data used: `forecast` tool reliability backtest and search strategy docs (`collections-mou-to-advance-forecast`), as of 2025-04-20.

</details>

### K11 · deck-consistency · **PASS**

**Q:** What specific actions should we take if we miss our Week 6 and Week 9 checkpoints?

**Tools:** get_2027_plan

<details><summary>Answer</summary>

> If CampusFest 2027 misses its Week 6 or Week 9 checkpoints, the plan mandates specific defensive actions to protect cash and reallocate seller effort:
> 
> ### 1. Missing the Week 6 Checkpoint (Signed MoU value below ₹46.2L / 52% of base)
> * **Action:** **Stop cold outreach** (cut cold ABM entirely) and **re-price the anchor deal to a co-title** (₹12-13L).
> * **Rationale:** Cold channels yield low return under tight timelines. Re-pricing the anchor broadens the buyer pool from single monolithic approvals to faster co-title decisions.
> * **Gate rule:** Missed if signed MoU value is below ₹39.2L (hard stop threshold is <70% of plan).
> 
> ### 2. Missing the Week 9 Checkpoint (Cash in bank below ₹18.76L)
> * **Action:** Require **100% advance on every new deal** and immediately **escalate overdue balances** to sponsor executives.
> * **Rationale:** As the festival approaches, accounts receivable risk spikes. Halting credit terms preserves liquidity for headline commitments.
> * **Gate rule:** Missed if cash in bank is below ₹15.9L.
> 
> ---
> **Data used:** `get_2027_plan` (CampusFest 2027 sponsorship plan & gates model, as of 2025-04-20).

</details>

### R1 · reworded · **PASS**

**Q:** If D2C or quick-commerce sponsors led the mix instead of banks/UPI, which city would win?

**Tools:** get_2027_plan, search_strategy_docs

<details><summary>Answer</summary>

> **Delhi NCR would win.**
> 
> According to the CampusFest 2027 strategy model, Delhi NCR edges out Mumbai on overall weighted score (8.95 vs 8.90 out of 10, within scoring noise). While Mumbai wins if big bank and UPI title sponsors lead the mix (thanks to anchor headquarters like NPCI, SBI, Union Bank, and IDFC FIRST Bank in BKC and Nariman Point), **Delhi NCR wins the tiebreak if D2C or quick-commerce brands lead the mix**.
> 
> Data used: `get_2027_plan` and `search_strategy_docs` (Deck Slide 1 & Fact Base §2) as of 2025-04-20.

</details>

### R2 · reworded · **PASS**

**Q:** Give me the Monte Carlo P10-P90 band and stretch goal in the 2027 model.

**Tools:** get_2027_plan

<details><summary>Answer</summary>

> In the CampusFest 2027 sponsorship plan model, the Monte Carlo likely range (P10 to P90) and stretch goal are:
> 
> - **Monte Carlo Likely Range (P10–P90):** **₹42.0L to ₹65.8L** (with a median P50 of **₹54.1L** base cash collected by T-14).
> - **Stretch Goal:** **₹1.27 Cr** (₹1.27,40,000 cash collected from 61 deals totalling ₹1.79 Cr signed value, requiring 8 sellers at 93% load).
> 
> ### Evidence
> - **Base Plan (Model Projections):** ₹54.1L cash by T-14 across 32 deals (₹88.1L signed value).
> - **Uncertainty Model:** Derived from 5,000 Monte Carlo draws varying channel conversion rates, ticket sizes, collection timelines, and anchor binomial outcomes.
> - **Status-Quo Comparison:** Replaying the 2025 status-quo model yields only **₹14.1L**.
> 
> Data used: `get_2027_plan` (as of 2025-04-20).

</details>

### R3 · reworded · **PASS**

**Q:** Are dataset brand industries the same as the 2027 plan's verticals?

**Tools:** search_strategy_docs

<details><summary>Answer</summary>

> No. In the 2027 plan, "verticals" (Bet 3 / Segment B) refer to unbundled festival sub-property titles sold separately (such as 2 pro-nights, a hackathon utilizing HR employer-branding budgets, an esports arena, a summit, and a fashion night). 
> 
> By contrast, in the 2025 dataset (`brands.industry`), "industries" refer to the 6 brand sectors: Food and beverage, Consumer products, Mobility, Education, Media, and Personal care. 
> 
> Data used: `search_strategy_docs` (as of 2025-04-20).

</details>
