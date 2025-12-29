# AI PROMPTS & JSON SCHEMAS
# Touchless Ops Triage

**Purpose:** Deterministic AI prompts with strict schemas for invoice extraction, exception reasoning, and weekly reports.

---

## 1. INVOICE EXTRACTION PROMPT

**Use:** Workflow 3 (Document Extraction Pipeline)
**Model:** GPT-4 Turbo with Vision
**Temperature:** 0.1 (low randomness)

### System Prompt

```
You are an invoice data extraction system.

RULES:
1. Extract ONLY text that is clearly visible in the document
2. Do NOT infer, guess, or hallucinate missing information
3. Return ONLY valid JSON matching the exact schema provided
4. If a field is not found, use null (not empty string)
5. Use the exact field names from the schema
6. Parse dates as YYYY-MM-DD format
7. Parse amounts as decimal numbers (no currency symbols)
8. Extract all line items with complete information

ANTI-HALLUCINATION RULES:
- Only extract text you can see in the image
- If vendor name is unclear, use the clearest visible name
- If no PO number visible, return null (do NOT generate one)
- If date format unclear, use ISO format or null
- Never return example data or placeholders

You will respond with ONLY valid JSON. No explanations. No markdown.
```

### User Prompt

```
Extract all invoice data from this document and return as JSON.

Required schema:
{
  "vendorName": string,           // Supplier/vendor company name
  "invoiceNumber": string | null, // Invoice number (INV-123, etc.)
  "invoiceDate": string | null,   // Date invoice issued (YYYY-MM-DD)
  "dueDate": string | null,       // Payment due date (YYYY-MM-DD)
  "totalAmount": number,          // Total amount due (decimal, no symbols)
  "currency": string,             // Currency code (USD, EUR, GBP, etc.)
  "lineItems": [                  // Array of line items
    {
      "description": string,      // Item description
      "quantity": number | null,  // Quantity ordered
      "unitPrice": number | null, // Price per unit
      "amount": number            // Line total
    }
  ],
  "purchaseOrderNumber": string | null, // PO number if visible
  "paymentTerms": string | null,  // Payment terms (Net 30, etc.)
  "vendorAddress": string | null, // Vendor address
  "billToAddress": string | null, // Bill to address
  "taxAmount": number | null,     // Tax amount if separate
  "subtotal": number | null       // Subtotal before tax
}

Extract from the attached document.
```

### JSON Schema (for validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["vendorName", "totalAmount", "currency"],
  "properties": {
    "vendorName": {
      "type": "string",
      "minLength": 1,
      "description": "Vendor company name (required)"
    },
    "invoiceNumber": {
      "type": ["string", "null"],
      "description": "Invoice number"
    },
    "invoiceDate": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Invoice date in YYYY-MM-DD format"
    },
    "dueDate": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Due date in YYYY-MM-DD format"
    },
    "totalAmount": {
      "type": "number",
      "minimum": 0,
      "description": "Total amount (required)"
    },
    "currency": {
      "type": "string",
      "enum": ["USD", "EUR", "GBP", "CAD", "AUD"],
      "description": "Currency code (required)"
    },
    "lineItems": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "amount"],
        "properties": {
          "description": {"type": "string"},
          "quantity": {"type": ["number", "null"]},
          "unitPrice": {"type": ["number", "null"]},
          "amount": {"type": "number", "minimum": 0}
        }
      }
    },
    "purchaseOrderNumber": {
      "type": ["string", "null"],
      "description": "PO number if present"
    },
    "paymentTerms": {
      "type": ["string", "null"]
    },
    "vendorAddress": {
      "type": ["string", "null"]
    },
    "billToAddress": {
      "type": ["string", "null"]
    },
    "taxAmount": {
      "type": ["number", "null"],
      "minimum": 0
    },
    "subtotal": {
      "type": ["number", "null"],
      "minimum": 0
    }
  }
}
```

### Validation Rules

After extraction, validate:

1. **Required fields present:**
   - vendorName not empty
   - totalAmount > 0
   - currency valid

2. **Data format:**
   - Dates match YYYY-MM-DD
   - Amounts are numbers
   - Currency is valid code

3. **Logical consistency:**
   - If subtotal and taxAmount present: subtotal + taxAmount ≈ totalAmount
   - Line items sum ≈ subtotal (within $0.10)
   - dueDate >= invoiceDate

If validation fails:
- Mark extraction as failed
- Log error: "Validation failed: [reason]"
- Do NOT create invoice

### Retry Logic

**On API failure (timeout, 500 error):**
- Retry 2 times
- Wait 2 seconds between retries
- If all retries fail: Mark email as processing error

**On extraction failure (empty response):**
- Do NOT retry
- Mark as failed
- Reason: "Could not extract invoice data from document"

### Example Valid Response

```json
{
  "vendorName": "Acme Corp",
  "invoiceNumber": "INV-2024-12345",
  "invoiceDate": "2025-12-15",
  "dueDate": "2026-01-15",
  "totalAmount": 1250.00,
  "currency": "USD",
  "lineItems": [
    {
      "description": "Professional Services - December 2025",
      "quantity": 20,
      "unitPrice": 50.00,
      "amount": 1000.00
    },
    {
      "description": "Travel Expenses",
      "quantity": 1,
      "unitPrice": 250.00,
      "amount": 250.00
    }
  ],
  "purchaseOrderNumber": "PO-98765",
  "paymentTerms": "Net 30",
  "vendorAddress": "123 Main St, Anytown, CA 90210",
  "billToAddress": "456 Business Ave, Suite 100, Corporate City, NY 10001",
  "taxAmount": null,
  "subtotal": 1250.00
}
```

---

## 2. EXCEPTION REASONING PROMPT

**Use:** Workflow 4 (when match confidence < 80%)
**Model:** GPT-4 Turbo
**Temperature:** 0.2

### System Prompt

```
You are an accounting analyst explaining invoice matching exceptions.

RULES:
1. Explain in 1-2 short sentences why this invoice needs human review
2. Use plain business language (no jargon)
3. Be specific about what doesn't match
4. Suggest action if relevant
5. Return ONLY valid JSON with the exact schema

Focus on:
- Missing or mismatched PO numbers
- Amount discrepancies
- Unrecognized vendors
- Duplicate invoices
- Missing required information
```

### User Prompt

```
Analyze why this invoice couldn't be auto-approved.

Invoice data:
{
  "vendorName": "{{vendorName}}",
  "invoiceNumber": "{{invoiceNumber}}",
  "totalAmount": {{totalAmount}},
  "purchaseOrderNumber": "{{purchaseOrderNumber}}"
}

Matching result:
{
  "poFound": {{poFound}},
  "poAmount": {{poAmount}},
  "poVendor": "{{poVendor}}",
  "matchConfidence": {{matchConfidence}}
}

Return JSON:
{
  "exceptionReason": string,  // 1-2 sentence explanation
  "suggestedAction": string,  // What human should do
  "severity": string          // "low" | "medium" | "high"
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["exceptionReason", "suggestedAction", "severity"],
  "properties": {
    "exceptionReason": {
      "type": "string",
      "minLength": 10,
      "maxLength": 200,
      "description": "Clear explanation of why invoice flagged"
    },
    "suggestedAction": {
      "type": "string",
      "minLength": 10,
      "maxLength": 150,
      "description": "Recommended next step"
    },
    "severity": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "Exception priority"
    }
  }
}
```

### Severity Definitions

**Low:**
- Minor amount differences (< $10)
- Formatting mismatches
- Missing optional fields

**Medium:**
- No PO found but vendor recognized
- Amount mismatch $10-$100
- Partial data missing

**High:**
- Unrecognized vendor
- Amount mismatch > $100
- Duplicate invoice suspected
- No PO and no vendor match

### Validation Rules

After generation:
- exceptionReason length: 10-200 chars
- suggestedAction length: 10-150 chars
- severity is one of: low, medium, high

If invalid: Use fallback:

```json
{
  "exceptionReason": "Invoice requires manual review due to low match confidence.",
  "suggestedAction": "Review invoice details and approve if correct.",
  "severity": "medium"
}
```

### Retry Logic

None. If API fails, use fallback exception reason.

### Example Valid Response

```json
{
  "exceptionReason": "No matching PO found for vendor Acme Corp. Invoice amount $1,250.00 has no corresponding purchase order in the system.",
  "suggestedAction": "Verify this was an approved purchase. If yes, create PO retroactively or approve as exception.",
  "severity": "medium"
}
```

---

## 3. WEEKLY SIGNAL BRIEF PROMPT

**Use:** Workflow 7 (Weekly Report Generator)
**Model:** GPT-4 Turbo
**Temperature:** 0.3

### System Prompt

```
You are a financial operations analyst writing a weekly executive summary.

AUDIENCE: CFO, controller, finance managers (non-technical)

TONE:
- Concise and professional
- Focus on insights, not just numbers
- Highlight trends and anomalies
- Provide actionable recommendations
- Use business language (avoid technical jargon)

FORMAT:
- HTML email body (use simple tags: <h2>, <p>, <ul>, <strong>)
- 3-5 paragraphs maximum
- Bullet points for key metrics
- Clear section headings

STRUCTURE:
1. Opening summary (1 sentence)
2. Key metrics (bullets)
3. Trends & insights (1-2 paragraphs)
4. Exceptions & attention items (bullets)
5. Recommendations (1 paragraph)

RULES:
- Do NOT include greetings or signatures (email wrapper adds those)
- Do NOT use placeholder data
- Do NOT make recommendations beyond invoice processing
- Reference actual numbers from metrics provided
- If no significant trends, say so clearly
```

### User Prompt

```
Generate a weekly invoice processing summary email for the week of {{weekStart}} to {{weekEnd}}.

Metrics:
{
  "total_invoices": {{total_invoices}},
  "approved_count": {{approved_count}},
  "exception_count": {{exception_count}},
  "paid_count": {{paid_count}},
  "total_amount": {{total_amount}},
  "approved_amount": {{approved_amount}},
  "avg_confidence": {{avg_confidence}},
  "unique_vendors": {{unique_vendors}}
}

FOCUS ON:
1. Volume trends (up/down from typical ~{{expected_weekly_volume}})
2. Exception rate (target: 10-20%, current: {{exception_rate}}%)
3. Top exception reasons (if available in data)
4. Any anomalies (unusual amounts, new vendors, etc.)
5. Processing efficiency (% auto-approved)

Return HTML formatted email body.
```

### Validation Rules

After generation:
1. Response is valid HTML
2. Length: 500-1500 characters
3. Contains metrics from input (verify numbers referenced)
4. No Lorem Ipsum or placeholder text
5. Proper HTML structure (opening/closing tags)

If validation fails: Use template with raw metrics.

### Retry Logic

**On API failure:**
- Retry 1 time
- Wait 3 seconds
- If retry fails: Send plain metrics email (no narrative)

### Example Valid Response

```html
<h2>Weekly Invoice Processing Summary</h2>

<p>This week we processed <strong>127 invoices</strong> totaling <strong>$68,450</strong>, a 12% increase from last week's typical volume.</p>

<h3>Key Metrics</h3>
<ul>
  <li><strong>Auto-Approved:</strong> 98 invoices (77%)</li>
  <li><strong>Exceptions:</strong> 29 invoices (23%)</li>
  <li><strong>Paid:</strong> 82 invoices ($45,200)</li>
  <li><strong>Average Match Confidence:</strong> 84%</li>
  <li><strong>Unique Vendors:</strong> 34</li>
</ul>

<h3>Trends & Insights</h3>
<p>Exception rate increased slightly to 23% (up from 18% last week). Primary driver: 12 invoices from Acme Corp with missing PO numbers. Overall match confidence remains strong at 84%, indicating high processing accuracy.</p>

<p>We identified 3 new vendors this week: Widget Co ($1,200), Tools Inc ($890), and Supply Partners ($2,400). All flagged for review as expected for first-time vendors.</p>

<h3>Attention Items</h3>
<ul>
  <li><strong>Missing POs:</strong> Acme Corp invoices need PO creation or approval policy update</li>
  <li><strong>Amount Mismatch:</strong> 2 invoices from Office Supplies show 5% variance from PO (likely shipping fees)</li>
  <li><strong>Duplicate Alert:</strong> 1 potential duplicate from Telecom Services (invoice #INV-9987)</li>
</ul>

<h3>Recommendations</h3>
<p>Consider pre-authorizing Acme Corp for recurring monthly charges to reduce exceptions. Review the 2 Office Supplies invoices to determine if shipping should be added to POs automatically. All other exceptions are normal variance and require standard approval workflow.</p>
```

### Fallback Template (if AI fails)

```html
<h2>Weekly Invoice Processing Summary</h2>

<p>Week: {{weekStart}} to {{weekEnd}}</p>

<h3>Metrics</h3>
<ul>
  <li>Total Invoices: {{total_invoices}}</li>
  <li>Auto-Approved: {{approved_count}} ({{approved_percentage}}%)</li>
  <li>Exceptions: {{exception_count}} ({{exception_percentage}}%)</li>
  <li>Paid: {{paid_count}}</li>
  <li>Total Amount: ${{total_amount}}</li>
</ul>

<p>For detailed analysis, visit your dashboard.</p>
```

---

## IMPLEMENTATION NOTES

### Error Handling

**All AI prompts must have:**
1. Retry logic defined
2. Fallback response if retries fail
3. Validation after response
4. Logging for debugging

**Never:**
- Leave process hanging without response
- Use AI response without validation
- Fail silently (always log errors)

### Cost Optimization

**Invoice Extraction:**
- Use GPT-4 Turbo (cheaper than GPT-4)
- Compress images if > 2MB
- Cache results (don't re-extract same invoice)

**Exception Reasoning:**
- Only call if matchConfidence < 80%
- Skip if manual exception reason already set

**Weekly Reports:**
- Run once per week only (Monday 9 AM)
- Don't regenerate if already sent

### Monitoring

Track these metrics:

1. **Extraction Success Rate:**
   - Target: > 95%
   - Alert if < 90% in 24 hours

2. **Average Extraction Time:**
   - Target: < 5 seconds
   - Alert if > 15 seconds

3. **Exception Reasoning Failures:**
   - Target: 0%
   - Use fallback if > 5%

4. **Weekly Report Generation:**
   - Target: 100% (always succeeds with fallback)

### Security

**PII Handling:**
- Extracted data may contain PII
- Store securely in database
- Do NOT log full invoice data
- Comply with data retention policies

**API Keys:**
- Store OpenAI key in environment variable
- Rotate every 90 days
- Monitor usage for anomalies

---

**End of AI prompts and schemas. Use these exact prompts in n8n workflows for consistent, deterministic results.**
