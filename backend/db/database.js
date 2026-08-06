const fs = require('fs');
const path = require('path');

const USE_PG = !!process.env.DATABASE_URL;

let pool, queryAll, queryOne, runSQL;

if (USE_PG) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  queryAll = async (sql, params = []) => (await pool.query(sql, params)).rows;
  queryOne = async (sql, params = []) => { const r = await pool.query(sql, params); return r.rows[0] || null; };
  runSQL = async (sql, params = []) => await pool.query(sql, params);
} else {
  const initSqlJs = require('sql.js');
  const DB_PATH = path.join(__dirname, 'ai_fsr.db');
  let db;

  function syncQueryAll(sql) {
    const result = db.exec(sql);
    if (!result.length) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      cols.forEach((c, i) => obj[c] = row[i]);
      return obj;
    });
  }

  function saveDB() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  queryAll = async (sql, params = []) => {
    if (params.length) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    }
    return syncQueryAll(sql);
  };

  queryOne = async (sql, params = []) => {
    const rows = await queryAll(sql, params);
    return rows[0] || null;
  };

  runSQL = async (sql, params = []) => {
    if (params.length) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    saveDB();
    return { rows: [] };
  };

  async function initSQLite() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
  }

  module.exports = { initDB: async () => { await initSQLite(); await createTables(); }, queryAll, queryOne, runSQL, pool: null };
  return;
}

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer', organization_id INTEGER, phone TEXT, avatar TEXT,
      status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, plant TEXT NOT NULL, code TEXT, address TEXT,
      fssai_license TEXT, fssai_category TEXT DEFAULT 'State', contact_person TEXT, designation TEXT,
      email TEXT, phone TEXT, status TEXT DEFAULT 'Active', compliance_score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
    try { await client.query(`ALTER TABLE users ADD CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL`); } catch(e) {}
    await client.query(`CREATE TABLE IF NOT EXISTS audits (
      id SERIAL PRIMARY KEY, audit_id TEXT UNIQUE NOT NULL, type TEXT NOT NULL, organization_id INTEGER,
      plant TEXT, auditor TEXT, date TEXT, score INTEGER, status TEXT DEFAULT 'Scheduled',
      findings TEXT, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY, incident_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT,
      severity TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open', organization_id INTEGER,
      reported_by TEXT, assigned_to TEXT, date TEXT, created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS capa (
      id SERIAL PRIMARY KEY, capa_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT,
      type TEXT DEFAULT 'Corrective', priority TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open',
      organization_id INTEGER, assigned_to TEXT, due_date TEXT, progress INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, type TEXT, version TEXT DEFAULT '1.0',
      status TEXT DEFAULT 'Draft', organization_id INTEGER, uploaded_by TEXT, file_path TEXT,
      created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS checklist (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT, frequency TEXT DEFAULT 'Daily',
      status TEXT DEFAULT 'Pending', assignee TEXT, regulation TEXT, action TEXT,
      organization_id INTEGER, due_date TEXT, created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS labels (
      id SERIAL PRIMARY KEY, product_name TEXT NOT NULL, status TEXT DEFAULT 'Pending',
      score INTEGER, issues TEXT, organization_id INTEGER, validated_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, message TEXT, type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0, user_id INTEGER, organization_id INTEGER, created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS activity_log (
      id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, details TEXT,
      ip_address TEXT, created_at TIMESTAMP DEFAULT NOW(), FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY, sender_id INTEGER NOT NULL, receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL, read INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (sender_id) REFERENCES users(id), FOREIGN KEY (receiver_id) REFERENCES users(id)
    )`);
    console.log('PostgreSQL tables created.');
  } finally {
    client.release();
  }
}

async function initDB() {
  await createTables();
}

module.exports = { initDB, pool, queryAll, queryOne, runSQL };
