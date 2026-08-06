const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        organization_id INTEGER,
        phone TEXT,
        avatar TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        plant TEXT NOT NULL,
        code TEXT,
        address TEXT,
        fssai_license TEXT,
        fssai_category TEXT DEFAULT 'State',
        contact_person TEXT,
        designation TEXT,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'Active',
        compliance_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE users ADD CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        audit_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        organization_id INTEGER,
        plant TEXT,
        auditor TEXT,
        date TEXT,
        score INTEGER,
        status TEXT DEFAULT 'Scheduled',
        findings TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        incident_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Open',
        organization_id INTEGER,
        reported_by TEXT,
        assigned_to TEXT,
        date TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS capa (
        id SERIAL PRIMARY KEY,
        capa_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'Corrective',
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Open',
        organization_id INTEGER,
        assigned_to TEXT,
        due_date TEXT,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT,
        version TEXT DEFAULT '1.0',
        status TEXT DEFAULT 'Draft',
        organization_id INTEGER,
        uploaded_by TEXT,
        file_path TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS checklist (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        frequency TEXT DEFAULT 'Daily',
        status TEXT DEFAULT 'Pending',
        assignee TEXT,
        regulation TEXT,
        action TEXT,
        organization_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS labels (
        id SERIAL PRIMARY KEY,
        product_name TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        score INTEGER,
        issues TEXT,
        organization_id INTEGER,
        validated_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        user_id INTEGER,
        organization_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )
    `);

    console.log('PostgreSQL tables created.');
  } finally {
    client.release();
  }
}

async function queryAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows.length ? result.rows[0] : null;
}

async function runSQL(sql, params = []) {
  return await pool.query(sql, params);
}

module.exports = { initDB, pool, queryAll, queryOne, runSQL };
