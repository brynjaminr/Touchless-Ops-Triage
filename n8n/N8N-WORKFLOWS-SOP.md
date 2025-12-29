# n8n WORKFLOWS — IMPORT & SETUP SOP

## OVERVIEW

This document explains how to import and configure all 7 n8n workflows for Touchless Ops Triage.

Import workflows in order (1-7). Each workflow depends on the previous ones being active.

---

## WORKFLOW 1: INBOUND EMAIL LISTENER (GMAIL)

**File:** `workflow-1-gmail-listener.json`

### Import Steps

1. Open n8n dashboard
2. Click **Workflows** → **Import from File**
3. Select `workflow-1-gmail-listener.json`
4. Click **Import**
5. Workflow appears in your workflow list

### Credentials Required

1. Click **Credentials** → **Add Credential**
2. Select **Gmail OAuth2**
3. Follow Google OAuth setup:
   - Go to Google Cloud Console
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Copy Client ID and Client Secret
   - Paste into n8n
   - Click **Connect**
   - Authorize access
4. Save credential as "Gmail Production"

### Environment Variables

Open workflow → Click **Settings** → **Environment**

Set these variables:

| Variable | Value | Example |
|----------|-------|---------|
| `TENANT_ID` | Your tenant ID from backend | `1` |
| `BACKEND_URL` | Backend API URL | `http://localhost:3000` |
| `WORKFLOW_ID_EXTRACTION` | ID of workflow 3 | `workflow-3-document-extraction` |

### Activate Workflow

1. Click **Active** toggle in top right
2. Workflow status changes to green "Active"
3. Confirm in execution log: "Workflow activated"

### Test Workflow

1. Send test email to configured Gmail inbox
2. Subject must contain "invoice" or "bill"
3. Attach a PDF invoice
4. Wait 60 seconds (poll interval)
5. Check **Executions** tab
6. Expect: Green checkmark, email stored in backend
7. If failed: Check error message → Verify credentials → Re-test

### Retry Logic

Built-in: 3 retries with 1-second delay on HTTP failures.

If email processing fails, check `/api/emails` endpoint for error details.

### Dead-Letter Handling

Failed emails marked with `processing_error` in database. Review via:

```bash
curl http://localhost:3000/api/emails?processed=false
```

---

## WORKFLOW 2: INBOUND EMAIL LISTENER (MICROSOFT 365)

**File:** `workflow-2-microsoft365-listener.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-2-microsoft365-listener.json`
3. Click **Import**

### Credentials Required

1. **Credentials** → **Add Credential**
2. Select **Microsoft Outlook OAuth2**
3. Setup:
   - Go to Azure Portal
   - Register new app
   - Add Mail.Read permission
   - Copy Application (client) ID
   - Create client secret
   - Paste into n8n
   - Click **Connect**
   - Sign in with Microsoft account
4. Save as "Microsoft 365 Production"

### Environment Variables

Same as Workflow 1:

| Variable | Value |
|----------|-------|
| `TENANT_ID` | Your tenant ID |
| `BACKEND_URL` | Backend URL |
| `WORKFLOW_ID_EXTRACTION` | Workflow 3 ID |

### Activate & Test

1. Toggle **Active**
2. Send test email to Microsoft 365 inbox
3. Subject must contain "invoice"
4. Attach PDF
5. Wait 60 seconds
6. Check **Executions**
7. Expect: Email stored successfully

### Use Case

Use this workflow if client uses Microsoft 365. Disable Workflow 1 (Gmail) if not needed.

---

## WORKFLOW 3: DOCUMENT EXTRACTION PIPELINE

**File:** `workflow-3-document-extraction.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-3-document-extraction.json`
3. Click **Import**

### Credentials Required

1. **Credentials** → **Add Credential**
2. Select **OpenAI API**
3. Enter OpenAI API key (get from platform.openai.com)
4. Save as "OpenAI Production"

### Environment Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Backend URL |
| `WORKFLOW_ID_MATCHING` | Workflow 4 ID |

### How It Works

1. Triggered by Workflow 1 or 2 (not standalone)
2. Receives email with attachment
3. Sends PDF to GPT-4 Vision API
4. Extracts invoice fields (vendor, amount, date, PO number)
5. Validates extraction (must have vendor name)
6. If valid → Triggers Workflow 4 (matching)
7. If invalid → Marks email as failed

### Test Workflow

1. Execute Workflow 1 or 2 with test invoice
2. Check **Executions** → Find extraction execution
3. Inspect extracted data:
   - vendorName: "Acme Corp"
   - totalAmount: 1250.00
   - invoiceNumber: "INV-12345"
4. If extraction empty → Check OpenAI API key → Verify PDF readable
5. Retry: Click **Retry Execution**

### Anti-Hallucination Rules

System prompt enforces:
- Only extract visible text
- Return valid JSON only
- Use exact schema
- Temperature set to 0.1 (low randomness)

### Retry Logic

2 retries with 2-second delay on API failures.

### Dead-Letter Handling

Failed extractions logged to `email_inbox.processing_error`.

Query failed items:

```bash
curl http://localhost:3000/api/emails?processed=false
```

Re-process manually: Click **Retry** in n8n executions list.

---

## WORKFLOW 4: MATCHING + ROUTING (XERO, QBO, NETSUITE)

**File:** `workflow-4-matching-routing.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-4-matching-routing.json`
3. Click **Import**

### Credentials Required

Choose ONE based on client's accounting system:

#### Option A: Xero

1. **Credentials** → **Add Credential** → **Xero OAuth2**
2. Setup:
   - Go to Xero Developer Portal
   - Create new app
   - Copy Client ID and Secret
   - Paste into n8n
   - Authorize
3. Save as "Xero Production"

#### Option B: QuickBooks Online

1. **Credentials** → **Add Credential** → **QuickBooks OAuth2**
2. Setup:
   - Go to QuickBooks Developer Portal
   - Create app
   - Copy keys
   - Paste into n8n
   - Authorize
3. Save as "QuickBooks Production"

#### Option C: NetSuite

Currently a stub. Returns "NetSuite integration pending" for all invoices.

To implement:
- Create NetSuite RESTlet
- Replace stub node with HTTP request to RESTlet
- Use SuiteTalk API credentials

### Environment Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Backend URL |
| `WORKFLOW_ID_NOTIFICATIONS` | Workflow 6 ID |

### How It Works

1. Receives extracted invoice data from Workflow 3
2. Fetches tenant settings (accounting system type)
3. Routes to correct accounting system (Xero / QBO / NetSuite)
4. Searches for matching Purchase Order
5. Calculates match confidence (0-100%)
6. Rules:
   - Amount + Vendor match → 95% → Auto-approve
   - Partial match → 60% → Exception
   - No PO found → 0% → Exception
7. Creates invoice in backend with status
8. Triggers Workflow 6 (notifications)

### Test Workflow

1. Trigger Workflow 3 with test invoice containing PO number
2. Ensure PO exists in accounting system
3. Check **Executions** → Find matching execution
4. Inspect output:
   - matchConfidence: 95
   - matched: true
   - status: "pending"
5. Check backend: Invoice created
6. If match fails → Verify PO number → Check accounting credentials

### Retry Logic

3 retries with 1-second delay on backend API failures.

Accounting API failures: No auto-retry (avoid duplicate requests). Manually retry from executions log.

---

## WORKFLOW 5: DASHBOARD SYNC API

**File:** `workflow-5-dashboard-sync.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-5-dashboard-sync.json`
3. Click **Import**

### Credentials Required

None (uses backend API only).

### Environment Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Backend URL |

### How It Works

1. Runs every 5 minutes
2. Fetches dashboard summary from backend
3. Caches in workflow static data
4. Frontend polls this cached data (faster than database queries)

### Activate Workflow

1. Toggle **Active**
2. Workflow runs automatically every 5 minutes
3. No manual testing needed

### Monitoring

Check **Executions** tab:
- Expect: Green executions every 5 minutes
- If red: Check backend connectivity

---

## WORKFLOW 6: NOTIFICATIONS (EMAIL + SLACK + TEAMS)

**File:** `workflow-6-notifications.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-6-notifications.json`
3. Click **Import**

### Credentials Required

Configure channels based on client needs:

#### Email (Always Required)

1. **Credentials** → **Add Credential** → **SMTP**
2. Enter SMTP settings:
   - Host: `smtp.gmail.com` (or client's SMTP)
   - Port: `587`
   - Username: `notifications@44automation.com`
   - Password: App password
3. Save as "SMTP Production"

#### Slack (Optional)

1. **Credentials** → **Add Credential** → **Slack OAuth2**
2. Setup:
   - Go to api.slack.com/apps
   - Create app
   - Add `chat:write` permission
   - Install to workspace
   - Copy OAuth token
   - Paste into n8n
3. Save as "Slack Production"

#### Microsoft Teams (Optional)

1. Create incoming webhook in Teams channel
2. Copy webhook URL
3. Paste in notification `recipient` field (workflow handles this dynamically)

### Environment Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Backend URL |
| `SMTP_FROM` | From email address |

### How It Works

1. Polls backend every 2 minutes for pending notifications
2. Routes by channel (email / Slack / Teams)
3. Sends notification
4. Marks as sent in backend
5. If send fails → Logs error → Notification stays pending → Retries next poll

### Test Workflow

1. Create test notification:

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "type": "test",
    "channel": "email",
    "recipient": "test@example.com",
    "subject": "Test Notification",
    "message": "This is a test"
  }'
```

2. Wait 2 minutes (poll interval)
3. Check **Executions** → Expect: Notification sent
4. Check email inbox → Expect: Test email received
5. If failed → Check SMTP credentials → Re-test

### Retry Logic

Failed notifications remain in database with `sent = false`. Next poll retries automatically.

Manual retry: Re-run failed execution from executions log.

---

## WORKFLOW 7: WEEKLY SIGNAL BRIEF GENERATOR

**File:** `workflow-7-weekly-signal-brief.json`

### Import Steps

1. **Workflows** → **Import from File**
2. Select `workflow-7-weekly-signal-brief.json`
3. Click **Import**

### Credentials Required

1. **OpenAI API** (reuse from Workflow 3)

### Environment Variables

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | Backend URL |
| `TENANT_ID` | Your tenant ID |
| `REPORT_RECIPIENT_EMAIL` | Email for weekly reports |

### How It Works

1. Runs every Monday at 9:00 AM
2. Fetches metrics for previous 7 days
3. Sends metrics to GPT-4 for narrative generation
4. Saves report to backend
5. Queues email notification (sent by Workflow 6)

### Activate Workflow

1. Toggle **Active**
2. Workflow waits until next Monday 9 AM
3. No immediate testing available (scheduled trigger)

### Test Workflow (Manual)

1. Click **Execute Workflow** button
2. Workflow runs immediately (ignores schedule)
3. Check **Executions** → Expect: Report generated
4. Check backend:

```bash
curl http://localhost:3000/api/reports/weekly?tenantId=1
```

5. Expect: JSON with `narrative` field containing AI-generated summary
6. Check email inbox (10 minutes after execution) → Expect: Weekly report email

### AI Prompt Schema

System prompt enforces:
- Executive-level language
- Focus on trends and exceptions
- Actionable insights
- HTML email format
- Max 800 tokens

### Retry Logic

None (scheduled once per week). If execution fails:
- Check executions log
- Manually retry with **Execute Workflow** button
- Fix issue before next Monday

---

## COMMON TROUBLESHOOTING

### Problem: Workflow not triggering

**Solution:**
1. Check **Active** toggle is ON (green)
2. Verify credentials connected
3. Check environment variables set
4. Review execution log for errors
5. Restart workflow: Toggle OFF → Wait 5 seconds → Toggle ON

### Problem: "Credential not found" error

**Solution:**
1. Go to node with error
2. Click credential dropdown
3. Select correct credential
4. Save workflow
5. Re-activate

### Problem: HTTP 401 errors

**Solution:**
1. Credential expired
2. Go to **Credentials**
3. Click credential name
4. Click **Reconnect**
5. Re-authorize
6. Save

### Problem: No executions appearing

**Solution:**
1. Workflow inactive
2. Toggle **Active** ON
3. Wait for trigger condition (time / email / event)
4. Check **Settings** → **Execution Log Retention** set to 7+ days

### Problem: Workflow stuck "Running"

**Solution:**
1. Click **Stop Execution** button
2. Check for infinite loops in code nodes
3. Review retry settings (may be retrying indefinitely)
4. Fix issue
5. Re-run

---

## EXECUTION ORDER SUMMARY

Workflows must be imported and activated in this order:

1. ✅ Workflow 1 (Gmail) OR Workflow 2 (Microsoft 365)
2. ✅ Workflow 3 (Document Extraction)
3. ✅ Workflow 4 (Matching & Routing)
4. ✅ Workflow 6 (Notifications)
5. ✅ Workflow 5 (Dashboard Sync)
6. ✅ Workflow 7 (Weekly Report)

---

## MONITORING CHECKLIST

Daily checks:

- [ ] All workflows show "Active" status
- [ ] No red executions in last 24 hours
- [ ] Notifications sending successfully
- [ ] Backend API responding (check `/health` endpoint)

Weekly checks:

- [ ] Weekly report received on Monday morning
- [ ] Review exception rate in report
- [ ] Verify credentials not expiring soon

---

## RE-RUNNING FAILED ITEMS

If an execution fails:

1. Go to **Executions** tab
2. Find failed execution (red icon)
3. Click execution to open details
4. Review error message
5. Fix root cause (credential / data / API)
6. Click **Retry Execution** button
7. Expect: Green success
8. If still fails → Check error details → Contact support

---

## KILL SWITCH (EMERGENCY STOP)

To pause all automation immediately:

1. Go to **Workflows** page
2. Toggle **Active** OFF for Workflow 1 and Workflow 2
3. All downstream workflows stop receiving new items
4. Existing executions complete (do not interrupt mid-process)
5. To resume: Toggle **Active** ON

This stops new invoices from entering the system without losing data.

---

## NEXT STEPS

After importing all workflows:

1. Verify all 7 workflows active
2. Run end-to-end test (send invoice email → Check dashboard)
3. Confirm notifications working
4. Schedule weekly report review
5. Proceed to Lovable front-end build (next SOP section)
