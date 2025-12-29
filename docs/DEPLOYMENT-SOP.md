# DEPLOYMENT SOP
# Touchless Ops Triage — Production Deployment

**Purpose:** Step-by-step guide to deploy backend, n8n workflows, and front-end to production.

---

## DEPLOYMENT OVERVIEW

**Components to deploy:**
1. Backend API (Node.js server)
2. PostgreSQL database
3. n8n workflows (cloud or self-hosted)
4. Lovable front-end

**Deployment options:**
- **Easy:** Backend on Railway/Render, n8n Cloud, Lovable hosting
- **Advanced:** Docker on VPS, self-hosted n8n, custom domain

---

## OPTION 1: EASY DEPLOYMENT (RECOMMENDED)

### Step 1: Deploy Backend to Railway

1. Go to railway.app
2. Sign up / Login
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Connect GitHub account
6. Select your backend repo (or create new repo with server.ts)
7. Railway auto-detects Node.js
8. Add PostgreSQL database:
   - Click **New** → **Database** → **PostgreSQL**
   - Railway provisions database automatically
9. Set environment variables:
   - Click **Variables** tab
   - Add:
     - `PORT` = `3000`
     - `DATABASE_URL` = (Railway auto-populates from Postgres)
     - `JWT_SECRET` = Generate secure random string
     - `NODE_ENV` = `production`
10. Click **Deploy**
11. Wait 2-3 minutes
12. Get deployment URL: `https://your-app.railway.app`

**Test deployment:**

```bash
curl https://your-app.railway.app/health

# Expected: {"status":"healthy","timestamp":"..."}
```

**Generate JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy output → Paste into Railway environment variables.

### Step 2: Deploy n8n to n8n Cloud

1. Go to n8n.cloud
2. Sign up for account
3. Select plan: Pro ($20/month recommended)
4. Create workspace
5. Import workflows (follow N8N-WORKFLOWS-SOP.md)
6. Update environment variables in each workflow:
   - `BACKEND_URL` = Your Railway URL
   - `TENANT_ID` = 1 (or client's tenant ID)
7. Add credentials (Gmail, OpenAI, Xero/QBO, SMTP)
8. Activate all 7 workflows
9. Test: Send sample invoice email

**n8n Cloud benefits:**
- Auto-scaling
- 99.9% uptime SLA
- Automatic backups
- No server management

### Step 3: Deploy Front-End on Lovable

1. Build front-end in Lovable (follow LOVABLE-FRONTEND-SPEC.md)
2. Set environment variable:
   - `VITE_API_BASE_URL` = Your Railway backend URL
3. Click **Deploy** button
4. Lovable builds and hosts automatically
5. Get URL: `https://your-project.lovable.app`
6. Update backend CORS:

Edit server.ts:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-project.lovable.app'
  ]
}));
```

Commit and push → Railway redeploys.

7. Test: Login from Lovable URL

**Custom domain (optional):**
1. In Lovable: Settings → Custom Domain
2. Enter: `app.44automation.com`
3. Update DNS:
   - Add CNAME record: `app` → `your-project.lovable.app`
4. Wait 10 minutes for DNS propagation
5. Update backend CORS with custom domain
6. Test: Login from `app.44automation.com`

---

## OPTION 2: DOCKER DEPLOYMENT (ADVANCED)

### Prerequisites

- Ubuntu VPS (2 vCPU, 4GB RAM minimum)
- Docker installed
- Domain name with DNS access

### Step 1: Prepare VPS

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create project directory
mkdir -p /opt/touchless-ops
cd /opt/touchless-ops
```

### Step 2: Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: touchless_ops
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - app-network

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/touchless_ops
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      PORT: 3000
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - app-network

  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: true
      N8N_BASIC_AUTH_USER: ${N8N_USER}
      N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD}
      N8N_HOST: n8n.yourdomain.com
      WEBHOOK_URL: https://n8n.yourdomain.com/
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - n8n
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  n8n_data:

networks:
  app-network:
    driver: bridge
```

### Step 3: Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install TypeScript and ts-node
RUN npm install -g typescript ts-node

# Copy source code
COPY server.ts ./

# Expose port
EXPOSE 3000

# Start server
CMD ["ts-node", "server.ts"]
```

### Step 4: Create Nginx Config

Create `nginx.conf`:

```nginx
events {
  worker_connections 1024;
}

http {
  upstream backend {
    server backend:3000;
  }

  upstream n8n {
    server n8n:5678;
  }

  server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }

  server {
    listen 80;
    server_name n8n.yourdomain.com;

    location / {
      proxy_pass http://n8n;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

### Step 5: Create Environment File

Create `.env`:

```env
POSTGRES_PASSWORD=GENERATE_SECURE_PASSWORD
JWT_SECRET=GENERATE_64_CHAR_HEX_STRING
N8N_USER=admin
N8N_PASSWORD=GENERATE_SECURE_PASSWORD
```

**Generate secure values:**

```bash
# PostgreSQL password
openssl rand -base64 32

# JWT secret
openssl rand -hex 64

# n8n password
openssl rand -base64 24
```

Paste generated values into `.env` file.

### Step 6: Deploy

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# Expected: All services "Up"

# View logs
docker-compose logs -f backend

# Test backend
curl http://localhost:3000/health

# Expected: {"status":"healthy"...}
```

### Step 7: Configure DNS

Point these domains to your server IP:

- `api.yourdomain.com` → A record → `your-server-ip`
- `n8n.yourdomain.com` → A record → `your-server-ip`
- `app.yourdomain.com` → CNAME → `your-project.lovable.app` (if using Lovable)

Wait 10 minutes for DNS propagation.

### Step 8: Add SSL (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Stop nginx container temporarily
docker-compose stop nginx

# Generate certificates
certbot certonly --standalone -d api.yourdomain.com
certbot certonly --standalone -d n8n.yourdomain.com

# Certificates saved to /etc/letsencrypt/live/

# Copy to project directory
mkdir -p ssl
cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem ssl/api-cert.pem
cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem ssl/api-key.pem
cp /etc/letsencrypt/live/n8n.yourdomain.com/fullchain.pem ssl/n8n-cert.pem
cp /etc/letsencrypt/live/n8n.yourdomain.com/privkey.pem ssl/n8n-key.pem

# Update nginx.conf to use SSL (add server blocks for 443)

# Restart nginx
docker-compose up -d nginx

# Test HTTPS
curl https://api.yourdomain.com/health
```

### Step 9: Import n8n Workflows

1. Go to `https://n8n.yourdomain.com`
2. Login with credentials from `.env`
3. Follow N8N-WORKFLOWS-SOP.md to import all 7 workflows
4. Update environment variables to use production URLs
5. Activate workflows

### Step 10: Update Lovable Front-End

1. In Lovable project settings
2. Update `VITE_API_BASE_URL` = `https://api.yourdomain.com`
3. Redeploy
4. Test login from front-end

---

## ENVIRONMENT VARIABLES REFERENCE

### Backend (server.ts)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT signing (64+ chars) |
| `NODE_ENV` | No | `development` | Environment (development/production) |

### n8n Workflows

Each workflow needs these variables (set in workflow settings):

| Variable | Workflow | Description |
|----------|----------|-------------|
| `TENANT_ID` | 1, 2, 7 | Client tenant ID |
| `BACKEND_URL` | All | Backend API URL |
| `WORKFLOW_ID_EXTRACTION` | 1, 2 | ID of workflow 3 |
| `WORKFLOW_ID_MATCHING` | 3 | ID of workflow 4 |
| `WORKFLOW_ID_NOTIFICATIONS` | 4 | ID of workflow 6 |
| `SMTP_FROM` | 6 | From email for notifications |
| `REPORT_RECIPIENT_EMAIL` | 7 | Email for weekly reports |

### Lovable Front-End

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API URL (e.g., https://api.yourdomain.com) |

---

## LOGS & MONITORING

### Backend Logs

**Railway:**
- Dashboard → Deployments → Click deployment → View logs

**Docker:**
```bash
docker-compose logs -f backend

# Filter errors only
docker-compose logs backend | grep ERROR
```

### n8n Execution Logs

**n8n Cloud:**
- Workflows → Executions tab → Click execution → View details

**Self-Hosted:**
- Web UI → Executions → Click execution

### Database Logs

**Docker:**
```bash
docker-compose logs -f postgres
```

### Health Checks

**Backend:**
```bash
# Health endpoint
curl https://api.yourdomain.com/health

# Expected: {"status":"healthy","timestamp":"..."}

# If unhealthy: Check database connection
```

**n8n:**
- Check workflow executions (should show regular runs)
- If no executions: Check workflows active

**Database:**
```bash
# Connect to database
docker exec -it touchless-ops_postgres_1 psql -U postgres -d touchless_ops

# Check tables exist
\dt

# Check invoice count
SELECT COUNT(*) FROM invoices;

# Exit
\q
```

---

## BACKUP & RESTORE

### Database Backup (Automated)

**Daily backup script:**

Create `/opt/touchless-ops/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/opt/touchless-ops/backups"
mkdir -p $BACKUP_DIR

docker exec touchless-ops_postgres_1 pg_dump -U postgres touchless_ops | gzip > $BACKUP_DIR/backup-$DATE.sql.gz

# Keep last 7 days
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup-$DATE.sql.gz"
```

Make executable:
```bash
chmod +x /opt/touchless-ops/backup.sh
```

**Schedule daily backup (cron):**

```bash
crontab -e

# Add line (runs daily at 2 AM):
0 2 * * * /opt/touchless-ops/backup.sh >> /var/log/touchless-ops-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop backend
docker-compose stop backend

# Restore database
gunzip < backups/backup-2025-12-28.sql.gz | docker exec -i touchless-ops_postgres_1 psql -U postgres -d touchless_ops

# Start backend
docker-compose up -d backend

# Verify
curl https://api.yourdomain.com/health
```

---

## SCALING CONSIDERATIONS

### When to Scale

**Signs you need more resources:**
- API response time > 1 second
- Database connection errors
- n8n workflows timing out
- Server CPU > 80% consistently

### Scaling Options

**Backend:**
- Railway: Increase plan (more CPU/RAM)
- Docker: Add more backend containers (load balanced)

**Database:**
- Railway: Upgrade database plan
- Docker: Use managed PostgreSQL (AWS RDS, DigitalOcean)

**n8n:**
- n8n Cloud: Upgrade plan (more executions)
- Self-hosted: Increase container resources

---

## SECURITY CHECKLIST

Before production:

- [ ] JWT_SECRET is random 64+ character string
- [ ] Database password is strong (32+ characters)
- [ ] HTTPS enabled on all domains
- [ ] n8n protected with authentication
- [ ] Backend CORS configured (only allow front-end domain)
- [ ] Database not publicly accessible
- [ ] SSH key authentication (disable password login)
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Automatic security updates enabled
- [ ] Backup script running daily

---

## ROLLBACK PROCEDURE

If deployment breaks production:

### Railway

1. Go to deployments
2. Click previous working deployment
3. Click "Redeploy"
4. Wait 2 minutes
5. Test: `curl https://api.yourdomain.com/health`

### Docker

```bash
# Stop all services
docker-compose down

# Checkout previous version
git log --oneline
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose up -d --build

# Verify
docker-compose ps
```

### n8n Workflows

1. Open workflow
2. Click "Versions" (top right)
3. Select previous version
4. Click "Restore"
5. Save and re-activate

---

## POST-DEPLOYMENT CHECKLIST

After deployment, verify:

- [ ] Backend health endpoint returns 200 OK
- [ ] Demo login works from front-end
- [ ] Database contains seed data
- [ ] All 7 n8n workflows show "Active" status
- [ ] Send test invoice email → Appears in dashboard
- [ ] Approve test invoice → Status updates
- [ ] Notification sent successfully
- [ ] HTTPS works (no certificate warnings)
- [ ] CORS allows front-end requests
- [ ] Logs show no errors
- [ ] Backup script configured and tested

---

**End of deployment SOP. Choose Option 1 (Easy) for fastest deployment. Use Option 2 (Docker) for full control and multi-tenant hosting.**
