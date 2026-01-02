# How to Import n8n Workflows

## Step 1: Download the Workflow JSON

The workflow file is located at:
`n8n/01-email-monitor.json`

## Step 2: Import into n8n

### Option A: Copy-Paste Method (Recommended)

1. Open the workflow JSON file and copy all the content
2. In n8n, go to your workflow editor
3. Click the **"..." menu** (three dots) in the top right
4. Select **"Import from File"** or **"Import from URL"**
5. Paste the JSON content
6. Click **"Import"**

### Option B: Download and Upload

1. Download the `01-email-monitor.json` file to your computer
2. In n8n workflow editor, click the **"..." menu**
3. Select **"Import from File"**
4. Choose the downloaded JSON file
5. Click **"Import"**

## Step 3: Configure Credentials

After importing, you'll need to set up these credentials:

### 1. Gmail OAuth2
- Node: "Gmail Trigger" and "Get PDF Attachment"
- Click on the node → "Create New Credential"
- Follow the OAuth2 flow to connect your Gmail account
- Use: bryn.richards@44automationltd.co.uk

### 2. OpenAI API Key
- Node: "OpenAI Extract Invoice Data"
- Click on the node → "Create New Credential"
- Enter your OpenAI API key (stored securely outside of version control)

### 3. Backend API Authentication
- Node: "Save to Backend API"
- You need to get a JWT token first
- Run this command to get a token:

```bash
curl -X POST https://touchless-ops-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","password":"demo123","domain":"demo.44automation.com"}'
```

- Copy the token from the response
- In the "Save to Backend API" node, replace `YOUR_JWT_TOKEN_HERE` with the actual token

## Step 4: Test the Workflow

1. Click **"Test Workflow"** button in the top right
2. Send a test email with a PDF invoice to your Gmail
3. Wait for the workflow to trigger
4. Check the execution log for results

## Step 5: Activate the Workflow

Once tested successfully:

1. Toggle the **"Inactive"** switch to **"Active"**
2. The workflow will now run automatically every minute checking for new emails

## Workflow Overview

This workflow does the following:

1. **Gmail Trigger** - Checks Gmail every minute for new unread emails with attachments
2. **Filter PDF Attachments** - Only processes emails with PDF attachments
3. **Get PDF Attachment** - Downloads the PDF file from the email
4. **OpenAI Extract Invoice Data** - Uses GPT-4 Vision to extract invoice data
5. **Save to Backend API** - Saves the extracted invoice to your backend database

## Troubleshooting

**Gmail not triggering:**
- Make sure Gmail credentials are properly configured
- Check that OAuth2 access was granted
- Verify the email is unread and has a PDF attachment

**OpenAI extraction fails:**
- Verify the API key is correct and has credits
- Check the PDF is readable (not scanned poorly)
- Review the OpenAI node error message

**Backend save fails:**
- Check the JWT token is valid (they expire!)
- Verify the backend URL is correct
- Check backend logs for errors

**Token expired:**
- JWT tokens expire after some time
- Generate a new token using the curl command above
- Update the token in the "Save to Backend API" node
