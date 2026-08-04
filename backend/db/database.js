const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ai_fsr.db');
let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA journal_mode = WAL`);
  db.run(`PRAGMA foreign_keys = ON`);

  createTables();
  seedDemoData();
  saveDB();

  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() {
  return db;
}

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    organization_id INTEGER,
    phone TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audit_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    organization_id INTEGER,
    plant TEXT,
    auditor TEXT,
    date TEXT,
    score INTEGER,
    status TEXT DEFAULT 'Scheduled',
    findings TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    organization_id INTEGER,
    reported_by TEXT,
    assigned_to TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS capa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'Draft',
    organization_id INTEGER,
    uploaded_by TEXT,
    file_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    frequency TEXT DEFAULT 'Daily',
    status TEXT DEFAULT 'Pending',
    assignee TEXT,
    regulation TEXT,
    action TEXT,
    organization_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    score INTEGER,
    issues TEXT,
    organization_id INTEGER,
    validated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    read INTEGER DEFAULT 0,
    user_id INTEGER,
    organization_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
}

function seedDemoData() {
  const userCount = db.exec("SELECT COUNT(*) as c FROM users")[0]?.values[0][0];
  if (userCount > 0) return;

  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('Demo@123', 10);

  db.run(`INSERT INTO organizations (name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score)
    VALUES ('AgroFood Industries Ltd.', 'Main Factory', 'PLT-001', 'Sector 15, Noida, UP', '12345678901234', 'Central', 'Priya Sharma', 'Quality Manager', 'priya.sharma@agrofood.in', '+91 98765 43210', 'Active', 91)`);

  db.run(`INSERT INTO organizations (name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score)
    VALUES ('AgroFood Industries Ltd.', 'Unit B - Dairy', 'PLT-002', 'Sector 16, Noida, UP', '12345678901235', 'Central', 'Ravi Kumar', 'Food Safety Officer', 'ravi.kumar@agrofood.in', '+91 98765 43211', 'Active', 87)`);

  db.run(`INSERT INTO organizations (name, plant, code, address, fssai_license, fssai_category, contact_person, designation, email, phone, status, compliance_score)
    VALUES ('FreshCatch Seafoods', 'Processing Plant', 'PLT-003', 'Mumbai Port, Maharashtra', '23456789012345', 'Central', 'Anita Desai', 'QA Head', 'anita@freshcatch.in', '+91 97654 32109', 'Active', 78)`);

  db.run(`INSERT INTO users (name, email, password, role, organization_id, phone)
    VALUES ('Priya Sharma', 'priya.sharma@agrofood.in', '${hash}', 'admin', 1, '+91 98765 43210')`);

  db.run(`INSERT INTO users (name, email, password, role, organization_id, phone)
    VALUES ('Ravi Kumar', 'ravi.kumar@agrofood.in', '${hash}', 'food_safety_officer', 2, '+91 98765 43211')`);

  db.run(`INSERT INTO users (name, email, password, role, organization_id, phone)
    VALUES ('Sunita Rao', 'sunita.rao@agrofood.in', '${hash}', 'auditor', 1, '+91 98765 43212')`);

  db.run(`INSERT INTO users (name, email, password, role, organization_id, phone)
    VALUES ('Admin User', 'admin@ai-fsr.com', '${hash}', 'super_admin', NULL, '+91 99999 00000')`);

  db.run(`INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status)
    VALUES ('AUD-2026-041', 'Internal', 1, 'Main Factory', 'Sunita Rao', '2026-07-28', 94, 'Completed')`);

  db.run(`INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status)
    VALUES ('AUD-2026-040', 'External', 1, 'Main Factory', 'FSSAI Inspector', '2026-07-22', 91, 'Completed')`);

  db.run(`INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status)
    VALUES ('AUD-2026-039', 'Internal', 2, 'Unit B - Dairy', 'Ravi Kumar', '2026-07-20', 87, 'Completed')`);

  db.run(`INSERT INTO audits (audit_id, type, organization_id, plant, auditor, date, score, status)
    VALUES ('AUD-2026-042', 'Internal', 1, 'Main Factory', 'Sunita Rao', '2026-08-15', NULL, 'Scheduled')`);

  db.run(`INSERT INTO incidents (incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date)
    VALUES ('INC-2026-018', 'Temperature Violation', 'Cold Storage #3 temperature rose to 8C for 45 minutes', 'High', 'Open', 1, 'Ravi Kumar', 'Priya Sharma', '2026-07-28')`);

  db.run(`INSERT INTO incidents (incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date)
    VALUES ('INC-2026-017', 'Foreign Material Found', 'Metal fragment detected in product batch B2026-07', 'Critical', 'In Progress', 1, 'Priya Sharma', 'Ravi Kumar', '2026-07-25')`);

  db.run(`INSERT INTO incidents (incident_id, title, description, severity, status, organization_id, reported_by, assigned_to, date)
    VALUES ('INC-2026-016', 'Pest Sighting', 'Rodent droppings observed in storage area C', 'Medium', 'Closed', 2, 'Ravi Kumar', 'Anita Desai', '2026-07-20')`);

  db.run(`INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress)
    VALUES ('CAPA-026', 'Cold Storage Compressor Repair', 'Replace faulty compressor in Cold Storage #3', 'Corrective', 'High', 'In Progress', 1, 'Ravi Kumar', '2026-08-10', 60)`);

  db.run(`INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress)
    VALUES ('CAPA-025', 'Metal Detector Calibration', 'Recalibrate all metal detectors on production line', 'Corrective', 'Critical', 'In Progress', 1, 'Priya Sharma', '2026-08-05', 40)`);

  db.run(`INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress)
    VALUES ('CAPA-024', 'Pest Control Enhancement', 'Increase pest control frequency in storage areas', 'Preventive', 'Medium', 'Open', 2, 'Anita Desai', '2026-08-20', 10)`);

  db.run(`INSERT INTO capa (capa_id, title, description, type, priority, status, organization_id, assigned_to, due_date, progress)
    VALUES ('CAPA-023', 'Staff Hygiene Training', 'Conduct refresher training on personal hygiene', 'Preventive', 'Low', 'Closed', 1, 'Sunita Rao', '2026-07-30', 100)`);
}

function runSQL(sql, params = []) {
  const db = getDB();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
}

module.exports = { initDB, getDB, saveDB, runSQL };