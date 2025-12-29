# LOVABLE FRONT-END BUILD SPEC
# Touchless Ops Triage Dashboard

**Build Tool:** Lovable.dev
**Framework:** React + TypeScript + Tailwind CSS
**API Base:** Configurable via environment variable

---

## PROJECT SETUP

1. Create new Lovable project: "Touchless Ops Triage"
2. Select template: "React + TypeScript + Tailwind"
3. Add environment variable: `VITE_API_BASE_URL`
4. Install routing: React Router
5. Install state management: Zustand (for auth token)

---

## PAGE 1: LOGIN (/login)

### Layout

Centered card on full-screen background (gradient blue to purple).

### Components

**LoginCard**
- Width: 400px
- Padding: 32px
- Background: White
- Border radius: 8px
- Shadow: large

**Inside card:**

1. **Logo** (top)
   - Text: "44 Automation"
   - Font: Bold, 24px
   - Color: Primary blue

2. **Heading**
   - Text: "Sign in to your account"
   - Font: Semibold, 20px
   - Margin bottom: 24px

3. **Form Inputs**

   **Email Input**
   - Label: "Email address"
   - Type: email
   - Placeholder: "you@company.com"
   - Required: yes
   - Validation: Must be valid email format

   **Password Input**
   - Label: "Password"
   - Type: password
   - Placeholder: "••••••••"
   - Required: yes
   - Show/hide toggle icon

   **Domain Input**
   - Label: "Company domain"
   - Type: text
   - Placeholder: "acme"
   - Helper text: "Your subdomain (e.g., 'acme' for acme.44automation.com)"
   - Required: yes

4. **Login Button**
   - Text: "Sign in"
   - Style: Primary blue, full width
   - Disabled: if form invalid
   - Loading state: spinner when submitting

5. **Divider**
   - Text: "OR"
   - Centered, with lines on sides

6. **Magic Link Button**
   - Text: "Send magic link"
   - Style: Secondary (outline), full width
   - Action: Opens magic link flow

### API Calls

**On "Sign in" click:**

```typescript
POST /api/auth/login
Body: {
  email: string,
  password: string,
  domain: string
}
Response: {
  token: string,
  user: {
    id: number,
    email: string,
    role: string,
    tenantId: number
  }
}

On success:
- Store token in localStorage: localStorage.setItem('auth_token', token)
- Store user in Zustand store
- Redirect to /dashboard

On error:
- Show error toast: "Invalid credentials"
- Clear password field
```

**On "Send magic link" click:**

```typescript
POST /api/auth/magic-link
Body: {
  email: string,
  domain: string
}
Response: {
  message: string
}

On success:
- Show success toast: "Check your email for login link"
- Don't redirect

On error:
- Show error toast: "Failed to send magic link"
```

### Success Indicators

- Form validates before submission
- Loading spinner shows during API call
- Error messages clear and actionable
- Successful login redirects immediately

---

## PAGE 2: DASHBOARD (/dashboard)

### Layout

Full-page dashboard with header and content area.

### Header Component

- Height: 64px
- Background: White
- Border bottom: 1px gray

**Left side:**
- Logo: "44 Automation"
- Text: "Touchless Ops Triage"

**Right side:**
- User email
- Logout button (icon)

### Main Content

**Stats Cards Section**

Row of 4 cards, equal width, gap 16px

**Card 1: To Review**
- Background: Yellow-50
- Border: Yellow-200
- Icon: AlertCircle (yellow)
- Big number: Count (e.g., "12")
- Label: "To Review"
- Amount: Currency format (e.g., "$15,400.00")

**Card 2: Matched**
- Background: Green-50
- Border: Green-200
- Icon: CheckCircle (green)
- Big number: Count
- Label: "Matched"
- Amount: Currency

**Card 3: Approved**
- Background: Blue-50
- Border: Blue-200
- Icon: ThumbsUp (blue)
- Big number: Count
- Label: "Approved"
- Amount: Currency

**Card 4: Paid**
- Background: Purple-50
- Border: Purple-200
- Icon: DollarSign (purple)
- Big number: Count
- Label: "Paid"
- Amount: Currency

**Tabs Section**

Below cards, margin top 24px

Tabs: "To Review" | "Matched" | "Paid"

**Table (same for all tabs, filtered by status)**

Columns:
1. Invoice # (clickable link)
2. Vendor (text)
3. Amount (currency, bold)
4. Date (formatted: Jan 15, 2025)
5. Status (badge)
6. Actions (View button)

**Status Badge Styles:**
- pending: Yellow background, "Pending Review"
- exception: Red background, "Exception"
- approved: Green background, "Approved"
- paid: Blue background, "Paid"
- rejected: Gray background, "Rejected"

**Table Features:**
- Hover: Row highlights light gray
- Click row: Navigate to detail page
- Sort: Click column header to sort
- Pagination: 20 per page

### API Calls

**On page load:**

```typescript
// Get summary stats
GET /api/dashboard/summary
Headers: { Authorization: Bearer <token> }
Response: {
  pending_count: number,
  exception_count: number,
  approved_count: number,
  paid_count: number,
  pending_total: number,
  exception_total: number,
  approved_total: number,
  paid_total: number
}

// Get invoices for active tab
GET /api/invoices?status=pending&limit=20&offset=0
Headers: { Authorization: Bearer <token> }
Response: {
  invoices: Invoice[],
  total: number
}

Invoice schema:
{
  id: number,
  vendor_name: string,
  invoice_number: string,
  invoice_date: string,
  total_amount: number,
  currency: string,
  status: string,
  match_confidence: number,
  exception_reason: string | null
}
```

**On tab change:**
- Fetch invoices with new status filter
- Update table

**On pagination:**
- Update offset
- Fetch new page

### Success Indicators

- Stats cards show accurate totals
- Table populates with invoices
- Click invoice → Navigate to detail
- Badges color-coded correctly

---

## PAGE 3: INVOICE DETAIL (/invoice/:id)

### Layout

Full-page detail view with back button and sections.

### Header

- Back button: "← Dashboard" (links to /dashboard)
- Invoice number: Large, bold
- Status badge: Same styles as table

### Details Section (2-column grid)

**Left Column:**

Label-value pairs, vertical stack:
- Vendor: [vendor_name]
- Invoice Number: [invoice_number]
- Invoice Date: [invoice_date, formatted]
- Due Date: [due_date, formatted]
- Total Amount: [total_amount, currency, large, bold]

**Right Column:**

- PO Number: [matched_po or "N/A"]
- Match Confidence: Progress bar with percentage
  - 0-50%: Red
  - 51-80%: Yellow
  - 81-100%: Green
- Exception Reason: [exception_reason, red text if present]
- Accounting System: [accounting_system, badge]
- Email Source: [email_source]

### Line Items Section

Table (if line_items exists):

Columns:
1. Description
2. Quantity
3. Unit Price
4. Amount

Footer row: "Total: [sum of amounts]"

### Extracted Data Section (Collapsible)

Accordion: "View Extracted Data"

When expanded, show JSON formatted nicely:

```json
{
  "vendorName": "...",
  "invoiceNumber": "...",
  ...
}
```

### Actions Section (Bottom)

Buttons (only if status = pending or exception):

**Approve Button**
- Text: "Approve Invoice"
- Style: Green, large
- Icon: CheckCircle
- Position: Right side

**Reject Button**
- Text: "Reject"
- Style: Red outline
- Icon: XCircle
- Position: Left side

**View Source Button**
- Text: "View Email"
- Style: Gray outline
- Icon: Mail
- Position: Far left

### API Calls

**On page load:**

```typescript
GET /api/invoices/:id
Headers: { Authorization: Bearer <token> }
Response: Invoice object (full details)
```

**On Approve click:**

```typescript
POST /api/invoices/:id/approve
Headers: { Authorization: Bearer <token> }
Response: Updated invoice object

On success:
- Show success toast: "Invoice approved"
- Update status badge to "Approved"
- Disable action buttons
- Optionally redirect to dashboard after 2 seconds

On error:
- Show error toast with message
```

**On Reject click:**

1. Show modal: "Reject Invoice"
2. Modal contains:
   - Text: "Why are you rejecting this invoice?"
   - Textarea: reason (required)
   - Buttons: Cancel | Reject (red)

3. On Reject confirm:

```typescript
POST /api/invoices/:id/reject
Headers: { Authorization: Bearer <token> }
Body: { reason: string }
Response: Updated invoice object

On success:
- Close modal
- Show success toast: "Invoice rejected"
- Update status badge to "Rejected"
- Disable buttons

On error:
- Show error toast
```

### Success Indicators

- All invoice details display correctly
- Match confidence bar shows percentage visually
- Line items table calculates total correctly
- Approve/Reject actions work and update UI immediately

---

## PAGE 4: SETTINGS (/settings)

### Layout

Full-page with sidebar navigation and content area.

### Sidebar (Left, 240px wide)

Navigation menu:
- Tenant Settings (active by default)
- Users
- Notification Channels
- API Keys (future)

### Content Area (Right)

Shows active section.

### Section 1: Tenant Settings

**Form:**

**Tenant Name**
- Label: "Company name"
- Input: text (read-only, gray background)
- Value: From user.tenantId → tenant.name

**Domain**
- Label: "Domain"
- Input: text (read-only)
- Value: tenant.domain

**Accounting System**
- Label: "Accounting system"
- Select dropdown:
  - Xero
  - QuickBooks Online
  - NetSuite
  - Other
- Value: tenant.settings.accountingSystem

**Save Button**
- Text: "Save changes"
- Style: Primary blue
- Position: Bottom right

**API Call:**

```typescript
PATCH /api/tenants/:id
Headers: { Authorization: Bearer <token> }
Body: {
  settings: {
    accountingSystem: string
  }
}
Response: Updated tenant object

On success:
- Show success toast: "Settings saved"

On error:
- Show error toast
```

### Section 2: Users

**Table:**

Columns:
1. Email
2. Role (badge: Admin or User)
3. Created Date
4. Actions (Delete button, red icon)

**Add User Button**
- Text: "+ Add User"
- Style: Primary blue
- Position: Top right
- Action: Opens modal

**Add User Modal:**

Fields:
- Email (required)
- Role (dropdown: User | Admin)

Buttons:
- Cancel (gray)
- Create (blue)

**API Call:**

```typescript
POST /api/users
Headers: { Authorization: Bearer <token> }
Body: {
  tenantId: number,
  email: string,
  role: string
}
Response: Created user object

On success:
- Close modal
- Refresh users table
- Show success toast: "User created. Password sent to email."

On error:
- Show error toast
```

### Section 3: Notification Channels

**Email Settings**

- Label: "Email notifications"
- Input: email (default recipient)
- Helper text: "Where exception alerts are sent"

**Slack Settings**

- Label: "Slack webhook URL"
- Input: text (URL)
- Helper text: "Get from Slack app settings"
- Test button: Send test message

**Teams Settings**

- Label: "Microsoft Teams webhook URL"
- Input: text (URL)
- Helper text: "Get from Teams channel connectors"
- Test button: Send test message

**Save Button**

**API Call:**

```typescript
PATCH /api/tenants/:id
Headers: { Authorization: Bearer <token> }
Body: {
  settings: {
    notificationEmail: string,
    slackWebhook: string,
    teamsWebhook: string
  }
}

On Test button click (Slack):
POST /api/notifications
Body: {
  tenantId: number,
  type: "test",
  channel: "slack",
  recipient: slackWebhook,
  subject: "Test",
  message: "This is a test notification from 44 Automation"
}

On success:
- Show toast: "Test sent. Check Slack."
```

### Success Indicators

- Forms save correctly
- Users table updates after adding user
- Test notifications arrive in Slack/Teams

---

## PAGE 5: PUBLIC LANDING PAGE (/)

### Layout

Full-page marketing site (no auth required).

### Section 1: Hero

**Background:** Gradient (blue to purple)
**Height:** 600px
**Content (centered):**

- Headline: "Stop Manually Entering Invoices"
  - Font: Bold, 48px, white
- Subheadline: "Automated invoice processing from email to accounting. 90% touchless."
  - Font: Regular, 24px, white with 80% opacity
- CTA Button:
  - Text: "Start 7-Day Free Pilot"
  - Style: Large, white background, blue text
  - Action: Scroll to pilot form OR link to /pilot

### Section 2: How It Works

**Background:** White
**Layout:** 3 columns with icons

**Step 1:**
- Icon: Inbox (large, blue)
- Title: "Forward Invoices"
- Description: "Send invoices to your dedicated inbox. Works with Gmail and Microsoft 365."

**Step 2:**
- Icon: Cpu (AI chip)
- Title: "AI Extracts & Matches"
- Description: "GPT-4 extracts invoice data and matches to purchase orders in Xero or QuickBooks."

**Step 3:**
- Icon: CheckCircle
- Title: "Auto-Approve or Review"
- Description: "High-confidence matches auto-approve. Exceptions flagged for quick human review."

### Section 3: Pricing

**Background:** Light gray
**Layout:** 3 pricing cards (side by side)

**Card 1: Starter**
- Price: "$199/month"
- Subtitle: "Up to 100 invoices"
- Features:
  - ✓ Email monitoring
  - ✓ AI extraction
  - ✓ PO matching
  - ✓ Dashboard access
  - ✓ Weekly reports
- Button: "Start Pilot" (primary blue)

**Card 2: Growth** (highlighted, border blue)
- Badge: "Most Popular"
- Price: "$499/month"
- Subtitle: "Up to 500 invoices"
- Features:
  - ✓ Everything in Starter
  - ✓ Slack/Teams notifications
  - ✓ Priority support
  - ✓ Custom matching rules
- Button: "Start Pilot" (primary blue, larger)

**Card 3: Enterprise**
- Price: "Custom"
- Subtitle: "Unlimited invoices"
- Features:
  - ✓ Everything in Growth
  - ✓ Multi-entity support
  - ✓ Custom integrations
  - ✓ Dedicated success manager
- Button: "Contact Sales" (secondary outline)

### Section 4: ROI Calculator

**Background:** White
**Layout:** Interactive calculator

**Input:**
- Slider: "Invoices processed per month" (range: 10-1000)
- Shows current value: e.g., "250 invoices/month"

**Output (auto-calculates):**
- Hours saved: `invoices * 0.15` hours/month
- Cost saved: `hours * $50`
- ROI: Cost saved minus product price

**Example:**
- 250 invoices → 37.5 hours saved → $1,875 saved
- Cost: $499/month
- **Net savings: $1,376/month**

### Section 5: CTA

**Background:** Blue gradient
**Content (centered):**

- Headline: "Ready to Save 20 Hours Per Month?"
- Button: "Start Free 7-Day Pilot"
- Subtext: "No credit card required. Full access."

### API Calls

No API calls (static marketing page).

Optional: Form submission for pilot signup (creates lead).

### Success Indicators

- Page loads fast
- Animations smooth (scroll effects, hover states)
- Calculator updates in real-time
- CTA buttons prominent and clear

---

## SHARED COMPONENTS

### AuthProvider (Zustand Store)

```typescript
interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

Store token in localStorage.
On app load, check localStorage and restore auth state.
```

### ProtectedRoute

Wraps dashboard, invoice detail, settings pages.

If not authenticated, redirect to /login.

### API Client

```typescript
const apiClient = {
  baseURL: import.meta.env.VITE_API_BASE_URL,

  request: async (method, endpoint, data?, headers?) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(baseURL + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...headers
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Logout and redirect
        logout();
      }
      throw new Error(await response.text());
    }

    return await response.json();
  }
}
```

### Toast Notifications

Use react-hot-toast or similar.

Styles:
- Success: Green background, white text, checkmark icon
- Error: Red background, white text, X icon
- Info: Blue background, white text, info icon

Position: Top right
Duration: 3 seconds

---

## STYLING GUIDELINES

**Colors:**
- Primary: #2563eb (blue-600)
- Success: #10b981 (green-500)
- Warning: #f59e0b (amber-500)
- Error: #ef4444 (red-500)
- Gray: #6b7280 (gray-500)

**Typography:**
- Headings: Inter font, bold
- Body: Inter font, regular
- Monospace (for JSON): Fira Code

**Spacing:**
- Page padding: 24px
- Section gaps: 32px
- Component gaps: 16px

**Shadows:**
- Cards: shadow-md
- Modals: shadow-xl
- Buttons: shadow-sm on hover

**Responsiveness:**
- Mobile: Stack cards vertically, hide sidebar (use hamburger menu)
- Tablet: 2-column layout
- Desktop: Full layout as described

---

## TESTING CHECKLIST

- [ ] Login works with valid credentials
- [ ] Login shows error with invalid credentials
- [ ] Magic link sends email
- [ ] Dashboard stats display correctly
- [ ] Table filters by tab
- [ ] Click invoice navigates to detail
- [ ] Approve button approves invoice
- [ ] Reject button rejects invoice
- [ ] Settings save correctly
- [ ] Add user creates user
- [ ] Logout clears token and redirects to login
- [ ] Protected routes redirect if not authenticated
- [ ] Landing page loads without auth
- [ ] ROI calculator updates in real-time

---

## DEPLOYMENT

1. Build in Lovable: Click "Deploy"
2. Lovable hosts automatically at: `https://your-project.lovable.app`
3. Set environment variable: `VITE_API_BASE_URL` = production backend URL
4. Update backend CORS to allow front-end domain
5. Test login from deployed URL

**Custom domain:**
- Settings → Custom Domain
- Enter: `app.44automation.com`
- Update DNS records as instructed
- SSL auto-provisioned

---

**End of Lovable build spec. Use this document to build front-end in Lovable.dev without needing to make architectural decisions.**
