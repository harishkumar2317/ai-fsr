const fs = require('fs');
const path = require('path');

const USE_PG = !!process.env.DATABASE_URL;

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', organization_id INTEGER, phone TEXT, avatar TEXT,
    status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, plant TEXT NOT NULL, code TEXT, address TEXT,
    fssai_license TEXT, fssai_category TEXT DEFAULT 'State', contact_person TEXT, designation TEXT,
    email TEXT, phone TEXT, status TEXT DEFAULT 'Active', compliance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY, audit_id TEXT UNIQUE NOT NULL, type TEXT NOT NULL, organization_id INTEGER,
    plant TEXT, auditor TEXT, date TEXT, score INTEGER, status TEXT DEFAULT 'Scheduled',
    findings TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY, incident_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT,
    severity TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open', organization_id INTEGER,
    reported_by TEXT, assigned_to TEXT, date TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS capa (
    id SERIAL PRIMARY KEY, capa_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT,
    type TEXT DEFAULT 'Corrective', priority TEXT DEFAULT 'Medium', status TEXT DEFAULT 'Open',
    organization_id INTEGER, assigned_to TEXT, due_date TEXT, progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, type TEXT, version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'Draft', organization_id INTEGER, uploaded_by TEXT, file_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT, frequency TEXT DEFAULT 'Daily',
    status TEXT DEFAULT 'Pending', assignee TEXT, regulation TEXT, action TEXT,
    organization_id INTEGER, due_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY, product_name TEXT NOT NULL, status TEXT DEFAULT 'Pending',
    score INTEGER, issues TEXT, organization_id INTEGER, validated_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, message TEXT, type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0, user_id INTEGER, organization_id INTEGER, created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, details TEXT,
    ip_address TEXT, created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY, sender_id INTEGER NOT NULL, receiver_id INTEGER NOT NULL,
    message TEXT NOT NULL, read INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
  )`
];

if (USE_PG) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const queryAll = async (sql, params = []) => (await pool.query(sql, params)).rows;
  const queryOne = async (sql, params = []) => { const r = await pool.query(sql, params); return r.rows[0] || null; };
  const runSQL = async (sql, params = []) => await pool.query(sql, params);

  async function initDB() {
    const client = await pool.connect();
    try {
      for (const sql of SCHEMA_SQL) {
        try { await client.query(sql); } catch(e) {}
      }
      try { await client.query(`ALTER TABLE users ADD CONSTRAINT fk_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL`); } catch(e) {}
      try { await client.query(`ALTER TABLE checklist ADD COLUMN IF NOT EXISTS action TEXT`); } catch(e) {}
      try { await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS fssai_category TEXT DEFAULT 'State'`); } catch(e) {}
      try { await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_person TEXT`); } catch(e) {}
      try { await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS designation TEXT`); } catch(e) {}
      try { await client.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email TEXT`); } catch(e) {}
      try { await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read INTEGER DEFAULT 0`); } catch(e) {}
      console.log('PostgreSQL tables created.');
    } finally {
      client.release();
    }
  }

  module.exports = { initDB, pool, queryAll, queryOne, runSQL };
} else {
  const initSqlJs = require('sql.js');
  const DB_PATH = path.join(__dirname, 'ai_fsr.db');
  let db;

  function pgToSqlite(sql) {
    let s = sql;
    s = s.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    s = s.replace(/TIMESTAMP DEFAULT NOW\(\)/g, "DEFAULT CURRENT_TIMESTAMP");
    s = s.replace(/\bTIMESTAMP\b/g, 'TEXT');
    s = s.replace(/,\s*FOREIGN KEY[^,)]*\([^)]*\)\s*REFERENCES\s*\w+\s*\(\s*id\s*\)[^,)]*/gi, '');
    return s;
  }

  function convertQuery(sql, params) {
    let s = sql;
    let p = params ? [...params] : [];

    let returningCols = null;
    const retMatch = s.match(/\bRETURNING\s+([\w\s,*]+?)\s*$/i);
    if (retMatch) {
      returningCols = retMatch[1].trim();
      s = s.replace(/\s*RETURNING\s+[\w\s,*]+?\s*$/i, '');
    }

    if (p.length) {
      s = s.replace(/\$(\d+)/g, '?');
    }

    s = s.replace(/NOW\(\)/g, "CURRENT_TIMESTAMP");
    s = s.replace(/COUNT\(\*\)::int/gi, 'CAST(COUNT(*) AS INTEGER)');

    s = s.replace(/COUNT\(\*\)\s*FILTER\s*\(WHERE\s+([^)]+)\)\s*::int/gi, (_, cond) => {
      let c = cond.replace(/\$(\d+)/g, '?');
      return `CAST(COALESCE(SUM(CASE WHEN ${c} THEN 1 ELSE 0 END), 0) AS INTEGER)`;
    });

    s = s.replace(/COUNT\(\*\)\s*FILTER\s*\(WHERE\s+([^)]+)\)/gi, (_, cond) => {
      let c = cond.replace(/\$(\d+)/g, '?');
      return `COALESCE(SUM(CASE WHEN ${c} THEN 1 ELSE 0 END), 0)`;
    });

    const anyRegex = /(\w+)\s*=\s*ANY\(\?\)/i;
    const anyMatch = s.match(anyRegex);
    if (anyMatch) {
      const col = anyMatch[1];
      const idx = s.indexOf(`${col} = ANY(?)`);
      const before = s.substring(0, idx);
      const paramIdx = (before.match(/\?/g) || []).length;
      const arr = p[paramIdx];
      if (Array.isArray(arr)) {
        if (arr.length === 0) {
          return { sql: 'SELECT 1 WHERE 0=1', params: [], returningCols: null };
        }
        s = s.replace(`${col} = ANY(?)`, `${col} IN (${arr.map(() => '?').join(',')})`);
        p.splice(paramIdx, 1, ...arr);
      }
    }

    return { sql: s, params: p, returningCols };
  }

  function saveDB() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  function execWithParams(sql, params) {
    const stmt = db.prepare(sql);
    if (params && params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  const queryAll = async (sql, params = []) => {
    const converted = convertQuery(sql, params);
    return execWithParams(converted.sql, converted.params);
  };

  const queryOne = async (sql, params = []) => {
    const rows = await queryAll(sql, params);
    return rows[0] || null;
  };

  const runSQL = async (sql, params = []) => {
    const converted = convertQuery(sql, params);
    const isInsert = /^\s*INSERT/i.test(converted.sql);

    if (isInsert) {
      const stmt = db.prepare(converted.sql);
      if (converted.params.length) stmt.bind(converted.params);
      stmt.step();
      stmt.free();
    } else {
      execWithParams(converted.sql, converted.params);
    }
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const id = idResult.length ? idResult[0].values[0][0] : 0;
    saveDB();

    if (converted.returningCols && isInsert) {
      const tableName = converted.sql.match(/INTO\s+(\w+)/i)?.[1];
      if (tableName && id) {
        try {
          const rows = execWithParams(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
          return { rows, rowCount: rows.length || 1 };
        } catch(e) {}
      }
      if (converted.returningCols === '*') {
        return { rows: id ? [{ id }] : [], rowCount: id ? 1 : 0 };
      }
      const cols = converted.returningCols.split(',').map(c => c.trim());
      const row = { id };
      return { rows: [row], rowCount: 1 };
    }

    return { rows: [], rowCount: 1, lastID: id };
  };

  async function initDB() {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');

    for (const sql of SCHEMA_SQL) {
      try { db.run(pgToSqlite(sql)); } catch(e) {}
    }
    saveDB();
    console.log('SQLite database created.');
  }

  module.exports = { initDB, pool: null, queryAll, queryOne, runSQL };
}
