#!/usr/bin/env node
/**
 * Token Lookup Helper
 * Usage: node check-token.js <service-name>
 * 
 * Searches token-registry.md for a service and reports availability.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'token-registry.md');

function checkToken(serviceName) {
  const registry = fs.readFileSync(REGISTRY_PATH, 'utf8');
  
  // Normalize search term
  const searchTerm = serviceName.toLowerCase();
  
  // Split into sections (## headers)
  const sections = registry.split(/^## /m).filter(s => s.trim().length > 0);
  
  let found = false;
  let results = [];
  
  for (const section of sections) {
    const lines = section.split('\n');
    const sectionTitle = lines[0].trim();
    
    // Check if section or any subsection matches
    if (sectionTitle.toLowerCase().includes(searchTerm) || 
        section.toLowerCase().includes(`### ${searchTerm}`)) {
      
      // Extract subsection
      const subsections = section.split(/^### /m).filter(s => s.trim().length > 0);
      
      for (const subsec of subsections) {
        const subLines = subsec.split('\n');
        const subTitle = subLines[0].trim();
        
        if (subTitle.toLowerCase().includes(searchTerm) || sectionTitle.toLowerCase().includes(searchTerm)) {
          found = true;
          
          // Parse details
          let status = 'Unknown';
          let location = 'Not specified';
          let purpose = 'Not specified';
          let notes = '';
          
          for (const line of subLines) {
            if (line.startsWith('- **Status:**')) {
              status = line.replace('- **Status:**', '').trim();
            } else if (line.startsWith('- **Location:**')) {
              location = line.replace('- **Location:**', '').trim();
            } else if (line.startsWith('- **Purpose:**')) {
              purpose = line.replace('- **Purpose:**', '').trim();
            } else if (line.startsWith('- **Notes:**')) {
              notes = line.replace('- **Notes:**', '').trim();
            }
          }
          
          results.push({
            title: subTitle || sectionTitle,
            status,
            location,
            purpose,
            notes
          });
        }
      }
    }
  }
  
  if (results.length === 0) {
    console.log(`❌ "${serviceName}" not found in token registry.`);
    console.log(`\nSuggestion: Check token-registry.md manually or add new entry if token exists.`);
    return;
  }
  
  // Display results
  console.log(`\n🔍 Token lookup for "${serviceName}":\n`);
  
  for (const result of results) {
    console.log(`📌 ${result.title}`);
    console.log(`   Status:   ${result.status}`);
    console.log(`   Location: ${result.location}`);
    console.log(`   Purpose:  ${result.purpose}`);
    if (result.notes) {
      console.log(`   Notes:    ${result.notes}`);
    }
    console.log('');
  }
  
  // Actionable next step
  const hasAvailable = results.some(r => r.status.includes('✅'));
  const hasWarning = results.some(r => r.status.includes('⚠️'));
  
  if (hasAvailable) {
    console.log(`✅ Token available - proceed with API call\n`);
  } else if (hasWarning) {
    console.log(`⚠️  Token needs attention - check status before use\n`);
  } else {
    console.log(`❌ Token not available or expired\n`);
  }
}

// Main
const serviceName = process.argv[2];

if (!serviceName) {
  console.log('Usage: node check-token.js <service-name>');
  console.log('\nExamples:');
  console.log('  node check-token.js github');
  console.log('  node check-token.js instagram');
  console.log('  node check-token.js aws');
  process.exit(1);
}

checkToken(serviceName);
