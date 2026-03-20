#!/usr/bin/env node
/**
 * Token Verification Script
 * 
 * Scans filesystem for token files and checks if they're documented in registry.
 * Helps identify stray tokens that should be consolidated.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REGISTRY_PATH = path.join(__dirname, '..', 'token-registry.md');
const SEARCH_PATHS = [
  path.join(process.env.HOME, '.secrets'),
  path.join(process.env.HOME, 'clawd', '.secrets'),
  path.join(process.env.HOME, '.openclaw'),
  path.join(process.env.HOME, '.openclaw-sophia'),
  path.join(process.env.HOME, '.openclaw-kim'),
  path.join(process.env.HOME, '.openclaw-axel')
];

function findTokenFiles() {
  const found = [];
  
  for (const searchPath of SEARCH_PATHS) {
    if (!fs.existsSync(searchPath)) continue;
    
    try {
      const cmd = `find "${searchPath}" -maxdepth 3 \\( -name "*token*.json" -o -name "*token*.age" -o -name "*token*.txt" -o -name "*credentials*" \\) 2>/dev/null`;
      const output = execSync(cmd, { encoding: 'utf8' });
      
      output.split('\n').filter(f => f.trim()).forEach(file => {
        // Skip backups and archives
        if (file.includes('/backup') || file.includes('/archive')) return;
        
        const stat = fs.statSync(file);
        found.push({
          path: file,
          name: path.basename(file),
          size: stat.size,
          mtime: stat.mtime
        });
      });
    } catch (err) {
      // Path doesn't exist or permission denied
    }
  }
  
  return found;
}

function checkRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ Registry not found:', REGISTRY_PATH);
    return '';
  }
  
  return fs.readFileSync(REGISTRY_PATH, 'utf8');
}

function main() {
  console.log('🔍 Token Verification Report\n');
  
  const registry = checkRegistry();
  const tokenFiles = findTokenFiles();
  
  console.log(`Found ${tokenFiles.length} token file(s)\n`);
  
  const documented = [];
  const undocumented = [];
  
  for (const file of tokenFiles) {
    // Check if file or service is in registry
    const filename = file.name.toLowerCase();
    const serviceName = filename
      .replace(/-microsoft-tokens\.json\.age/, '')
      .replace(/-tokens\.json\.age/, '')
      .replace(/-token\.age/, '')
      .replace(/-tokens\.age/, '')
      .replace('.json.age', '')
      .replace('.txt', '')
      .replace('.json', '');
    
    const inRegistry = 
      registry.toLowerCase().includes(file.path.toLowerCase()) ||
      registry.toLowerCase().includes(serviceName);
    
    if (inRegistry) {
      documented.push(file);
    } else {
      undocumented.push(file);
    }
  }
  
  console.log('✅ Documented in Registry:');
  if (documented.length === 0) {
    console.log('   (none)');
  } else {
    documented.forEach(f => {
      console.log(`   ${f.path}`);
      console.log(`      Size: ${f.size} bytes, Modified: ${f.mtime.toISOString().split('T')[0]}`);
    });
  }
  
  console.log('\n⚠️  Not Documented (need to add to registry):');
  if (undocumented.length === 0) {
    console.log('   (none - all tokens documented!)');
  } else {
    undocumented.forEach(f => {
      console.log(`   ${f.path}`);
      console.log(`      Size: ${f.size} bytes, Modified: ${f.mtime.toISOString().split('T')[0]}`);
    });
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total: ${tokenFiles.length}`);
  console.log(`   Documented: ${documented.length}`);
  console.log(`   Needs documentation: ${undocumented.length}`);
  
  if (undocumented.length > 0) {
    console.log('\n💡 Next Steps:');
    console.log('   1. Review undocumented files above');
    console.log('   2. Add them to token-registry.md');
    console.log('   3. Move to ~/.secrets/ if not already there');
    console.log('   4. Run this script again to verify');
  } else {
    console.log('\n🎉 All tokens are documented!');
  }
}

main();
