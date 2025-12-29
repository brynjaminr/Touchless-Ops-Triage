# TESTING CHECKLIST
# Touchless Ops Triage — Quality Assurance

**Purpose:** Complete testing checklist to verify system works before client deployment.

---

## PRE-DEPLOYMENT TESTING

Complete all items before deploying to production or onboarding first client.

---

## 1. BACKEND API TESTING

### Health & Setup

- [ ] Backend starts without errors: `npx ts-node server.ts`
- [ ] Health endpoint returns 200 OK: `curl http://localhost:3000/health`
- [ ] Database schema created (8 tables)
- [ ] Seed data loaded (demo tenant, user, 3 sample invoices)
- [ ] Environment variables loaded correctly

### Authentication

- [ ] Login with valid credentials returns token
- [ ] Login with invalid credentials returns 401 error
- [ ] Login with wrong domain returns 401 error
- [ ] Magic link request sends (check console log for token)
- [ ] Magic link verify returns token
- [ ] Expired magic link returns 401 error
- [ ] JWT token works for authenticated endpoints
- [ ] Invalid/expired JWT returns 401 error
- [ ] Missing Authorization header returns 401 error

**Test commands:**

```bash
# Valid login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","password":"demo123","domain":"demo.44automation.com"}'

# Invalid login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","password":"wrongpass","domain":"demo.44automation.com"}'

# Magic link
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","domain":"demo.44automation.com"}'
```

### Invoice Endpoints

- [ ] GET /api/invoices returns all invoices (with valid token)
- [ ] GET /api/invoices?status=pending filters correctly
- [ ] GET /api/invoices/:id returns single invoice
- [ ] GET /api/invoices/:id returns 404 for non-existent ID
- [ ] POST /api/invoices creates new invoice
- [ ] PATCH /api/invoices/:id updates invoice
- [ ] POST /api/invoices/:id/approve approves invoice
- [ ] POST /api/invoices/:id/reject rejects invoice
- [ ] POST /api/invoices/:id/paid marks as paid

**Test commands:**

```bash
# Save token from login
TOKEN="your_token_here"

# Get all invoices
curl http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN"

# Get pending only
curl http://localhost:3000/api/invoices?status=pending \
  -H "Authorization: Bearer $TOKEN"

# Approve invoice
curl -X POST http://localhost:3000/api/invoices/1/approve \
  -H "Authorization: Bearer $TOKEN"
```

### Dashboard Endpoints

- [ ] GET /api/dashboard/summary returns correct counts and totals
- [ ] GET /api/dashboard/activity returns recent audit logs
- [ ] Summary calculations match invoice table data

### Multi-Tenancy

- [ ] User from Tenant A cannot see Tenant B invoices
- [ ] User from Tenant A cannot update Tenant B invoices
- [ ] Tenant ID correctly isolates data

**Test:**
1. Create second tenant
2. Create user for second tenant
3. Login as second tenant user
4. Verify: GET /api/invoices returns 0 invoices (not Tenant A's data)

### Audit Logging

- [ ] Login action logged
- [ ] Invoice creation logged
- [ ] Invoice approval logged
- [ ] Invoice rejection logged
- [ ] Audit logs include IP address and user agent
- [ ] Audit logs queryable by tenant

---

## 2. N8N WORKFLOW TESTING

### Workflow 1: Gmail Listener

- [ ] Workflow imported successfully
- [ ] Gmail OAuth credential added and connected
- [ ] Environment variables set (TENANT_ID, BACKEND_URL, WORKFLOW_ID_EXTRACTION)
- [ ] Workflow activated (green toggle)
- [ ] Send test email with subject "Test Invoice" and PDF attachment
- [ ] Wait 60 seconds
- [ ] Check executions: Workflow ran successfully (green checkmark)
- [ ] Check backend: Email stored in email_inbox table
- [ ] Workflow 3 triggered automatically

**SQL check:**

```sql
SELECT * FROM email_inbox WHERE subject LIKE '%Test Invoice%';
```

### Workflow 2: Microsoft 365 Listener

- [ ] Workflow imported successfully
- [ ] Microsoft 365 OAuth credential added
- [ ] Environment variables set
- [ ] Workflow activated
- [ ] Send test email to Microsoft 365 inbox
- [ ] Workflow executes successfully
- [ ] Email stored in backend

*(Skip if not using Microsoft 365)*

### Workflow 3: Document Extraction

- [ ] Workflow imported successfully
- [ ] OpenAI API credential added
- [ ] Environment variables set (BACKEND_URL, WORKFLOW_ID_MATCHING)
- [ ] Manually execute workflow with test invoice PDF
- [ ] Extracted data contains:
  - vendorName (not empty)
  - totalAmount (number)
  - invoiceNumber
- [ ] Extracted data valid JSON
- [ ] Workflow 4 triggered on success

**Manual test:**
1. Click "Execute Workflow"
2. Paste test PDF data
3. Check output node for extracted JSON

### Workflow 4: Matching & Routing

- [ ] Workflow imported successfully
- [ ] Xero OR QuickBooks credential added
- [ ] Environment variables set (BACKEND_URL, WORKFLOW_ID_NOTIFICATIONS)
- [ ] Workflow retrieves tenant settings
- [ ] Routes to correct accounting system (Xero/QBO/NetSuite)
- [ ] Searches for PO successfully
- [ ] Calculates match confidence (0-100%)
- [ ] Creates invoice in backend with correct status
- [ ] Workflow 6 triggered

**Test with:**
- Invoice with known PO number → Expect: High confidence (90%+)
- Invoice with unknown PO → Expect: Low confidence, exception created

### Workflow 5: Dashboard Sync

- [ ] Workflow imported successfully
- [ ] Environment variables set (BACKEND_URL)
- [ ] Workflow activated
- [ ] Runs every 5 minutes automatically
- [ ] Fetches dashboard summary from backend
- [ ] No errors in execution log

**Monitor:** Check executions tab every 5 minutes for green runs.

### Workflow 6: Notifications

- [ ] Workflow imported successfully
- [ ] SMTP credential added
- [ ] Slack credential added (optional)
- [ ] Teams webhook configured (optional)
- [ ] Environment variables set (BACKEND_URL, SMTP_FROM)
- [ ] Workflow activated
- [ ] Manually queue test notification:

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "type": "test",
    "channel": "email",
    "recipient": "test@example.com",
    "subject": "Test Notification",
    "message": "This is a test from Touchless Ops Triage"
  }'
```

- [ ] Wait 2 minutes (poll interval)
- [ ] Check executions: Notification sent
- [ ] Check email inbox: Test email received
- [ ] Notification marked as sent in backend

**If using Slack:**
- [ ] Test Slack notification received in correct channel

**If using Teams:**
- [ ] Test Teams notification received

### Workflow 7: Weekly Signal Brief

- [ ] Workflow imported successfully
- [ ] OpenAI API credential added (reuse from Workflow 3)
- [ ] Environment variables set (BACKEND_URL, TENANT_ID, REPORT_RECIPIENT_EMAIL)
- [ ] Manually execute workflow (don't wait for Monday)
- [ ] Workflow calculates week dates
- [ ] Fetches metrics from backend
- [ ] Generates AI narrative (HTML format)
- [ ] Saves report to backend
- [ ] Queues email notification
- [ ] Email received with weekly summary

**Manual execution:**
1. Click "Execute Workflow" (bypasses schedule)
2. Check executions: All nodes green
3. Check email: Weekly report received

---

## 3. END-TO-END FLOW TESTING

### Complete Invoice Processing Flow

**Setup:**
1. Backend running
2. All 7 n8n workflows active
3. Email inbox monitored
4. Accounting system connected (Xero or QBO)

**Test steps:**

- [ ] **Step 1:** Send invoice email to monitored inbox
  - Email must have:
    - Subject containing "invoice" or "bill"
    - PDF attachment (real invoice with vendor, amount, PO number)
    - PO number matches existing PO in accounting system

- [ ] **Step 2:** Wait 2 minutes

- [ ] **Step 3:** Check n8n Workflow 1 execution
  - Status: Green (success)
  - Email received and stored in backend

- [ ] **Step 4:** Check n8n Workflow 3 execution
  - Status: Green
  - Extracted data visible in output node
  - vendorName, totalAmount, invoiceNumber present

- [ ] **Step 5:** Check n8n Workflow 4 execution
  - Status: Green
  - PO search executed
  - Match confidence calculated
  - Invoice created in backend

- [ ] **Step 6:** Check backend
  - Query: `SELECT * FROM invoices ORDER BY created_at DESC LIMIT 1;`
  - Invoice exists
  - Status: "pending" or "exception"
  - Extracted data populated

- [ ] **Step 7:** Check n8n Workflow 6 execution
  - Notification queued (if exception)
  - Email sent (if exception)

- [ ] **Step 8:** Login to dashboard (front-end)
  - Invoice appears in "To Review" tab
  - All details display correctly
  - Click invoice → Detail page loads

- [ ] **Step 9:** Approve invoice in dashboard
  - Click "Approve" button
  - Status updates to "Approved"
  - Success toast appears

- [ ] **Step 10:** Check backend
  - Invoice status = "approved"
  - approved_at timestamp set
  - approved_by = user ID

- [ ] **Step 11:** Check accounting system
  - Invoice/bill exists in Xero or QuickBooks
  - Amount matches
  - Vendor matches
  - Attached PDF present

### Exception Handling Flow

**Test exception scenario:**

- [ ] Send invoice with NO matching PO
- [ ] Wait 2 minutes
- [ ] Check Workflow 4: match_confidence = 0
- [ ] Check backend: status = "exception", exception_reason set
- [ ] Check Workflow 6: Exception email sent
- [ ] Check email inbox: Exception notification received
- [ ] Dashboard: Invoice in "To Review" with red badge
- [ ] Detail page: Exception reason displayed clearly

### Weekly Report Flow

- [ ] Manually execute Workflow 7
- [ ] Metrics fetched (verify in execution log)
- [ ] AI narrative generated (check output)
- [ ] Report saved to database
- [ ] Email notification queued
- [ ] Email received with HTML formatted summary

---

## 4. FRONT-END TESTING

### Login Page

- [ ] Page loads at /login
- [ ] Email, password, domain inputs render
- [ ] "Sign in" button disabled when form empty
- [ ] Valid login redirects to /dashboard
- [ ] Invalid login shows error toast
- [ ] "Send magic link" button triggers API call
- [ ] Magic link success message displays

### Dashboard Page

- [ ] Page loads at /dashboard (requires auth)
- [ ] Header shows logo and user email
- [ ] Logout button works (clears token, redirects to login)
- [ ] 4 stat cards display with correct numbers
- [ ] Tabs: "To Review", "Matched", "Paid" render
- [ ] Table populates with invoices
- [ ] Status badges color-coded correctly:
  - Pending: Yellow
  - Exception: Red
  - Approved: Green
  - Paid: Blue
- [ ] Click invoice number → Navigate to detail page
- [ ] Table sorts by column (if implemented)
- [ ] Pagination works (if > 20 invoices)

### Invoice Detail Page

- [ ] Page loads at /invoice/:id
- [ ] Back button returns to dashboard
- [ ] Invoice number and status badge display
- [ ] All details populate correctly (vendor, amount, dates, etc.)
- [ ] Match confidence shows as progress bar with percentage
- [ ] Exception reason displays (if present)
- [ ] Line items table shows (if data exists)
- [ ] "Approve" button visible (if status = pending/exception)
- [ ] Click "Approve" → API call succeeds → Status updates
- [ ] Success toast appears
- [ ] "Reject" button opens modal
- [ ] Reject modal has reason textarea (required)
- [ ] Click "Reject" → API call succeeds → Status updates to rejected
- [ ] Buttons disable after action

### Settings Page

- [ ] Page loads at /settings
- [ ] Sidebar navigation renders
- [ ] Tenant settings section shows read-only tenant name and domain
- [ ] Accounting system dropdown functional
- [ ] Save button updates settings
- [ ] Users table displays existing users
- [ ] "Add User" button opens modal
- [ ] Add user form validates (email required)
- [ ] Create user succeeds → Table refreshes → New user appears
- [ ] Notification channels section renders
- [ ] Save notification settings succeeds

### Landing Page

- [ ] Page loads at / (no auth required)
- [ ] Hero section displays headline and CTA
- [ ] "How It Works" section renders 3 steps
- [ ] Pricing section shows 3 tiers
- [ ] ROI calculator slider works
- [ ] ROI calculator updates hours/cost in real-time
- [ ] CTA buttons link correctly
- [ ] Page responsive on mobile (if implemented)

### Cross-Browser Testing

- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work

### Mobile Responsive Testing

- [ ] Login page: Mobile layout
- [ ] Dashboard: Cards stack vertically
- [ ] Table: Scrollable horizontally
- [ ] Invoice detail: Single column layout
- [ ] Settings: Sidebar collapses to hamburger menu

---

## 5. SECURITY TESTING

### Authentication & Authorization

- [ ] Access /dashboard without token → Redirects to /login
- [ ] Access /invoice/:id without token → Redirects to /login
- [ ] Access /settings without token → Redirects to /login
- [ ] Expired token → API returns 401 → Front-end redirects to login
- [ ] User A cannot access User B's tenant data (test with 2 tenants)

### API Security

- [ ] All API endpoints require authentication (except /health, /api/auth/*)
- [ ] SQL injection protected (test with `' OR 1=1--` in email field)
- [ ] XSS protected (test with `<script>alert('xss')</script>` in invoice fields)
- [ ] CORS configured (only allowed origins can call API)
- [ ] Rate limiting enabled (optional, test by spamming requests)

### Sensitive Data

- [ ] Passwords hashed in database (never plain text)
- [ ] JWT secret is random, not default
- [ ] Environment variables not exposed to front-end
- [ ] API keys not logged in execution logs
- [ ] PII (email addresses) not logged in plain text

---

## 6. PERFORMANCE TESTING

### Backend Performance

- [ ] /api/invoices response time < 500ms
- [ ] /api/dashboard/summary response time < 300ms
- [ ] Database queries optimized (use indexes)
- [ ] 100 concurrent requests handled without errors (use Apache Bench or similar)

**Test:**

```bash
ab -n 100 -c 10 http://localhost:3000/health
```

Expected: All requests succeed, average response time < 200ms.

### Front-End Performance

- [ ] Dashboard loads < 2 seconds
- [ ] Invoice detail loads < 1 second
- [ ] No layout shift on page load
- [ ] Images optimized (< 500KB)
- [ ] JavaScript bundle < 500KB

**Test with Lighthouse:**
- Performance score > 90
- Accessibility score > 90

### n8n Workflow Performance

- [ ] Email to dashboard < 5 minutes end-to-end
- [ ] Invoice extraction < 10 seconds (GPT-4 API call)
- [ ] PO matching < 5 seconds (accounting system API call)
- [ ] No workflow timeouts

---

## 7. ERROR HANDLING TESTING

### Backend Error Scenarios

- [ ] Database connection lost → Returns 500 error
- [ ] Invalid JSON in request body → Returns 400 error
- [ ] Missing required fields → Returns 400 error with clear message
- [ ] Invoice not found → Returns 404 error
- [ ] Unauthorized access → Returns 401 error

### n8n Error Scenarios

- [ ] Email with no attachment → Marks as processed with error
- [ ] PDF extraction fails → Marks email as failed, does not create invoice
- [ ] Accounting API down → Marks invoice as exception, retries later
- [ ] OpenAI API timeout → Retries 2 times, then fails gracefully
- [ ] Invalid credentials → Stops workflow, sends error notification

### Front-End Error Scenarios

- [ ] API down → Shows error toast "Service unavailable, try again"
- [ ] Network timeout → Shows error toast
- [ ] 401 error → Redirects to login
- [ ] Form validation errors → Shows field-level error messages

---

## 8. DATA INTEGRITY TESTING

### Invoice Data

- [ ] Total amount matches sum of line items (within $0.10)
- [ ] Currency code valid (USD, EUR, GBP, etc.)
- [ ] Dates in correct format (YYYY-MM-DD)
- [ ] Due date >= invoice date
- [ ] Match confidence between 0-100

### Audit Trail

- [ ] Every invoice creation logged
- [ ] Every approval logged with user ID
- [ ] Every rejection logged with reason
- [ ] Audit logs immutable (cannot be deleted)

### Duplicate Prevention

- [ ] Same email ID processed twice → Second attempt skips (database constraint)
- [ ] Same invoice number from same vendor → Creates separate invoices (not duplicates, could be legitimate)

---

## 9. DEPLOYMENT TESTING (PRODUCTION)

### Pre-Deployment

- [ ] Environment variables set correctly in production
- [ ] Database migrations run successfully
- [ ] HTTPS enabled (SSL certificate valid)
- [ ] Domain DNS configured
- [ ] CORS allows production front-end domain
- [ ] n8n workflows use production backend URL

### Post-Deployment

- [ ] Health check: https://api.yourdomain.com/health returns 200 OK
- [ ] Login from production front-end works
- [ ] Dashboard loads with production data
- [ ] Send test invoice to production email inbox
- [ ] Invoice processes end-to-end in production
- [ ] No errors in production logs

### Monitoring

- [ ] Error logging configured (backend, n8n)
- [ ] Uptime monitoring enabled (optional: UptimeRobot, Pingdom)
- [ ] Database backups automated (daily)
- [ ] Disk space monitored (alert if > 80%)

---

## 10. CLIENT ONBOARDING TESTING

### Onboarding Flow

- [ ] Create new tenant via API
- [ ] Create admin user for tenant
- [ ] Send credentials to test email
- [ ] Login with new credentials succeeds
- [ ] Dashboard empty (no invoices yet)
- [ ] Connect Gmail or Microsoft 365 (test OAuth)
- [ ] Connect Xero or QuickBooks (test OAuth)
- [ ] Set notification email
- [ ] Send test invoice
- [ ] Invoice appears in dashboard within 5 minutes

### Multi-Tenant Isolation

- [ ] Tenant 1 invoices not visible to Tenant 2
- [ ] Tenant 2 cannot approve Tenant 1 invoices
- [ ] Weekly reports sent to correct tenant only

---

## FINAL PRE-LAUNCH CHECKLIST

Before onboarding first paying client:

- [ ] All backend API tests passing
- [ ] All 7 n8n workflows active and tested
- [ ] End-to-end flow tested 3+ times successfully
- [ ] Front-end deployed and functional
- [ ] Production environment configured (HTTPS, DNS, backups)
- [ ] Security audit complete (no plain passwords, no exposed secrets)
- [ ] Performance acceptable (< 5 min end-to-end)
- [ ] Error handling tested (graceful failures)
- [ ] Monitoring and logging enabled
- [ ] Backup/restore tested
- [ ] Client onboarding SOP reviewed
- [ ] Support email configured (support@44automation.com)

---

## ONGOING TESTING (MONTHLY)

- [ ] Test end-to-end flow with real invoice
- [ ] Review error logs for patterns
- [ ] Check database backup successful
- [ ] Verify SSL certificate not expiring soon (renew if < 30 days)
- [ ] Test rollback procedure (restore from backup)
- [ ] Review n8n workflow execution success rates (should be > 95%)

---

**End of testing checklist. Complete all items before production deployment and client onboarding.**
