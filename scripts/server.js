#!/usr/bin/env node
/**
 * Token Manager API Server
 * SuperAgents-compatible REST API for token registry management
 * 
 * Endpoints:
 *   GET  /api/tokens        - List all tokens
 *   POST /api/tokens        - Add token
 *   GET  /api/tokens/:id    - Get specific token
 *   PUT  /api/tokens/:id    - Update token
 *   DELETE /api/tokens/:id  - Delete token
 *   POST /api/tokens/:id/verify - Verify token exists
 *   POST /api/verify        - Verify all tokens
 *   GET  /api/search        - Search for token by service
 *   GET  /api/categories    - List categories
 *   GET  /api/status        - Health and status
 *   GET  /api/schema        - JSON Schema for UI
 */

const express = require('express');
const cors = require('cors');
const registryManager = require('../lib/registry-manager');

const app = express();
const PORT = process.env.PORT || 3021;

app.use(cors());
app.use(express.json());

// ============== TOKENS ==============

// GET /api/tokens
app.get('/api/tokens', (req, res) => {
  const tokens = registryManager.getTokens();
  
  // Filter by category if provided
  const { category } = req.query;
  const filtered = category 
    ? tokens.filter(t => t.category === category)
    : tokens;

  // Don't expose actual token values
  const safe = filtered.map(t => ({
    ...t,
    // Mask sensitive fields
    value: t.value ? '***' : undefined
  }));

  res.json({ tokens: safe });
});

// POST /api/tokens
app.post('/api/tokens', (req, res) => {
  try {
    const token = registryManager.addToken(req.body);
    res.json({ success: true, token });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/tokens/:id
app.get('/api/tokens/:id', (req, res) => {
  const token = registryManager.getToken(req.params.id);
  if (!token) {
    return res.status(404).json({ success: false, error: 'Token not found' });
  }
  
  // Mask sensitive fields
  const safe = { ...token, value: token.value ? '***' : undefined };
  res.json(safe);
});

// PUT /api/tokens/:id
app.put('/api/tokens/:id', (req, res) => {
  try {
    const token = registryManager.updateToken(req.params.id, req.body);
    res.json({ success: true, token });
  } catch (err) {
    res.status(err.message === 'Token not found' ? 404 : 400)
      .json({ success: false, error: err.message });
  }
});

// DELETE /api/tokens/:id
app.delete('/api/tokens/:id', (req, res) => {
  try {
    registryManager.deleteToken(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// ============== VERIFICATION ==============

// POST /api/tokens/:id/verify
app.post('/api/tokens/:id/verify', async (req, res) => {
  try {
    const result = await registryManager.verifyToken(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// POST /api/verify
app.post('/api/verify', async (req, res) => {
  const result = await registryManager.verifyAll();
  res.json({ success: true, ...result });
});

// ============== SEARCH ==============

// GET /api/search
app.get('/api/search', (req, res) => {
  const { q, service } = req.query;
  const query = q || service;

  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required (?q=... or ?service=...)' });
  }

  const token = registryManager.findToken(query);
  
  if (!token) {
    return res.json({ 
      success: false, 
      found: false,
      message: `No token found for "${query}"` 
    });
  }

  // Mask sensitive fields
  const safe = { ...token, value: token.value ? '***' : undefined };
  res.json({ success: true, found: true, token: safe });
});

// ============== CATEGORIES ==============

// GET /api/categories
app.get('/api/categories', (req, res) => {
  res.json({ categories: registryManager.getCategories() });
});

// POST /api/categories
app.post('/api/categories', (req, res) => {
  const { category } = req.body;
  if (!category) {
    return res.status(400).json({ success: false, error: 'Category required' });
  }
  const categories = registryManager.addCategory(category);
  res.json({ success: true, categories });
});

// ============== STATUS ==============

// GET /api/status
app.get('/api/status', (req, res) => {
  const registry = registryManager.getRegistry();
  const tokens = registry.tokens;

  res.json({
    status: 'ok',
    version: registry.version,
    tokens: {
      total: tokens.length,
      valid: tokens.filter(t => t.status === 'valid').length,
      missing: tokens.filter(t => t.status === 'missing').length,
      unknown: tokens.filter(t => t.status === 'unknown').length
    },
    categories: registry.categories.length
  });
});

// ============== SCHEMA ==============

// GET /api/schema
app.get('/api/schema', (req, res) => {
  res.json({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Token Registry",
    "type": "object",
    "properties": {
      "tokens": {
        "type": "array",
        "title": "Tokens",
        "items": { "$ref": "#/definitions/token" }
      }
    },
    "definitions": {
      "token": {
        "type": "object",
        "required": ["service", "location"],
        "properties": {
          "id": { 
            "type": "string", 
            "readOnly": true 
          },
          "service": { 
            "type": "string", 
            "title": "Service Name",
            "description": "Name of the service (e.g., GitHub, AWS, Cloudflare)"
          },
          "name": { 
            "type": "string", 
            "title": "Display Name",
            "description": "Human-readable name for this token"
          },
          "category": {
            "type": "string",
            "title": "Category",
            "enum": ["api", "oauth", "webhook", "database", "other"]
          },
          "locationType": {
            "type": "string",
            "title": "Storage Type",
            "enum": ["file", "env", "database"],
            "default": "file"
          },
          "location": {
            "type": "string",
            "title": "Location",
            "description": "Path to token file or env var name"
          },
          "envVar": {
            "type": "string",
            "title": "Environment Variable",
            "description": "If locationType is 'env'"
          },
          "scope": {
            "type": "string",
            "title": "Permissions/Scope",
            "description": "What this token can access"
          },
          "expires": {
            "type": "string",
            "format": "date-time",
            "title": "Expiration Date"
          },
          "notes": {
            "type": "string",
            "title": "Notes"
          },
          "status": {
            "type": "string",
            "enum": ["valid", "missing", "expired", "unknown"],
            "readOnly": true
          }
        }
      }
    }
  });
});

// ============== START SERVER ==============

app.listen(PORT, () => {
  console.log(`🔐 Token Manager API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/status`);
  console.log(`   Tokens: http://localhost:${PORT}/api/tokens`);
  console.log(`   Search: http://localhost:${PORT}/api/search?q=github`);
});
