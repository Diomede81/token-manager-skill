/**
 * Token Manager Database
 * SQLite database for token registry
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_DIR = process.env.DB_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'tokens.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'api',
    location_type TEXT DEFAULT 'database',
    location TEXT,
    encrypted_value TEXT,
    description TEXT,
    status TEXT DEFAULT 'unknown',
    created_at TEXT NOT NULL,
    updated_at TEXT,
    last_verified TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_tokens_service ON tokens(service);
  CREATE INDEX IF NOT EXISTS idx_tokens_name ON tokens(name);
  CREATE INDEX IF NOT EXISTS idx_tokens_category ON tokens(category);
`);

// Simple encryption for values stored in DB (use proper key management in production)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 
  crypto.createHash('sha256').update('token-manager-default-key').digest();

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

// Prepared statements
const stmts = {
  getAll: db.prepare('SELECT * FROM tokens ORDER BY service, name'),
  getById: db.prepare('SELECT * FROM tokens WHERE id = ?'),
  getByName: db.prepare('SELECT * FROM tokens WHERE name = ?'),
  getByService: db.prepare('SELECT * FROM tokens WHERE service LIKE ?'),
  insert: db.prepare(`
    INSERT INTO tokens (id, service, name, category, location_type, location, encrypted_value, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE tokens SET 
      service = COALESCE(?, service),
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      location_type = COALESCE(?, location_type),
      location = COALESCE(?, location),
      encrypted_value = COALESCE(?, encrypted_value),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ?
  `),
  updateStatus: db.prepare(`
    UPDATE tokens SET status = ?, last_verified = ?, updated_at = ? WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM tokens WHERE id = ?'),
  count: db.prepare('SELECT COUNT(*) as count FROM tokens'),
};

module.exports = {
  db,
  encrypt,
  decrypt,
  stmts,
  
  // Get all tokens (without decrypted values)
  getAll() {
    return stmts.getAll.all().map(row => ({
      ...row,
      hasValue: !!row.encrypted_value,
      // Don't expose encrypted_value in listings
      encrypted_value: undefined
    }));
  },
  
  // Get single token by ID (with decrypted value)
  getById(id) {
    const row = stmts.getById.get(id);
    if (!row) return null;
    return {
      ...row,
      value: decrypt(row.encrypted_value),
      encrypted_value: undefined
    };
  },
  
  // Get token value only (for use by other services)
  getValue(id) {
    const row = stmts.getById.get(id);
    if (!row) return null;
    return decrypt(row.encrypted_value);
  },
  
  // Find token by name
  getByName(name) {
    const row = stmts.getByName.get(name);
    if (!row) return null;
    return {
      ...row,
      value: decrypt(row.encrypted_value),
      encrypted_value: undefined
    };
  },
  
  // Search tokens by service
  searchByService(service) {
    return stmts.getByService.all(`%${service}%`).map(row => ({
      ...row,
      hasValue: !!row.encrypted_value,
      encrypted_value: undefined
    }));
  },
  
  // Create token
  create(token) {
    const id = crypto.randomBytes(4).toString('hex');
    const now = new Date().toISOString();
    
    stmts.insert.run(
      id,
      token.service,
      token.name,
      token.category || 'api',
      token.locationType || 'database',
      token.location || null,
      token.value ? encrypt(token.value) : null,
      token.description || null,
      token.status || 'unknown',
      now
    );
    
    return { id, ...token, createdAt: now };
  },
  
  // Update token
  update(id, updates) {
    const now = new Date().toISOString();
    
    stmts.update.run(
      updates.service || null,
      updates.name || null,
      updates.category || null,
      updates.locationType || null,
      updates.location || null,
      updates.value ? encrypt(updates.value) : null,
      updates.description || null,
      updates.status || null,
      now,
      id
    );
    
    return this.getById(id);
  },
  
  // Update just status
  updateStatus(id, status) {
    const now = new Date().toISOString();
    stmts.updateStatus.run(status, now, now, id);
  },
  
  // Delete token
  delete(id) {
    const result = stmts.delete.run(id);
    return result.changes > 0;
  },
  
  // Count tokens
  count() {
    return stmts.count.get().count;
  },
  
  // Close database
  close() {
    db.close();
  }
};
