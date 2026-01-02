# Touchless Ops Triage - Complete Automation Product

## 🎯 Overview

A fully automated invoice processing system for 44 Automation Ltd. This system processes invoices from email to accounting with 70-90% automation using AI extraction and workflow automation.

## 🏗️ Architecture

### Tech Stack
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL (Railway)
- **Automation**: n8n workflows
- **AI**: OpenAI GPT-4 Vision for invoice extraction
- **Email**: Gmail API integration
- **Accounting**: Xero API integration
- **Hosting**: Railway (backend + database)

### Components

1. **Backend API** (✅ DEPLOYED)
   - Multi-tenant SaaS architecture
   - JWT authentication
   - RESTful endpoints for invoices, users, dashboard
   - Live URL: `https://touchless-ops-backend-production.up.railway.app`

2. **Database** (✅ DEPLOYED)
   - PostgreSQL 15 on Railway
   - Auto-migrations on startup
   - Tables: tenants, users, invoices

3. **n8n Workflows** (Pending)
   - Email monitoring workflow
   - Invoice extraction workflow
   - Approval routing workflow
   - Xero sync workflow

4. **Frontend Dashboard** (Pending)
   - Built with Lovable.dev
   - Invoice review interface
   - Analytics dashboard
   - User management

## 🚀 Deployment Details

### Railway Project
- **Project**: pleasing-contentment
- **Environment**: production
- **Region**: us-west2
- **Node Version**: 22.11

### Environment Variables
```
PORT=3000
NODE_ENV=production
DATABASE_URL=<Railway PostgreSQL connection string>
JWT_SECRET=a1f2d8e9c4b7a3f1e8d2c9b6a5f4e3d2c1b9a8f7e6d5c4b3a2f1e9d8c7b6a5f4
```

### Database Schema

**Tenants Table**
- id (serial primary key)
- domain (unique)
- company_name
- settings (jsonb)
- created_at

**Users Table**
- id (serial primary key)
- tenant_id (foreign key)
- email (unique)
- password_hash
- role
- created_at

**Invoices Table**
- id (serial primary key)
- tenant_id (foreign key)
- invoice_number
- supplier_name
- amount
- currency
- invoice_date
- due_date
- status
- extracted_data (jsonb)
- file_url
- created_at
- updated_at

## 🔐 Demo Account

**Email**: admin@demo.44automation.com
**Password**: demo123
**Domain**: demo.44automation.com

## 📡 API Endpoints

### Authentication
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@demo.44automation.com",
  "password": "demo123",
  "domain": "demo.44automation.com"
}

Response:
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {...}
}
```

### Invoices
```bash
GET /api/invoices
Authorization: Bearer <token>

Response:
{
  "success": true,
  "invoices": [...]
}
```

### Dashboard Summary
```bash
GET /api/dashboard/summary
Authorization: Bearer <token>

Response:
{
  "success": true,
  "summary": {
    "totalInvoices": 15,
    "pendingApproval": 3,
    "totalAmount": 45750.00
  }
}
```

### Health Check
```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2025-12-30T..."
}
```

## 🧪 Testing

### Local Testing
```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","password":"demo123","domain":"demo.44automation.com"}'
```

### Production Testing
```bash
# Health check
curl https://touchless-ops-backend-production.up.railway.app/health

# Login
curl -X POST https://touchless-ops-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.44automation.com","password":"demo123","domain":"demo.44automation.com"}'
```

## 📁 Project Structure

```
touchless-ops-triage/
├── backend/
│   ├── server.ts          # Main Express server
│   ├── package.json       # Dependencies
│   ├── .env              # Environment variables (local)
│   └── tsconfig.json     # TypeScript config
├── docker-compose.yml    # Local PostgreSQL setup
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🔧 Local Development

### Prerequisites
- Node.js 18+ 
- Docker Desktop (for local PostgreSQL)
- Git

### Setup Steps

1. **Clone repository**
```bash
git clone https://github.com/brynjaminr/touchless-ops-backend.git
cd touchless-ops-backend
```

2. **Start PostgreSQL**
```bash
docker-compose up -d
```

3. **Install dependencies**
```bash
cd backend
npm install
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your local settings
```

5. **Start server**
```bash
npm start
```

Server runs on `http://localhost:3000`

## 🌐 n8n Workflows (To Be Configured)

### Workflow 1: Email Monitor
- Watches Gmail inbox for new invoices
- Filters emails with PDF attachments
- Triggers invoice extraction

### Workflow 2: Invoice Extractor
- Receives PDF from email monitor
- Calls OpenAI GPT-4 Vision API
- Extracts: supplier, amount, date, invoice number
- Saves to database via backend API

### Workflow 3: Approval Router
- Checks invoice amount thresholds
- Routes for approval if needed
- Sends notifications

### Workflow 4: Xero Sync
- Creates bill in Xero
- Attaches invoice PDF
- Updates status in database

## 📊 Frontend Dashboard (To Be Built)

### Pages
1. **Login** - Authentication
2. **Dashboard** - Analytics and metrics
3. **Invoices** - List and search
4. **Invoice Detail** - Review and approve
5. **Settings** - User and company settings

### Tech Stack
- React (via Lovable.dev)
- TailwindCSS
- shadcn/ui components

## 🔑 Credentials & Access

### Railway
- Email: brynjaminr@gmail.com
- Project: touchless-ops-backend

### n8n
- URL: https://brynr.app.n8n.cloud
- Workspace: Personal

### GitHub
- Repo: https://github.com/brynjaminr/touchless-ops-backend
- Branch: main

### OpenAI
- API Key: `<stored securely - not in version control>`

### Email
- Account: bryn.richards@44automationltd.co.uk
- Provider: Gmail

### Accounting
- System: Xero
- Company: 44 Automation Ltd

## 📈 Roadmap

### Phase 1: Backend (✅ COMPLETE)
- [x] Database schema
- [x] REST API endpoints
- [x] Authentication with JWT
- [x] Deploy to Railway
- [x] Test production API

### Phase 2: n8n Workflows (Next)
- [ ] Configure email monitoring
- [ ] Set up OpenAI integration
- [ ] Build invoice extraction workflow
- [ ] Integrate with backend API
- [ ] Test end-to-end flow

### Phase 3: Frontend Dashboard (Next)
- [ ] Build with Lovable.dev
- [ ] Implement authentication
- [ ] Create invoice list view
- [ ] Create invoice detail view
- [ ] Add approval functionality
- [ ] Deploy to production

### Phase 4: Production Launch
- [ ] Gmail OAuth setup
- [ ] Xero OAuth setup
- [ ] Pilot client onboarding
- [ ] Monitor and optimize
- [ ] Scale to more clients

## 🆘 Troubleshooting

### Backend Issues

**Server won't start locally**
- Check Docker is running: `docker ps`
- Check PostgreSQL is accessible: `docker logs touchless-postgres`
- Verify .env file exists and has correct values

**Authentication fails**
- Verify JWT_SECRET matches between environments
- Check user exists in database
- Verify password is correct (demo123 for demo account)

**Database connection fails**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify network connectivity

### Railway Issues

**Build fails**
- Check build logs in Railway dashboard
- Verify package.json has correct dependencies
- Ensure root directory is set to "backend"

**Deploy crashes**
- Check deployment logs
- Verify all environment variables are set
- Ensure DATABASE_URL references Railway Postgres

**bcrypt errors**
- Ensure node_modules is not committed to git
- Railway must run `npm install` on Linux servers
- Add node_modules to .gitignore

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/brynjaminr/touchless-ops-backend/issues
- Email: brynjaminr@gmail.com

## 📄 License

Proprietary - 44 Automation Ltd
