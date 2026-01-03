// ============================================================================
// BACKEND — SINGLE FILE (COPY/PASTE READY)
// 44 Automation — Touchless Ops Triage
// Node.js + TypeScript + Express + PostgreSQL
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import { Pool, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/touchless_ops';
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_USE_RANDOM_STRING';
const SALT_ROUNDS = 10;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================================================
// DATABASE SCHEMA & AUTO-MIGRATION
// ============================================================================

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tenants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        password_hash TEXT,
        magic_link_token TEXT,
        magic_link_expires TIMESTAMPTZ,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, email)
      )
    `);

    // Invoices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        external_id TEXT,
        status TEXT DEFAULT 'pending',
        vendor_name TEXT,
        invoice_number TEXT,
        invoice_date DATE,
        due_date DATE,
        total_amount DECIMAL(12,2),
        currency TEXT DEFAULT 'USD',
        line_items JSONB DEFAULT '[]',
        extracted_data JSONB DEFAULT '{}',
        match_confidence DECIMAL(5,2),
        matched_po TEXT,
        exception_reason TEXT,
        email_source TEXT,
        attachment_url TEXT,
        accounting_system TEXT,
        accounting_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        approved_by INTEGER REFERENCES users(id),
        paid_at TIMESTAMPTZ
      )
    `);

    // Audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details JSONB DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Email inbox table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_inbox (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        message_id TEXT UNIQUE NOT NULL,
        from_address TEXT,
        subject TEXT,
        body TEXT,
        received_at TIMESTAMPTZ,
        attachments JSONB DEFAULT '[]',
        processed BOOLEAN DEFAULT FALSE,
        processing_error TEXT,
        invoice_id INTEGER REFERENCES invoices(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        recipient TEXT,
        subject TEXT,
        message TEXT,
        sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMPTZ,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Weekly reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        metrics JSONB DEFAULT '{}',
        narrative TEXT,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_tenant ON email_inbox(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_processed ON email_inbox(processed)');

    await client.query('COMMIT');
    console.log('✅ Database schema initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================================
// SEED DATA (LOCAL TESTING)
// ============================================================================

const seedData = async () => {
  const client = await pool.connect();
  try {
    // Check if demo tenant exists
    const tenantCheck = await client.query('SELECT id FROM tenants WHERE domain = $1', ['demo.44automation.com']);

    if (tenantCheck.rows.length === 0) {
      // Create demo tenant
      const tenantResult = await client.query(
        'INSERT INTO tenants (name, domain, settings) VALUES ($1, $2, $3) RETURNING id',
        ['Demo Company', 'demo.44automation.com', JSON.stringify({ accounting_system: 'xero' })]
      );
      const tenantId = tenantResult.rows[0].id;

      // Create demo user
      const passwordHash = await bcrypt.hash('demo123', SALT_ROUNDS);
      await client.query(
        'INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [tenantId, 'admin@demo.44automation.com', passwordHash, 'admin']
      );

      // Create sample invoices
      await client.query(`
        INSERT INTO invoices (tenant_id, status, vendor_name, invoice_number, invoice_date, due_date, total_amount, currency, match_confidence, exception_reason)
        VALUES
          ($1, 'pending', 'Acme Corp', 'INV-001', '2025-12-15', '2026-01-15', 1250.00, 'USD', 95.5, NULL),
          ($1, 'exception', 'Widget Inc', 'INV-002', '2025-12-20', '2026-01-20', 3400.00, 'USD', 45.2, 'No matching PO found'),
          ($1, 'approved', 'Tools Ltd', 'INV-003', '2025-12-10', '2026-01-10', 850.00, 'USD', 98.1, NULL)
      `, [tenantId]);

      console.log('✅ Demo data seeded');
      console.log('   Email: admin@demo.44automation.com');
      console.log('   Password: demo123');
    }
  } catch (error) {
    console.error('❌ Seed data failed:', error);
  } finally {
    client.release();
  }
};

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

interface AuthRequest extends Request {
  user?: {
    id: number;
    tenantId: number;
    email: string;
    role: string;
  };
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================================================
// AUDIT LOGGING
// ============================================================================

const logAudit = async (
  tenantId: number,
  userId: number | null,
  action: string,
  entityType: string | null,
  entityId: number | null,
  details: object,
  req?: Request
) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (tenant_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        req?.ip || null,
        req?.headers['user-agent'] || null
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
  }
};

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

// Login with email/password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, domain } = req.body;

    if (!email || !password || !domain) {
      return res.status(400).json({ error: 'Email, password, and domain required' });
    }

    const result = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.role, t.domain
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND t.domain = $2`,
      [email, domain]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenant_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.tenant_id, user.id, 'login', 'user', user.id, { email }, req);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Request magic link
app.post('/api/auth/magic-link', async (req: Request, res: Response) => {
  try {
    const { email, domain } = req.body;

    const result = await pool.query(
      `SELECT u.id, u.tenant_id FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND t.domain = $2`,
      [email, domain]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists
      return res.json({ message: 'If account exists, magic link sent' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    // In production, send email here
    console.log(`Magic link for ${email}: /auth/verify?token=${token}`);

    await logAudit(user.tenant_id, user.id, 'magic_link_requested', 'user', user.id, { email }, req);

    res.json({ message: 'If account exists, magic link sent' });
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify magic link
app.post('/api/auth/verify-magic', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const result = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.role
       FROM users u
       WHERE u.magic_link_token = $1 AND u.magic_link_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = result.rows[0];

    // Clear magic link
    await pool.query(
      'UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL WHERE id = $1',
      [user.id]
    );

    const jwtToken = jwt.sign(
      { id: user.id, tenantId: user.tenant_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit(user.tenant_id, user.id, 'magic_link_login', 'user', user.id, { email: user.email }, req);

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Magic link verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================================================
// INVOICE ENDPOINTS
// ============================================================================

// Get all invoices (filtered by tenant)
app.get('/api/invoices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM invoices WHERE tenant_id = $1';
    const params: any[] = [req.user!.tenantId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    res.json({
      invoices: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
app.get('/api/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
      [id, req.user!.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice (from n8n webhook)
app.post('/api/invoices', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      externalId,
      vendorName,
      invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount,
      currency,
      lineItems,
      extractedData,
      matchConfidence,
      matchedPo,
      exceptionReason,
      emailSource,
      attachmentUrl,
      accountingSystem
    } = req.body;

    if (!tenantId || !vendorName || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const status = exceptionReason ? 'exception' : (matchConfidence > 80 ? 'pending' : 'exception');

    const result = await pool.query(
      `INSERT INTO invoices (
        tenant_id, external_id, status, vendor_name, invoice_number, invoice_date, due_date,
        total_amount, currency, line_items, extracted_data, match_confidence, matched_po,
        exception_reason, email_source, attachment_url, accounting_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        tenantId, externalId, status, vendorName, invoiceNumber, invoiceDate, dueDate,
        totalAmount, currency, JSON.stringify(lineItems || []), JSON.stringify(extractedData || {}),
        matchConfidence, matchedPo, exceptionReason, emailSource, attachmentUrl, accountingSystem
      ]
    );

    await logAudit(tenantId, null, 'invoice_created', 'invoice', result.rows[0].id, { invoiceNumber, vendorName });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
app.patch('/api/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'status', 'vendor_name', 'invoice_number', 'invoice_date', 'due_date',
      'total_amount', 'currency', 'line_items', 'extracted_data', 'match_confidence',
      'matched_po', 'exception_reason', 'accounting_id'
    ];

    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(typeof updates[key] === 'object' ? JSON.stringify(updates[key]) : updates[key]);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push('updated_at = NOW()');
    values.push(id, req.user!.tenantId);

    const result = await pool.query(
      `UPDATE invoices SET ${setClause.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await logAudit(req.user!.tenantId, req.user!.id, 'invoice_updated', 'invoice', parseInt(id), updates, req);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Approve invoice
app.post('/api/invoices/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE invoices
       SET status = 'approved', approved_at = NOW(), approved_by = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND status IN ('pending', 'exception')
       RETURNING *`,
      [req.user!.id, id, req.user!.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or cannot be approved' });
    }

    await logAudit(req.user!.tenantId, req.user!.id, 'invoice_approved', 'invoice', parseInt(id), {}, req);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve invoice error:', error);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
});

// Reject invoice
app.post('/api/invoices/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE invoices
       SET status = 'rejected', exception_reason = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [reason || 'Rejected by user', id, req.user!.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await logAudit(req.user!.tenantId, req.user!.id, 'invoice_rejected', 'invoice', parseInt(id), { reason }, req);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reject invoice error:', error);
    res.status(500).json({ error: 'Failed to reject invoice' });
  }
});

// Mark invoice as paid (from accounting system webhook)
app.post('/api/invoices/:id/paid', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.body;

    const result = await pool.query(
      `UPDATE invoices
       SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await logAudit(tenantId, null, 'invoice_paid', 'invoice', parseInt(id), {});

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// Get dashboard summary
app.get('/api/dashboard/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'exception') as exception_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        SUM(total_amount) FILTER (WHERE status = 'pending') as pending_total,
        SUM(total_amount) FILTER (WHERE status = 'exception') as exception_total,
        SUM(total_amount) FILTER (WHERE status = 'approved') as approved_total,
        SUM(total_amount) FILTER (WHERE status = 'paid') as paid_total
       FROM invoices
       WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [req.user!.tenantId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Get recent activity
app.get('/api/dashboard/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.tenantId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ============================================================================
// EMAIL INBOX ENDPOINTS (for n8n)
// ============================================================================

// Store inbound email
app.post('/api/emails/inbound', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      messageId,
      fromAddress,
      subject,
      body,
      receivedAt,
      attachments
    } = req.body;

    if (!tenantId || !messageId) {
      return res.status(400).json({ error: 'tenantId and messageId required' });
    }

    const result = await pool.query(
      `INSERT INTO email_inbox (tenant_id, message_id, from_address, subject, body, received_at, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (message_id) DO NOTHING
       RETURNING *`,
      [tenantId, messageId, fromAddress, subject, body, receivedAt, JSON.stringify(attachments || [])]
    );

    res.status(201).json(result.rows[0] || { message: 'Duplicate email skipped' });
  } catch (error) {
    console.error('Store email error:', error);
    res.status(500).json({ error: 'Failed to store email' });
  }
});

// Mark email as processed
app.patch('/api/emails/:id/processed', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { invoiceId, error } = req.body;

    await pool.query(
      `UPDATE email_inbox
       SET processed = TRUE, invoice_id = $1, processing_error = $2
       WHERE id = $3`,
      [invoiceId || null, error || null, id]
    );

    res.json({ message: 'Email marked as processed' });
  } catch (error) {
    console.error('Mark processed error:', error);
    res.status(500).json({ error: 'Failed to mark email as processed' });
  }
});

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

// Queue notification
app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const { tenantId, type, channel, recipient, subject, message } = req.body;

    const result = await pool.query(
      `INSERT INTO notifications (tenant_id, type, channel, recipient, subject, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, type, channel, recipient, subject, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Queue notification error:', error);
    res.status(500).json({ error: 'Failed to queue notification' });
  }
});

// Get pending notifications (for n8n to poll)
app.get('/api/notifications/pending', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE sent = FALSE ORDER BY created_at LIMIT 100`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as sent
app.patch('/api/notifications/:id/sent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = req.body;

    await pool.query(
      `UPDATE notifications SET sent = TRUE, sent_at = NOW(), error = $1 WHERE id = $2`,
      [error || null, id]
    );

    res.json({ message: 'Notification marked as sent' });
  } catch (error) {
    console.error('Mark sent error:', error);
    res.status(500).json({ error: 'Failed to mark notification as sent' });
  }
});

// ============================================================================
// WEEKLY REPORTS ENDPOINTS
// ============================================================================

// Create weekly report
app.post('/api/reports/weekly', async (req: Request, res: Response) => {
  try {
    const { tenantId, weekStart, weekEnd, metrics, narrative } = req.body;

    const result = await pool.query(
      `INSERT INTO weekly_reports (tenant_id, week_start, week_end, metrics, narrative)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, weekStart, weekEnd, JSON.stringify(metrics), narrative]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Get weekly metrics (for n8n)
app.get('/api/reports/metrics', async (req: Request, res: Response) => {
  try {
    const { tenantId, weekStart, weekEnd } = req.query;

    if (!tenantId || !weekStart || !weekEnd) {
      return res.status(400).json({ error: 'tenantId, weekStart, and weekEnd required' });
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_invoices,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'exception') as exception_count,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        SUM(total_amount) as total_amount,
        SUM(total_amount) FILTER (WHERE status = 'approved') as approved_amount,
        AVG(match_confidence) as avg_confidence,
        COUNT(DISTINCT vendor_name) as unique_vendors
       FROM invoices
       WHERE tenant_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [tenantId, weekStart, weekEnd]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// ============================================================================
// TENANT MANAGEMENT ENDPOINTS
// ============================================================================

// Create tenant (admin only)
app.post('/api/tenants', async (req: Request, res: Response) => {
  try {
    const { name, domain, settings } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: 'name and domain required' });
    }

    const result = await pool.query(
      `INSERT INTO tenants (name, domain, settings)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, domain, JSON.stringify(settings || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Create user for tenant
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { tenantId, email, password, role } = req.body;

    if (!tenantId || !email) {
      return res.status(400).json({ error: 'tenantId and email required' });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const result = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, email, role, created_at`,
      [tenantId, email, passwordHash, role || 'user']
    );

    await logAudit(tenantId, null, 'user_created', 'user', result.rows[0].id, { email });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    console.log('🚀 Starting Touchless Ops Triage Backend...');

    await initDatabase();
    await seedData();

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
