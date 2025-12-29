# 44 AUTOMATION — TOUCHLESS OPS TRIAGE
# BUILD, DEPLOY & CLIENT HANDOVER SOP

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Owner:** 44 Automation
**Purpose:** Single source of truth for building, deploying, and operating the Touchless Ops Triage product

---

## A. WHAT THIS PRODUCT DOES

### Problem It Solves

Businesses receive 50-500 invoices per month via email. Each invoice requires:
- Manual opening and downloading
- Data entry into accounting systems
- PO matching and verification
- Approval workflows
- Exception handling

This wastes 10-30 hours per month per business.

### What This Product Does

Automatically processes invoice emails from receipt to accounting system without human intervention.

**Flow:**
1. Email arrives with invoice PDF
2. System extracts invoice data (vendor, amount, PO number)
3. System matches against accounting records
4. High-confidence matches → Auto-approve → Push to accounting
5. Low-confidence matches → Flag for human review
6. Humans review exceptions in clean dashboard
7. Weekly summary email sent to executives

### Who It's For

- Businesses processing 50+ invoices/month
- Using Xero, QuickBooks Online, or NetSuite
- Receiving invoices via Gmail or Microsoft 365
- Want to reduce manual data entry

### What "Done" Looks Like

- Client forwards invoices to monitored inbox
- 70-90% auto-process without human touch
- 10-30% flagged for review (anomalies, missing POs, amount mismatches)
- Dashboard shows: To Review / Matched / Paid
- Weekly email summarizes volume, trends, exceptions
- Client spends 2-5 hours/month instead of 10-30 hours

---

## B. FOLDER & ASSET LAYOUT

Product organized in 4 folders:

```
/backend          → Single server file (all API code)
/n8n              → 7 workflow JSON files + SOP
/lovable          → Front-end build spec
/docs             → This handover SOP + deployment guide
```

### What Goes Where

**`/backend`**
- `server.ts` - Single Node.js TypeScript file containing entire backend
- No other files needed
- Run with: `npm install && npx ts-node server.ts`

**`/n8n`**
- 7 importable workflow JSON files
- `N8N-WORKFLOWS-SOP.md` - Import and setup guide
- Import workflows into n8n cloud or self-hosted instance

**`/lovable`**
- Build spec document (not code)
- Describes pages, components, API calls
- Use to build front-end in Lovable.dev

**`/docs`**
- This handover SOP (master document)
- Deployment guide
- Testing checklist
- Pilot & pricing guide

---

## C. BUILD SOP — FROM ZERO TO WORKING

Follow these steps in exact order.

### Step 1: Create Backend File

1. Create folder: `mkdir touchless-ops-backend && cd touchless-ops-backend`
2. Initialize Node project: `npm init -y`
3. Install dependencies:

```bash
npm install express pg bcrypt jsonwebtoken cors dotenv
npm install --save-dev typescript @types/express @types/pg @types/bcrypt @types/jsonwebtoken @types/cors @types/node ts-node
```

4. Copy `/backend/server.ts` into this folder
5. File is now ready to run

### Step 2: Set Environment Variables

Create `.env` file in same folder:

```env
PORT=3000
DATABASE_URL=postgresql://localhost:5432/touchless_ops
JWT_SECRET=REPLACE_WITH_RANDOM_64_CHAR_STRING
NODE_ENV=development
```

**Generate JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste output into `JWT_SECRET`.

### Step 3: Install & Start PostgreSQL

**Option A: Local PostgreSQL**

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb touchless_ops

# Linux
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb touchless_ops
```

**Option B: Use Docker**

```bash
docker run --name touchless-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=touchless_ops -p 5432:5432 -d postgres:15
```

Update `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/touchless_ops
```

### Step 4: Start Backend Server

```bash
npx ts-node server.ts
```

**Expected output:**

```
🚀 Starting Touchless Ops Triage Backend...
✅ Database schema initialized
✅ Demo data seeded
   Email: admin@demo.44automation.com
   Password: demo123
✅ Server running on port 3000
   Health check: http://localhost:3000/health
   Environment: development
```

If errors:
- Check PostgreSQL running: `psql -h localhost -U postgres -d touchless_ops`
- Verify `.env` file exists
- Verify dependencies installed: `npm list`

### Step 5: Test Backend

Open new terminal:

```bash
# Health check
curl http://localhost:3000/health

# Expected: {"status":"healthy","timestamp":"2025-12-29T..."}

# Login with demo account
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.44automation.com",
    "password": "demo123",
    "domain": "demo.44automation.com"
  }'

# Expected: {"token":"eyJhbGc...", "user":{...}}
```

Copy the `token` value. You'll need it for authenticated requests.

Test authenticated endpoint:

```bash
curl http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: {"invoices":[...], "total":3}
```

If successful, backend is working.

### Step 6: Install n8n

**Option A: Cloud (Recommended for Clients)**

1. Go to n8n.cloud
2. Sign up for account
3. Create workspace
4. Skip to Step 7

**Option B: Self-Hosted**

```bash
npm install -g n8n

# Start n8n
n8n start

# Opens at http://localhost:5678
```

Create account when prompted.

### Step 7: Import n8n Workflows

Follow exact steps in `/n8n/N8N-WORKFLOWS-SOP.md`.

**Quick version:**

1. Import all 7 JSON files in order (1-7)
2. Add credentials for:
   - Gmail OAuth2 OR Microsoft 365 OAuth2
   - OpenAI API
   - Xero OAuth2 OR QuickBooks OAuth2
   - SMTP (for notifications)
3. Set environment variables in each workflow
4. Activate workflows 1-7
5. Test with sample invoice email

Expected result: Email triggers extraction → matching → invoice created in backend.

### Step 8: Connect Email Inbox

**Gmail:**

1. Create dedicated inbox: `invoices@clientdomain.com`
2. Enable IMAP
3. Enable "Less secure app access" OR create OAuth app
4. Connect in n8n Workflow 1
5. Test: Send invoice to inbox → Check n8n executions

**Microsoft 365:**

1. Create shared mailbox: `invoices@clientdomain.com`
2. Grant app permissions in Azure AD
3. Connect in n8n Workflow 2
4. Test: Send invoice → Check executions

### Step 9: Connect Accounting System

**Xero:**

1. Go to developer.xero.com
2. Create app: "Touchless Ops Triage"
3. Set OAuth redirect to n8n webhook URL
4. Copy Client ID and Secret
5. Add credential in n8n
6. Authorize access
7. Test: Run Workflow 4 manually → Verify PO search works

**QuickBooks Online:**

1. Go to developer.intuit.com
2. Create app
3. Add OAuth redirect
4. Copy keys
5. Add credential in n8n
6. Authorize
7. Test: Run Workflow 4 → Verify PO search

### Step 10: Confirm End-to-End Flow

1. Send test invoice email to monitored inbox
2. Invoice must include:
   - Valid vendor name
   - Total amount
   - PO number (that exists in accounting system)
3. Wait 2 minutes
4. Check n8n executions:
   - Workflow 1 or 2: Green (email received)
   - Workflow 3: Green (extraction completed)
   - Workflow 4: Green (matching completed)
   - Workflow 6: Green (notification sent)
5. Check backend:

```bash
curl http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: New invoice with status "pending" or "exception"
```

6. If all green: Build complete

If any red:
- Click execution → Read error
- Fix issue (credential, environment variable, data format)
- Click "Retry Execution"
- Repeat until green

---

## D. LOVABLE FRONT-END BUILD SOP

Use Lovable.dev to build the dashboard.

### Step 1: Create Lovable Project

1. Go to lovable.dev
2. Sign in
3. Click **New Project**
4. Name: "Touchless Ops Triage"
5. Select: "Blank React project with Tailwind"

### Step 2: Build Pages (In Order)

Create these 5 pages using Lovable's AI builder.

#### Page 1: Login

**Prompt to Lovable:**

```
Create a login page with:
- Email input
- Password input
- Domain input (subdomain, e.g., "acme" for acme.44automation.com)
- "Login" button
- "Send magic link" button

On login:
- POST to /api/auth/login with {email, password, domain}
- Store returned token in localStorage
- Redirect to /dashboard

On magic link:
- POST to /api/auth/magic-link with {email, domain}
- Show success message: "Check your email"

Style: Clean, professional, centered form on white background.
```

**Expected result:** Login page at `/login`

**Test:**
- Enter: admin@demo.44automation.com / demo123 / demo.44automation.com
- Click Login
- Expect: Redirect to dashboard

#### Page 2: Dashboard

**Prompt to Lovable:**

```
Create a dashboard page with:

Top row: 4 stat cards
- To Review (count + total amount)
- Matched (count + total)
- Approved (count + total)
- Paid (count + total)

Each card: Large number on top, label below, currency amount below that.

Below cards: 3 tabs
- Tab 1: "To Review" - Table of invoices with status = "pending" or "exception"
- Tab 2: "Matched" - Table of invoices with status = "approved"
- Tab 3: "Paid" - Table of invoices with status = "paid"

Table columns:
- Invoice # (clickable, links to /invoice/:id)
- Vendor
- Amount
- Date
- Status badge (color-coded: yellow=pending, red=exception, green=approved, blue=paid)
- Actions: "View" button

On page load:
- GET /api/dashboard/summary (for stat cards)
- GET /api/invoices?status=pending (for To Review tab)

Style: Modern dashboard, cards with shadows, clean table.
```

**Expected result:** Dashboard at `/dashboard`

**Test:**
- Navigate to /dashboard
- See 4 stat cards with demo data
- See table with 3 demo invoices
- Click invoice number → Navigates to detail page

#### Page 3: Invoice Detail View

**Prompt to Lovable:**

```
Create invoice detail page at /invoice/:id

Page shows:
- Back button (← Dashboard)
- Invoice header: Invoice #, Status badge, Vendor name
- Details section (2 columns):
  Left:
  - Vendor
  - Invoice Number
  - Invoice Date
  - Due Date
  - Total Amount

  Right:
  - PO Number
  - Match Confidence (% with color bar)
  - Exception Reason (if any, red text)
  - Accounting System

- Line Items table (if available)
  Columns: Description, Quantity, Unit Price, Amount

- Action buttons (bottom):
  - "Approve" (green, only if status = pending or exception)
  - "Reject" (red)
  - "View Source Email" (gray, opens email URL)

On Approve:
- POST /api/invoices/:id/approve
- Show success toast
- Update status badge to "Approved"
- Disable buttons

On Reject:
- Prompt for reason (modal)
- POST /api/invoices/:id/reject with {reason}
- Show success toast
- Update status to "Rejected"

On page load:
- GET /api/invoices/:id

Style: Clean detail view, clear sections, prominent action buttons.
```

**Expected result:** Invoice detail at `/invoice/:id`

**Test:**
- Click invoice from dashboard
- See full invoice details
- Click "Approve"
- Expect: Success message, status changes to "Approved"
- Check backend: Invoice status updated

#### Page 4: Settings

**Prompt to Lovable:**

```
Create settings page with sections:

1. Tenant Settings
   - Display: Tenant name, domain (read-only)
   - Accounting system (Xero / QuickBooks / NetSuite, dropdown)
   - Save button

2. Users
   - Table: Email, Role, Created Date
   - "Add User" button → Opens modal
   - Modal: Email input, Role dropdown (user/admin), "Create" button
   - On create: POST /api/users with {tenantId, email, role}

3. Notification Channels
   - Email: SMTP settings (read-only, configured in n8n)
   - Slack: Webhook URL input, Test button
   - Teams: Webhook URL input, Test button

On save:
- PATCH /api/tenants/:id with updated settings

Style: Form sections with clear headings, clean inputs.
```

**Expected result:** Settings page at `/settings`

**Test:**
- Navigate to /settings
- See tenant info
- Click "Add User"
- Enter test email
- Click Create
- Check backend: User created

#### Page 5: Outreach Landing Page

**Prompt to Lovable:**

```
Create public landing page at / (no login required)

Sections:
1. Hero
   - Headline: "Stop Manually Entering Invoices"
   - Subheadline: "Automated invoice processing from email to accounting. 90% touchless."
   - CTA button: "Start 7-Day Pilot" → Links to /pilot

2. How It Works (3 steps with icons)
   - Step 1: Forward invoices to our inbox
   - Step 2: AI extracts and matches to POs
   - Step 3: Auto-approve or flag for review

3. Pricing (3 tiers)
   - Starter: $199/mo, up to 100 invoices
   - Growth: $499/mo, up to 500 invoices
   - Enterprise: Custom, unlimited

4. ROI Calculator
   - Input: Invoices per month (slider)
   - Output: Hours saved, Cost saved
   - Formula: hours = invoices * 0.15, cost = hours * $50

5. CTA Section
   - "Ready to Save 20 Hours/Month?"
   - Button: "Start Free Pilot"

Style: Modern SaaS landing page, professional, trustworthy.
```

**Expected result:** Landing page at `/`

**Test:**
- Visit / (logged out)
- See hero, how it works, pricing
- Use ROI calculator
- Click CTA → Navigates to /pilot (you'll create form separately if needed)

### Step 3: Configure API Base URL

In Lovable project settings:

1. Click **Settings** → **Environment Variables**
2. Add:
   - `VITE_API_BASE_URL` = `http://localhost:3000`
3. Save
4. Rebuild project

All API calls use this base URL.

### Step 4: Deploy to Lovable Hosting

1. Click **Deploy** button in Lovable
2. Lovable builds and hosts automatically
3. Get URL: `https://your-project.lovable.app`
4. Update backend CORS settings to allow this domain

In `server.ts`, add:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-project.lovable.app']
}));
```

5. Restart backend
6. Test: Login from deployed URL → Dashboard loads

### Step 5: Custom Domain (Optional)

1. In Lovable: Settings → Custom Domain
2. Enter: `app.clientdomain.com`
3. Follow DNS instructions
4. Wait for DNS propagation (10 minutes)
5. Update backend CORS with new domain
6. Test: Login from custom domain

---

## E. CLIENT ONBOARDING SOP (10-MINUTE SETUP)

Use this checklist for each new client.

### Pre-Onboarding (You Do This)

1. Create tenant in backend:

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "domain": "acme.44automation.com",
    "settings": {"accountingSystem": "xero"}
  }'

# Returns: {"id": 2, "name": "Acme Corp", ...}
```

2. Create admin user:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 2,
    "email": "admin@acmecorp.com",
    "password": "TempPassword123!",
    "role": "admin"
  }'
```

3. Send credentials to client:
   - Email: admin@acmecorp.com
   - Password: TempPassword123!
   - Domain: acme.44automation.com
   - Login URL: https://app.44automation.com/login

### Onboarding Call with Client (10 Minutes)

**Minute 0-2: Login**

1. Client opens login URL
2. Enters credentials
3. Logs in successfully
4. Sees empty dashboard

**Minute 2-5: Mailbox Access**

Ask client:

"What email address do you want invoices sent to?"

Options:
- **Option A:** Client creates new mailbox: `invoices@acmecorp.com`
- **Option B:** Client forwards from existing mailbox to your monitored inbox

For Option A:
1. Client creates mailbox
2. Client grants you access (shares credentials OR OAuth)
3. You configure Workflow 1 or 2 with this mailbox
4. Test: Send invoice → Confirm received

For Option B:
1. Client creates forwarding rule: Forward all from vendors → `acme-invoices@44automation.com`
2. You create filter in your monitored inbox
3. Test: Send invoice → Confirm received

**If this fails:**
- Check mailbox credentials
- Verify forwarding rule active
- Re-test with client on the call

**Minute 5-7: Accounting Tokens**

Ask client:

"Which accounting system do you use?"

**Xero:**
1. Client logs into Xero
2. Goes to Settings → Connected Apps
3. Clicks "Authorize" on "Touchless Ops Triage" app (you pre-created this)
4. Approves permissions
5. You confirm token received in n8n
6. Test: Run Workflow 4 → Search for PO → Confirm works

**QuickBooks:**
1. Client logs into QuickBooks
2. Goes to Apps → Find Apps
3. Searches "Touchless Ops Triage" (your app)
4. Connects
5. You confirm token in n8n
6. Test: Search PO → Confirm works

**If this fails:**
- Client re-authorizes
- Check app permissions in accounting system settings
- Re-test

**Minute 7-9: Notification Channels**

Ask client:

"Where do you want exception notifications?"

Options:
- Email (always required)
- Slack
- Microsoft Teams

**Email:**
- Client provides: `finance@acmecorp.com`
- You update `REPORT_RECIPIENT_EMAIL` in Workflow 7
- Test: Queue notification → Confirm received

**Slack (optional):**
1. Client creates Slack channel: `#invoice-alerts`
2. Client adds your Slack app to channel
3. You configure Workflow 6 with channel ID
4. Test: Send notification → Confirm received in Slack

**Teams (optional):**
1. Client creates Teams channel
2. Client adds incoming webhook
3. Client shares webhook URL
4. You configure in Workflow 6
5. Test: Send notification → Confirm received

**Minute 9-10: Test Invoice**

1. Ask client to forward real invoice from last week
2. Invoice must have PO number
3. Wait 60 seconds
4. Refresh dashboard together
5. Invoice appears in "To Review"
6. Click invoice → See details
7. Click "Approve" (if confident match)
8. Check accounting system → Invoice pushed

**If successful:** Onboarding complete

**If failed:**
- Check n8n execution log
- Identify failure point (extraction / matching / creation)
- Fix on call
- Re-test
- If complex issue: "I'll fix this and email you in 1 hour"

### Post-Onboarding (Send Email)

Email client:

**Subject:** Touchless Ops Triage - You're Live!

**Body:**

Hi [Name],

Your invoice automation is now live.

**What to do:**
- Forward invoices to: [inbox email]
- Check dashboard daily: https://app.44automation.com
- Review exceptions (10-30% of invoices)
- Approve matched invoices

**What happens automatically:**
- Emails monitored every minute
- Invoices extracted and matched
- High-confidence matches auto-approved
- Exceptions flagged for your review
- Weekly summary sent Monday mornings

**Support:**
- Dashboard issues: support@44automation.com
- Billing questions: billing@44automation.com

You'll receive your first weekly summary next Monday.

Thanks,
44 Automation Team

---

## F. WEEKLY OPERATIONS SOP

### What Runs Automatically (No Human Action)

**Every Minute:**
- Workflows 1 & 2: Poll email inboxes for new invoices

**Every 2 Minutes:**
- Workflow 6: Send pending notifications

**Every 5 Minutes:**
- Workflow 5: Refresh dashboard cache

**Every Monday 9 AM:**
- Workflow 7: Generate and send weekly summary

**When Invoice Received:**
- Workflow 3: Extract data
- Workflow 4: Match to PO
- Workflow 6: Send notification if exception

### What Humans Review (Client)

**Daily (2-5 minutes):**
1. Login to dashboard
2. Check "To Review" tab
3. For each exception:
   - Click invoice
   - Read exception reason
   - Approve if reasonable
   - Reject if incorrect
4. Logout

**Weekly (10 minutes, Monday):**
1. Read weekly summary email
2. Note trends:
   - Exception rate increasing? → Investigate vendors
   - New vendors? → Add to approved list
   - Amount mismatches? → Check PO process
3. Forward summary to CFO/controller

### What Humans Review (44 Automation)

**Weekly (30 minutes):**
1. Review all client dashboards
2. Check for:
   - Exception rate > 30% → Investigate
   - Failed executions → Fix
   - Credential expiring → Renew
3. Email clients with high exception rates

**Monthly (1 hour):**
1. Review metrics across all clients
2. Identify patterns
3. Improve matching logic if needed
4. Update workflows with fixes

### What Emails Go Out

**Immediate (when exception occurs):**
- To: Client finance email
- Subject: "Invoice Exception: [Vendor] - [Amount]"
- Body: Exception reason, link to dashboard
- Sent by: Workflow 6

**Weekly (Monday 9 AM):**
- To: Client finance email
- Subject: "Weekly Invoice Processing Report"
- Body: AI-generated summary with metrics
- Sent by: Workflow 7 → Workflow 6

**Monthly (1st of month):**
- Manual email from 44 Automation
- Subject: "Monthly Performance Report"
- Body: Metrics, ROI achieved, recommendations

### What Metrics Matter

Track these in weekly reports:

1. **Processing Volume:** Total invoices received
2. **Auto-Approval Rate:** % processed without human touch (target: 70-90%)
3. **Exception Rate:** % flagged for review (target: 10-30%)
4. **Top Exception Reasons:**
   - No PO found
   - Amount mismatch
   - Vendor not recognized
5. **Average Processing Time:** Email received → Pushed to accounting (target: < 5 minutes)
6. **Time Saved:** (Auto-approved invoices * 0.15 hours) = hours saved

**Good Performance:**
- Exception rate 10-20%
- Processing time < 5 minutes
- Zero failed executions

**Poor Performance:**
- Exception rate > 40%
- Processing time > 15 minutes
- Multiple failed executions

If poor performance: Review n8n logs → Fix root cause → Re-test.

---

## G. ROLLBACK & KILL SWITCH SOP

### Pause All Processing (Emergency)

**When to use:**
- Critical bug discovered
- Accounting system down
- Duplicate invoices being created

**How to pause:**

1. Login to n8n
2. Go to **Workflows**
3. Toggle OFF:
   - Workflow 1 (Gmail Listener)
   - Workflow 2 (Microsoft 365 Listener)
4. All workflows: Status = "Inactive"
5. New emails ignored (but not deleted)
6. Existing executions complete

**Result:**
- No new invoices enter system
- Dashboard shows last state
- Notifications still send (for already-processed items)

**Resume:**
1. Fix root cause
2. Toggle ON: Workflow 1 and/or 2
3. Workflows resume polling
4. Backlog processed (all emails since pause)

### Stop Billing Impact

**If invoices pushed to accounting incorrectly:**

1. Pause workflows (above)
2. Login to accounting system (Xero/QBO)
3. Search for invoices created today
4. Void incorrect invoices
5. Fix matching logic in Workflow 4
6. Re-activate workflows
7. Re-process: Forward emails again → Correct matches

**Prevention:**
- Always test with 3 invoices before going live
- Use demo accounting company for testing
- Never connect production accounting during testing

### Rollback Backend Code

**If backend bug deployed:**

1. Stop backend server: `Ctrl+C`
2. Git checkout previous version:

```bash
cd touchless-ops-backend
git log --oneline  # Find last good commit
git checkout abc1234  # Replace with commit hash
```

3. Restart server: `npx ts-node server.ts`
4. Verify health: `curl http://localhost:3000/health`
5. Fix bug in separate branch
6. Test thoroughly
7. Deploy fixed version

### Rollback n8n Workflow

**If workflow change breaks processing:**

1. Open workflow in n8n
2. Click **Versions** (top right)
3. Select previous version
4. Click **Restore**
5. Click **Save**
6. Re-activate workflow
7. Test with sample invoice

### Data Recovery

**If invoices lost:**

Invoices never deleted. Query database:

```sql
-- Find all invoices from today
SELECT * FROM invoices WHERE created_at >= CURRENT_DATE;

-- Find failed email processing
SELECT * FROM email_inbox WHERE processed = FALSE;

-- Re-process failed emails
UPDATE email_inbox SET processed = FALSE WHERE id = 123;
```

Re-run Workflow 3 manually with email ID.

**If database corrupted:**

Restore from backup (if configured):

```bash
psql touchless_ops < backup-2025-12-28.sql
```

**Prevention:**
- Daily database backups (automated)
- 7-day retention minimum
- Test restore monthly

---

## H. TROUBLESHOOTING (NON-TECHNICAL)

### Problem: Invoice not appearing in dashboard

**Possible causes:**

1. **Email not received**
   - Check: Forwarding rule active?
   - Check: Email subject contains "invoice" or "bill"?
   - Fix: Adjust subject filter in Workflow 1/2
   - Re-send invoice

2. **No attachment**
   - Check: Email has PDF attached?
   - Fix: Attach PDF
   - Re-send

3. **Extraction failed**
   - Check: n8n Workflow 3 execution log
   - If error: "Could not extract vendor name"
   - Means: PDF not readable (scanned image, encrypted)
   - Fix: Use different PDF or enable OCR

4. **Workflow paused**
   - Check: n8n workflows show "Active"?
   - If gray: Toggle Active ON
   - Re-test

**Quick fix:**
- Re-send email
- Wait 2 minutes
- Refresh dashboard
- If still missing: Check n8n execution log

### Problem: All invoices going to exceptions

**Possible causes:**

1. **No POs in accounting system**
   - Check: Do POs exist for these vendors?
   - Fix: Create POs in accounting system
   - Or: Lower match threshold to allow no-PO invoices

2. **PO numbers don't match**
   - Invoice says: "PO-12345"
   - Accounting says: "12345"
   - Fix: Adjust matching logic (strip "PO-" prefix)
   - Update Workflow 4 code

3. **Accounting system disconnected**
   - Check: Xero/QBO credential status in n8n
   - If red: Re-authorize
   - Re-test

**Quick fix:**
- Review exception reasons in dashboard
- Identify pattern (all same vendor? all same reason?)
- Fix root cause
- Manually approve exceptions
- Future invoices auto-approve

### Problem: Duplicate invoices created

**Possible causes:**

1. **Email forwarded twice**
   - Check: Client forwarded same email manually
   - Result: Two invoices created
   - Fix: Delete duplicate in accounting system
   - Tell client: Don't manually forward (automation handles it)

2. **Workflow ran twice**
   - Check: n8n execution log shows duplicate runs
   - Fix: Database constraint prevents duplicates (by message_id)
   - Only first creates invoice, second skips
   - Safe to ignore

**Quick fix:**
- Search accounting system for duplicate invoice numbers
- Void duplicate
- No code change needed (database prevents this)

### Problem: Weekly report not received

**Possible causes:**

1. **Wrong email address**
   - Check: Workflow 7 environment variable `REPORT_RECIPIENT_EMAIL`
   - Fix: Update to correct email
   - Save workflow
   - Manually run workflow to test

2. **Email in spam**
   - Check: Spam folder
   - Fix: Whitelist sender `notifications@44automation.com`
   - Add to safe senders

3. **Workflow not active**
   - Check: Workflow 7 status
   - Fix: Toggle Active ON

**Quick fix:**
- Manually run Workflow 7 (click "Execute Workflow")
- Check email inbox (including spam)
- If received: Workflow works, just needed manual trigger
- If not: Check Workflow 6 (notifications)

### Problem: Dashboard shows old data

**Possible causes:**

1. **Cache not refreshing**
   - Check: Workflow 5 last execution time
   - Should run every 5 minutes
   - If stale: Re-activate Workflow 5

2. **Backend down**
   - Check: http://localhost:3000/health
   - If no response: Restart backend
   - Refresh dashboard

**Quick fix:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- If still old: Check Workflow 5 active
- If still old: Restart backend

### Problem: "Invalid token" error when logging in

**Possible causes:**

1. **Token expired**
   - Tokens expire after 7 days
   - Fix: Login again (generates new token)

2. **JWT secret changed**
   - If backend restarted with different `JWT_SECRET`
   - All tokens invalid
   - Fix: All users re-login

**Quick fix:**
- Logout
- Login again
- Token refreshed

---

## I. NEXT STEPS AFTER READING THIS SOP

1. Follow Section C (Build SOP) to set up locally
2. Test end-to-end with 3 sample invoices
3. Confirm all workflows green in n8n
4. Build front-end in Lovable (Section D)
5. Deploy backend to production server (see DEPLOYMENT-SOP.md)
6. Onboard first pilot client (Section E)
7. Monitor weekly (Section F)
8. Review pilot results after 7 days
9. Convert to paid customer (see PILOT-PRICING-SOP.md)

---

## DOCUMENT CHANGE LOG

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-29 | 1.0 | Initial handover SOP created |

---

**End of handover SOP. Refer to supporting documents:**
- `/n8n/N8N-WORKFLOWS-SOP.md` - n8n workflow setup
- `/docs/DEPLOYMENT-SOP.md` - Production deployment guide
- `/docs/PILOT-PRICING-SOP.md` - Pilot program & pricing
- `/docs/TESTING-CHECKLIST.md` - QA checklist
- `/docs/AI-PROMPTS-SCHEMAS.md` - AI extraction prompts
