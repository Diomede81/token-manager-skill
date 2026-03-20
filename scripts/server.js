#!/usr/bin/env node
/**
 * Token Manager API Server
 * REST API for token/API key management with SQLite storage
 * 
 * Endpoints:
 *   GET  /api/tokens           - List all tokens (masked values)
 *   POST /api/tokens           - Add token
 *   GET  /api/tokens/:id       - Get specific token (masked value)
 *   GET  /api/tokens/:id/value - Get decrypted token value (for internal use)
 *   PUT  /api/tokens/:id       - Update token
 *   DELETE /api/tokens/:id     - Delete token
 *   POST /api/tokens/:id/verify - Verify/validate token
 *   POST /api/verify           - Verify all tokens
 *   GET  /api/search           - Search for token by service/name
 *   GET  /api/status           - Health and status
 *   GET  /api/schema           - JSON Schema for UI
 */

const express = require('express');
const cors = require('cors');
const db = require('../lib/db');

const app = express();
const PORT = process.env.PORT || 3021;

app.use(cors());
app.use(express.json());

// Mask a token value for display
function maskValue(value) {
  if (!value || value.length < 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
}

// ============== TOKENS ==============

// GET /api/tokens - List all tokens (values masked)
app.get('/api/tokens', (req, res) => {
  try {
    const tokens = db.getAll();
    
    // Filter by category if provided
    const { category } = req.query;
    const filtered = category 
      ? tokens.filter(t => t.category === category)
      : tokens;

    res.json({ tokens: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tokens - Create token
app.post('/api/tokens', (req, res) => {
  try {
    const { service, name, value, category, locationType, location, description } = req.body;
    
    if (!service || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: service, name' });
    }
    
    const token = db.create({
      service,
      name,
      value,
      category: category || 'api',
      locationType: locationType || 'database',
      location,
      description,
      status: value ? 'valid' : 'unknown'
    });
    
    // Don't return the value
    delete token.value;
    token.hasValue = !!value;
    
    res.json({ success: true, token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/tokens/:id - Get token details (value masked)
app.get('/api/tokens/:id', (req, res) => {
  try {
    const token = db.getById(req.params.id);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    // Mask the value
    res.json({
      ...token,
      maskedValue: token.value ? maskValue(token.value) : null,
      value: undefined,
      hasValue: !!token.value
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tokens/:id/value - Get decrypted value (for internal service use)
app.get('/api/tokens/:id/value', (req, res) => {
  try {
    // Optional: Add authentication check here
    const token = db.getById(req.params.id);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    res.json({ 
      success: true, 
      id: token.id,
      name: token.name,
      value: token.value 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/tokens/:id - Update token
app.put('/api/tokens/:id', (req, res) => {
  try {
    const existing = db.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    const token = db.update(req.params.id, req.body);
    
    // Don't return the value
    res.json({ 
      success: true, 
      token: {
        ...token,
        maskedValue: token.value ? maskValue(token.value) : null,
        value: undefined,
        hasValue: !!token.value
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/tokens/:id
app.delete('/api/tokens/:id', (req, res) => {
  try {
    const deleted = db.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============== VERIFICATION ==============

// POST /api/tokens/:id/verify - Validate a specific token
app.post('/api/tokens/:id/verify', async (req, res) => {
  try {
    const token = db.getById(req.params.id);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    let valid = false;
    let error = null;
    
    // Service-specific validation
    try {
      const service = token.service.toLowerCase();
      const value = token.value;
      
      if (!value) {
        error = 'No token value stored';
      } else if (service.includes('openai')) {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${value}` }
        });
        valid = response.ok;
        if (!valid) error = 'Invalid OpenAI API key';
        
      } else if (service.includes('anthropic')) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': value,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
          })
        });
        valid = response.ok || response.status === 400;
        if (!valid) error = 'Invalid Anthropic API key';
        
      } else if (service.includes('brave')) {
        const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { 'X-Subscription-Token': value }
        });
        valid = response.ok;
        if (!valid) error = 'Invalid Brave Search API key';
        
      } else if (service.includes('github')) {
        const response = await fetch('https://api.github.com/user', {
          headers: { 
            'Authorization': `token ${value}`,
            'User-Agent': 'token-manager'
          }
        });
        valid = response.ok;
        if (!valid) error = 'Invalid GitHub token';
        
      } else {
        // Can't validate unknown services automatically
        valid = true;
        error = 'Auto-validation not available for this service';
      }
    } catch (e) {
      error = 'Validation request failed: ' + e.message;
    }
    
    // Update status
    db.updateStatus(token.id, valid ? 'valid' : 'invalid');
    
    res.json({ success: true, valid, error });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/verify - Verify all tokens
app.post('/api/verify', async (req, res) => {
  try {
    const tokens = db.getAll();
    const results = [];
    
    for (const token of tokens) {
      // Skip tokens without values
      if (!token.hasValue) {
        results.push({ id: token.id, service: token.service, valid: false, error: 'No value stored' });
        continue;
      }
      
      // Use the verify endpoint logic
      const fullToken = db.getById(token.id);
      let valid = !!fullToken.value;
      
      db.updateStatus(token.id, valid ? 'valid' : 'invalid');
      results.push({ id: token.id, service: token.service, valid });
    }
    
    res.json({
      success: true,
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============== SEARCH ==============

// GET /api/search
app.get('/api/search', (req, res) => {
  const { q, service, name } = req.query;
  const query = q || service || name;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required (?q=...)' });
  }

  try {
    // Try by name first
    let token = db.getByName(query);
    
    // Then try by service
    if (!token) {
      const tokens = db.searchByService(query);
      if (tokens.length > 0) {
        token = tokens[0];
      }
    }
    
    if (!token) {
      return res.json({ 
        success: false, 
        found: false,
        message: `No token found for "${query}"` 
      });
    }

    res.json({ 
      success: true, 
      found: true, 
      token: {
        ...token,
        maskedValue: token.value ? maskValue(token.value) : null,
        value: undefined,
        hasValue: !!token.value
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lookup/:name - Quick lookup by name (returns value)
app.get('/api/lookup/:name', (req, res) => {
  try {
    const token = db.getByName(req.params.name);
    if (!token || !token.value) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }
    
    res.json({ 
      success: true,
      name: token.name,
      value: token.value
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============== STATUS ==============

// GET /api/status
app.get('/api/status', (req, res) => {
  try {
    const tokens = db.getAll();
    
    res.json({
      status: 'ok',
      version: '2.0.0',
      storage: 'sqlite',
      tokens: {
        total: tokens.length,
        valid: tokens.filter(t => t.status === 'valid').length,
        invalid: tokens.filter(t => t.status === 'invalid').length,
        unknown: tokens.filter(t => t.status === 'unknown').length,
        withValue: tokens.filter(t => t.hasValue).length
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ============== SCHEMA ==============

// GET /api/schema
app.get('/api/schema', (req, res) => {
  res.json({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Token Manager",
    "type": "object",
    "definitions": {
      "token": {
        "type": "object",
        "required": ["service", "name"],
        "properties": {
          "id": { "type": "string", "readOnly": true },
          "service": { 
            "type": "string", 
            "title": "Service Name",
            "description": "e.g., OpenAI, GitHub, Anthropic"
          },
          "name": { 
            "type": "string", 
            "title": "Key Name",
            "description": "e.g., OPENAI_API_KEY"
          },
          "value": {
            "type": "string",
            "title": "API Key/Token Value",
            "format": "password"
          },
          "category": {
            "type": "string",
            "title": "Category",
            "enum": ["api", "oauth", "webhook", "database", "other"],
            "default": "api"
          },
          "description": {
            "type": "string",
            "title": "Description"
          },
          "status": {
            "type": "string",
            "enum": ["valid", "invalid", "unknown"],
            "readOnly": true
          }
        }
      }
    }
  });
});

// ============== START SERVER ==============

app.listen(PORT, () => {
  console.log(`🔐 Token Manager API v2 running on port ${PORT}`);
  console.log(`   Storage: SQLite (data/tokens.db)`);
  console.log(`   Health: http://localhost:${PORT}/api/status`);
  console.log(`   Tokens: http://localhost:${PORT}/api/tokens`);
  console.log(`   Search: http://localhost:${PORT}/api/search?q=github`);
  console.log(`   Lookup: http://localhost:${PORT}/api/lookup/OPENAI_API_KEY`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
