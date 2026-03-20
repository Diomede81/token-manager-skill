/**
 * Token Registry Manager
 * Handles CRUD operations for token registry
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const CONFIG_DIR = process.env.CONFIG_DIR || path.join(__dirname, '..', 'config');
const REGISTRY_FILE = path.join(CONFIG_DIR, 'registry.json');

// Default registry
const DEFAULT_REGISTRY = {
  version: '1.0.0',
  tokens: [],
  categories: ['api', 'oauth', 'webhook', 'database', 'other']
};

class RegistryManager {
  constructor() {
    this.ensureConfigDir();
    this.registry = this.load();
  }

  ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  load() {
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
        return { ...DEFAULT_REGISTRY, ...JSON.parse(data) };
      }
    } catch (err) {
      console.error('Failed to load registry:', err.message);
    }
    return { ...DEFAULT_REGISTRY };
  }

  save() {
    try {
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(this.registry, null, 2));
      return true;
    } catch (err) {
      console.error('Failed to save registry:', err.message);
      return false;
    }
  }

  // Get full registry
  getRegistry() {
    return { ...this.registry };
  }

  // Token management
  getTokens() {
    return this.registry.tokens || [];
  }

  getToken(id) {
    return this.registry.tokens.find(t => t.id === id);
  }

  findToken(service) {
    const lower = service.toLowerCase();
    return this.registry.tokens.find(t => 
      t.service.toLowerCase().includes(lower) ||
      t.name.toLowerCase().includes(lower)
    );
  }

  addToken(token) {
    // Validate required fields
    if (!token.service || !token.location) {
      throw new Error('Missing required fields: service, location');
    }

    const newToken = {
      id: randomUUID().substring(0, 8),
      ...token,
      createdAt: new Date().toISOString(),
      lastVerified: null,
      status: 'unknown'
    };

    this.registry.tokens.push(newToken);
    this.save();
    return newToken;
  }

  updateToken(id, updates) {
    const index = this.registry.tokens.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Token not found');
    }

    this.registry.tokens[index] = {
      ...this.registry.tokens[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.save();
    return this.registry.tokens[index];
  }

  deleteToken(id) {
    const index = this.registry.tokens.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Token not found');
    }

    this.registry.tokens.splice(index, 1);
    this.save();
    return true;
  }

  // Verify a token exists at its location
  async verifyToken(id) {
    const token = this.getToken(id);
    if (!token) {
      throw new Error('Token not found');
    }

    const result = { exists: false, error: null };

    try {
      const location = token.location.replace('~', process.env.HOME);
      
      if (token.locationType === 'env') {
        result.exists = !!process.env[token.envVar];
      } else if (token.locationType === 'file') {
        result.exists = fs.existsSync(location);
        if (result.exists) {
          const stats = fs.statSync(location);
          result.fileSize = stats.size;
          result.modifiedAt = stats.mtime.toISOString();
        }
      } else if (token.locationType === 'database') {
        // Would need specific DB connection
        result.exists = true; // Assume exists for now
        result.note = 'Database verification not implemented';
      }
    } catch (err) {
      result.error = err.message;
    }

    // Update status
    this.updateToken(id, {
      lastVerified: new Date().toISOString(),
      status: result.exists ? 'valid' : 'missing'
    });

    return result;
  }

  // Verify all tokens
  async verifyAll() {
    const results = [];
    
    for (const token of this.registry.tokens) {
      const result = await this.verifyToken(token.id);
      results.push({
        id: token.id,
        service: token.service,
        ...result
      });
    }

    return {
      total: results.length,
      valid: results.filter(r => r.exists).length,
      missing: results.filter(r => !r.exists).length,
      results
    };
  }

  // Categories
  getCategories() {
    return this.registry.categories;
  }

  addCategory(category) {
    if (!this.registry.categories.includes(category)) {
      this.registry.categories.push(category);
      this.save();
    }
    return this.registry.categories;
  }
}

module.exports = new RegistryManager();
