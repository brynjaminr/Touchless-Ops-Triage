# PILOT & PRICING SOP
# Touchless Ops Triage — Sales Enablement

**Purpose:** How to sell, scope, and price pilot engagements and ongoing subscriptions.

---

## 7-DAY PILOT PROGRAM

### Overview

Free 7-day trial to prove ROI before client commits.

**What client gets:**
- Full product access
- Processing of real invoices
- Dashboard for review
- Weekly report (if pilot spans Monday)
- Onboarding call (10 minutes)
- Daily check-ins (optional)

**What client provides:**
- Email inbox access (Gmail or Microsoft 365)
- Accounting system OAuth (Xero or QuickBooks)
- 10-50 invoice sample (forwarded during pilot)
- One decision-maker available for approvals

**Success criteria:**
- 70%+ auto-approval rate
- < 5 minutes average processing time
- Zero manual data entry for auto-approved invoices
- Client saves measurable time

---

## PILOT QUALIFICATION

### Ideal Pilot Client

**Must have:**
- 50+ invoices per month
- Using Xero or QuickBooks Online
- Receiving invoices via Gmail or Microsoft 365
- Purchase orders in accounting system
- Decision-maker can commit within 7 days

**Nice to have:**
- 100+ invoices per month
- Dedicated AP person (time savings easily measured)
- Pain with current manual process
- Growing company (invoice volume increasing)

### Disqualify if:

- < 20 invoices per month (not enough volume to prove value)
- Using NetSuite (stub not implemented yet)
- No purchase orders (matching won't work well)
- Invoices arrive via physical mail or portal (not email)
- Decision-maker on vacation next 2 weeks

### Qualification Questions (Ask on Sales Call)

1. **How many invoices do you process per month?**
   - Looking for: 50-500 range

2. **How do you receive invoices today?**
   - Looking for: Email (Gmail or Microsoft 365)
   - Red flag: Mail, fax, vendor portal

3. **What accounting system do you use?**
   - Looking for: Xero, QuickBooks Online
   - Maybe: NetSuite (set expectation: manual matching for now)
   - Red flag: Desktop QuickBooks, Sage, custom system

4. **Do you use purchase orders?**
   - Looking for: Yes, for most vendors
   - Red flag: No POs at all

5. **How much time do you spend on invoice processing weekly?**
   - Looking for: 10+ hours
   - Calculate ROI: hours * $50 = monthly savings

6. **Who handles invoice approvals?**
   - Looking for: One or two people (controller, AP manager)
   - Red flag: Complex multi-level approval (not supported yet)

7. **What's your timeline to implement a solution?**
   - Looking for: Within 30 days
   - Red flag: "Just exploring," "Maybe next quarter"

---

## PILOT SCOPE (7-DAY TRIAL)

### Day 0: Pre-Pilot Setup (You do this before client call)

1. Create tenant in backend
2. Create admin user credentials
3. Pre-configure n8n workflow with client's tenant ID
4. Test system end-to-end with dummy invoice
5. Prepare onboarding checklist

**Time required:** 20 minutes per client

### Day 1: Onboarding Call (10 minutes)

Follow CLIENT ONBOARDING SOP (Section E in HANDOVER-SOP.md):

1. Client logs in (2 min)
2. Connect email inbox (3 min)
3. Connect accounting system (3 min)
4. Set notification email (1 min)
5. Send test invoice (1 min)

**Success:** Test invoice appears in dashboard within 2 minutes.

**Failure:** Troubleshoot on call. If > 5 minutes, schedule follow-up call same day.

### Day 2-6: Client Forwards Real Invoices

**Client instructions:**

"Forward all invoices you receive this week to `[monitored inbox email]`. Continue your normal approval process in parallel so invoices still get paid. We'll compare results."

**You monitor:**
- n8n execution logs daily
- Exception rate (should be 10-30%)
- Any failed extractions (fix immediately)

**Daily check-in email (optional):**

Subject: Day [X] Update — Touchless Ops Pilot

Hi [Name],

Quick update on your pilot:

- **Invoices processed:** [X]
- **Auto-approved:** [Y] ([Z]%)
- **Exceptions flagged:** [N]
- **Time saved (estimate):** [hours] hours

Everything running smoothly. Any questions, just reply.

Thanks,
[Your name]

### Day 7: Results Call (15 minutes)

**Show client:**

1. Dashboard summary stats
2. Exception rate (compare to target 10-30%)
3. Sample auto-approved invoice (show it went to Xero/QBO)
4. Calculate time saved:
   - Auto-approved invoices: [X]
   - Time per invoice (manual): 0.15 hours (9 minutes)
   - Total time saved: [X * 0.15] hours
   - **Value:** [hours * $50/hour] = $[amount] saved in one week

5. Project monthly savings:
   - Weekly invoices: [X]
   - Monthly invoices (average): [X * 4.3]
   - Monthly time saved: [hours * 4.3]
   - **Monthly value:** $[amount]

**Ask:**

"Does this match your expectations? Would this be valuable ongoing?"

**If yes:**
- Move to pricing conversation
- Send contract same day
- Continue pilot → Convert to paid (no interruption)

**If no (or hesitation):**
- Ask: "What would make this a clear win for you?"
- Address concerns
- Offer 7-day extension if needed

---

## PRICING MODEL

### Tiered Subscription Pricing

**Starter: $199/month**
- Up to 100 invoices per month
- Email monitoring (Gmail or Microsoft 365)
- AI extraction
- PO matching (Xero or QuickBooks)
- Dashboard access (3 users)
- Email notifications
- Weekly summary report
- Support: Email (48-hour response)

**Growth: $499/month** (Recommended)
- Up to 500 invoices per month
- Everything in Starter
- Slack + Microsoft Teams notifications
- Dashboard access (10 users)
- Custom matching rules
- API access (future)
- Support: Email (24-hour response)

**Enterprise: Custom (Starting $1,200/month)**
- Unlimited invoices
- Everything in Growth
- Multi-entity support
- NetSuite integration
- Custom integrations
- Dedicated success manager
- Support: Priority (4-hour response)
- Quarterly business reviews

### Pricing Tiers Decision Tree

**Ask:** "How many invoices do you process monthly?"

- **50-100:** → Starter ($199/mo)
- **100-500:** → Growth ($499/mo)
- **500+:** → Enterprise (custom quote)

**Ask:** "Do you use Slack or Teams for alerts?"

- **Yes:** → Recommend Growth minimum
- **No:** → Starter okay

**Ask:** "Do you have multiple entities or complex accounting?"

- **Yes:** → Enterprise
- **No:** → Growth

### Overage Handling

If client exceeds tier limit:

**Option 1: Soft cap (recommended for first 3 months)**
- Process all invoices
- Email client: "You processed [X] invoices this month (limit: [Y]). Consider upgrading to [next tier]."
- Upgrade on renewal

**Option 2: Hard cap**
- Stop processing at limit
- Email client: "Invoice limit reached. Upgrade now or wait until next month."
- Risk: Client frustrated

**Recommendation:** Use soft cap. Builds goodwill. Upgrade conversation easier.

### Annual Discount

- Monthly: Full price
- Annual (prepay): 15% discount
- Annual (invoiced quarterly): 10% discount

**Example:**
- Growth: $499/mo = $5,988/year
- Annual prepay: $5,089/year (save $899)

---

## ROI CALCULATOR (FOR SALES CALLS)

### Formula

**Time saved per invoice:** 0.15 hours (9 minutes)

**Manual process:**
1. Open email (30 sec)
2. Download PDF (30 sec)
3. Open accounting system (30 sec)
4. Create bill/invoice entry (3 min)
5. Enter line items (2 min)
6. Match to PO (1 min)
7. Attach PDF (30 sec)
8. Submit for approval (30 sec)
9. Approve (30 sec)

**Total:** 9 minutes (0.15 hours)

**Automated process:**
1. Email arrives
2. System processes in background
3. User clicks "Approve" in dashboard (30 sec)

**Total:** 30 seconds (0.0083 hours)

**Time saved:** 8.5 minutes per invoice (0.142 hours)

**Use conservative estimate:** 0.15 hours to account for exceptions.

### ROI Calculation (Example)

**Client:** 200 invoices/month, $499/mo Growth plan

**Auto-approval rate:** 75% (conservative)
- Auto-approved: 150 invoices
- Manual review: 50 invoices

**Time saved:**
- Auto-approved: 150 * 0.15 hours = 22.5 hours
- Manual review (still faster): 50 * 0.05 hours = 2.5 hours
- **Total:** 25 hours/month

**Value:**
- Time saved: 25 hours
- Hourly rate: $50 (AP person)
- **Monthly value:** $1,250

**ROI:**
- Cost: $499/month
- Value: $1,250/month
- **Net savings: $751/month**
- **ROI: 150%**

**Payback period:** Immediate (saves more than it costs)

### ROI Presentation (Sales Deck Slide)

**Slide:**

**Stop Wasting Time on Invoice Data Entry**

Current state:
- 200 invoices per month
- 9 minutes per invoice
- **30 hours wasted monthly**
- **Cost: $1,500/month** (@ $50/hour)

With Touchless Ops Triage:
- 75% auto-processed (zero touch)
- 25% quick review (30 seconds)
- **5 hours monthly**
- **Cost: $499/month** (Growth plan)

**Savings: $1,001/month | ROI: 200%**

---

## OBJECTION HANDLING

### Objection: "Too expensive"

**Response:**

"I understand. Let's look at what you're spending now.

You process [X] invoices per month. At 9 minutes each, that's [hours] hours of AP time monthly. At $50/hour, you're spending $[amount] just on data entry.

Our [tier] plan costs $[price], and saves [hours] hours per month. That's a net savings of $[amount] every month.

Think of it as saving [X]% of your AP costs while getting invoices processed faster and more accurately.

Does that change how you view the investment?"

### Objection: "We'll just hire someone cheaper"

**Response:**

"You could. Let's compare:

**Hiring part-time AP person:**
- Cost: $20/hour * 20 hours/month = $400/month
- Plus: Benefits, training, turnover risk, management time
- Issue: Still manual data entry (slow, error-prone)

**Touchless Ops Triage:**
- Cost: $499/month
- Zero management overhead
- Processes invoices 24/7 (even weekends)
- No errors on auto-approved invoices
- Scales instantly (200 or 500 invoices, same cost)

Plus, you keep your AP person for high-value work (vendor relationships, payment optimization, reporting) instead of data entry.

Which sounds better for your business?"

### Objection: "Our accounting system already does this"

**Response:**

"That's great! Which feature in [Xero/QuickBooks] are you using?

[They usually mention bill pay or OCR scanning]

I see. That requires you to:
1. Log into the system
2. Upload invoices manually
3. Review and correct OCR errors
4. Match to POs one by one

Our system:
1. Monitors your email automatically
2. Extracts data with GPT-4 (99% accuracy)
3. Matches POs in seconds
4. Pushes to [Xero/QuickBooks] automatically

You only touch exceptions (10-30%). Everything else happens while you sleep.

Want to compare the time savings in a pilot?"

### Objection: "What if AI makes a mistake?"

**Response:**

"Smart question. Here's how we prevent that:

1. **Nothing auto-pays.** Invoices push to your accounting system as drafts. Your existing approval workflow still happens. We just eliminate data entry.

2. **Low-confidence matches flagged.** If our match confidence is < 80%, we flag it for human review. You see exactly why it was flagged.

3. **Audit trail.** Every action logged. You can see exactly what was extracted, what was matched, and why.

4. **You're always in control.** Kill switch pauses everything instantly if needed.

In 6 months of pilots, we've had zero incorrect payments. Clients catch exceptions before payment (because we flag them).

The risk isn't AI mistakes. The risk is continuing to waste 30 hours per month on manual data entry.

Make sense?"

### Objection: "We need to think about it"

**Response:**

"Totally fair. What specifically do you need to think through?

[Listen for real concern]

Here's what I suggest:

Let's do the 7-day free pilot. You'll process real invoices, see real time savings, and know exactly whether this works for you. No commitment, no credit card.

If it doesn't save you 20+ hours per month, we part as friends.

If it does, we move forward.

Either way, you have data instead of guesswork.

Can we schedule the 10-minute kickoff call for [day]?"

---

## CONVERSION STRATEGY (PILOT → PAID)

### During Pilot

**Day 1:** Send welcome email with login credentials
**Day 2:** Send "First 24 hours" update email
**Day 4:** Send mid-point check-in email
**Day 6:** Schedule "Results Call" for Day 7 or 8
**Day 7:** Results call (show ROI)
**Day 7 (after call):** Send contract if client ready

### Results Call Script

**Opening:**

"Thanks for taking the time. Let's review your pilot results.

[Share screen showing dashboard]

Over 7 days, you forwarded [X] invoices. Here's what happened:

- **Auto-processed:** [Y] invoices ([Z]% of total)
- **Flagged for review:** [N] invoices
- **Time saved:** [hours] hours this week alone

[Click into a sample auto-approved invoice]

See this one? $1,250 from Acme Corp. System extracted it, matched PO-12345, pushed to Xero, done. You didn't touch it. 9 minutes saved.

Multiply that by [Y] invoices per month, and you're saving [monthly hours] hours every month.

At $50/hour, that's $[monthly value] in saved time. Every month.

Our Growth plan costs $499/month. Net savings: $[net savings] per month.

**Question:** Based on what you've seen, does this solve your invoice processing problem?"

**If yes:**

"Perfect. I'll send over a contract today. You can start immediately—no interruption from the pilot. Your invoices will keep processing while we finalize paperwork.

Payment options: Monthly or annual (save 15% with annual prepay).

Which works better for you?"

**If hesitation:**

"I hear you. What would make this a clear yes for you?"

[Listen, address concern]

"How about this: We extend the pilot another 7 days, no charge. You process more invoices, build more confidence. Fair?"

### Contract Send (Same Day)

**Email:**

Subject: Touchless Ops Triage - Contract & Next Steps

Hi [Name],

Great call today! Excited to make invoice processing painless for [Company].

**Attached:**
- Service agreement (Growth plan, $499/month, monthly billing)
- Getting Started Guide (next steps after signing)

**To get started:**
1. Sign contract (DocuSign link below)
2. We keep processing invoices (no interruption)
3. First invoice: [Date] for $499
4. You save 25+ hours this month

Questions? Just reply or call me: [phone]

Thanks,
[Your name]

**DocuSign link:** [link]

### Contract Terms

**Service Agreement:**

- **Term:** Month-to-month (can cancel with 30 days notice)
- **Billing:** Monthly, billed in advance on 1st of month
- **Included:** [Invoice count] invoices, [users] users, [features]
- **Overage:** First 20% overage included. Above that: $1 per invoice.
- **Setup fee:** None (waived for pilot participants)
- **Data:** Client owns all data. Exported on request.
- **Cancellation:** 30 days notice. No penalty.
- **Support:** [Response time] via email/Slack

**First invoice:**
- Prorated for remainder of month
- Example: Sign on Dec 15 → First invoice $250 (half month) → Next invoice Jan 1 $499

---

## SUCCESS METRICS (TRACK FOR EACH CLIENT)

### Pilot Success Metrics

- **Auto-approval rate:** Target 70%+
- **Processing time:** Target < 5 minutes
- **Extraction accuracy:** Target 95%+
- **Client satisfaction:** "Would you recommend?" (Yes/No)
- **Conversion rate:** % of pilots that convert to paid

### Ongoing Client Metrics

- **Monthly invoice volume:** Track for overage management
- **Exception rate:** Should decrease over time (10-30% → 5-15%)
- **Time to approve exceptions:** Track in dashboard (client behavior)
- **Support tickets:** Target < 1 per client per month
- **Churn rate:** Target < 5% monthly

### Sales Metrics

- **Pilot-to-paid conversion:** Target 60%+
- **Average deal size:** Track tier distribution
- **Sales cycle:** Target 14 days (7-day pilot + 7-day decision)
- **CAC:** Customer acquisition cost (sales time + pilot cost)
- **LTV:CAC ratio:** Target 3:1 or better

---

## PRICING ADJUSTMENTS (FUTURE)

### When to Raise Prices

- **Market fit proven:** 50+ paying clients, < 5% churn
- **Feature expansion:** NetSuite support, multi-entity, custom integrations
- **Increased value:** Higher auto-approval rates, faster processing

### Grandfather Existing Clients

When raising prices:
- Current clients keep current price for 12 months
- Email 60 days before increase: "Price increasing to $X on [date]. You're locked in at $Y until [date]."
- Option to lock in current price with annual prepay

---

**End of pilot & pricing SOP. Use this to qualify leads, scope pilots, demonstrate ROI, and close deals.**
