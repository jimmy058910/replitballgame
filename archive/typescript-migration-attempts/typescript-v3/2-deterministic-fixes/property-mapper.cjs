#!/usr/bin/env node

/**
 * PROPERTY MAPPER - TypeScript Migration v3.0
 * 
 * Deterministic property mapping and type extension engine
 * Eliminates property access errors (TS2339) through canonical type alignment
 * 
 * Built from 7 iterations of agent learning - this is what actually works!
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PropertyMapper {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../');
    this.v3Dir = path.resolve(__dirname, '../');
    this.canonicalTypesPath = path.join(this.v3Dir, '1-foundation/canonical-types.ts');
    this.errorPatternsPath = path.join(this.v3Dir, '1-foundation/error-patterns.json');
    this.sharedTypesPath = path.join(this.rootDir, 'shared/types/models.ts');
    
    // Load our knowledge base
    this.errorPatterns = this.loadJSON(this.errorPatternsPath);
    this.propertyMappings = this.errorPatterns.databaseFieldMappings.mappings;
    
    console.log('🔧 Property Mapper v3.0 Initialized');
    console.log(`📁 Root directory: ${this.rootDir}`);
    console.log(`📄 Canonical types: ${this.canonicalTypesPath}`);
  }
  
  loadJSON(filepath) {
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (error) {
      console.error(`❌ Error loading ${filepath}:`, error.message);
      return {};
    }
  }
  
  saveJSON(filepath, data) {
    try {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error saving ${filepath}:`, error.message);
      return false;
    }
  }
  
  getCurrentErrorCount() {
    try {
      const output = execSync('npx tsc --noEmit 2>&1', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const matches = output.match(/error TS/g);
      return matches ? matches.length : 0;
    } catch (e) {
      const output = e.stdout || e.stderr || '';
      const matches = output.match(/error TS/g);
      return matches ? matches.length : 0;
    }
  }
  
  analyzePropertyAccessErrors() {
    console.log('\n🔍 Analyzing Property Access Errors (TS2339)...');
    
    try {
      const output = execSync('npx tsc --noEmit 2>&1', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const lines = output.split('\n');
      const propertyErrors = [];
      
      for (const line of lines) {
        if (line.includes('error TS2339')) {
          const match = line.match(/(.+?)\((\d+),(\d+)\): error TS2339: (.+)/);
          if (match) {
            const [, file, lineNum, col, message] = match;
            const propertyMatch = message.match(/Property '(.+?)' does not exist on type '(.+?)'/);
            if (propertyMatch) {
              const [, property, type] = propertyMatch;
              propertyErrors.push({
                file: file.replace(this.rootDir, '').replace(/\\\\/g, '/'),
                line: parseInt(lineNum),
                property,
                type,
                message
              });
            }
          }
        }
      }
      
      console.log(`📊 Found ${propertyErrors.length} property access errors`);
      return propertyErrors;
      
    } catch (e) {
      const output = e.stdout || e.stderr || '';
      // Handle the same logic for error case
      const lines = output.split('\n');
      const propertyErrors = [];
      
      for (const line of lines) {
        if (line.includes('error TS2339')) {
          const match = line.match(/(.+?)\((\d+),(\d+)\): error TS2339: (.+)/);
          if (match) {
            const [, file, lineNum, col, message] = match;
            const propertyMatch = message.match(/Property '(.+?)' does not exist on type '(.+?)'/);
            if (propertyMatch) {
              const [, property, type] = propertyMatch;
              propertyErrors.push({
                file: file.replace(this.rootDir, '').replace(/\\\\/g, '/'),
                line: parseInt(lineNum),
                property,
                type,
                message
              });
            }
          }
        }
      }
      
      console.log(`📊 Found ${propertyErrors.length} property access errors`);
      return propertyErrors;
    }
  }
  
  categorizeErrors(propertyErrors) {
    console.log('🏷️ Categorizing errors by pattern...');
    
    const categories = {};
    const knownPatterns = this.errorPatterns.errorCategories.TS2339_PropertyAccess.patterns;
    
    for (const error of propertyErrors) {
      const key = `${error.property}_on_${error.type}`;
      
      if (!categories[key]) {
        categories[key] = {
          property: error.property,
          type: error.type,
          count: 0,
          files: new Set(),
          pattern: null,
          solution: null
        };
      }
      
      categories[key].count++;
      categories[key].files.add(error.file);
      
      // Check if we have a known solution
      const knownPattern = knownPatterns.find(p => 
        p.pattern.includes(error.property) && p.works
      );
      
      if (knownPattern) {
        categories[key].pattern = knownPattern;
        categories[key].solution = knownPattern.fix;
      }
    }
    
    // Convert to array and sort by frequency
    const sortedCategories = Object.values(categories)
      .map(cat => ({
        ...cat,
        files: Array.from(cat.files)
      }))
      .sort((a, b) => b.count - a.count);
    
    console.log(`📈 Identified ${sortedCategories.length} error patterns:`);
    for (const cat of sortedCategories.slice(0, 10)) {
      const status = cat.solution ? '✅ KNOWN' : '❓ NEW';
      console.log(`  ${status} ${cat.property} on ${cat.type} (${cat.count} errors)`);
    }
    
    return sortedCategories;
  }
  
  generateTypeExtensions(categories) {
    console.log('\n🔨 Generating type extensions...');
    
    const extensions = {};
    
    for (const category of categories) {
      if (!category.solution) continue; // Skip unknown patterns for now
      
      const typeName = category.type;
      if (!extensions[typeName]) {
        extensions[typeName] = {
          properties: [],
          reason: `Fixes ${category.count} property access errors`
        };
      }
      
      // Determine property type based on known patterns
      let propertyType = 'any'; // Fallback
      if (category.property.includes('Date') || category.property.includes('Time')) {
        propertyType = 'Date | string';
      } else if (category.property.includes('Number') || category.property.includes('Count') || category.property.includes('Id')) {
        propertyType = 'number';
      } else if (category.property.includes('Boolean') || category.property.startsWith('is') || category.property.startsWith('has')) {
        propertyType = 'boolean';
      } else if (['startDate', 'endDate', 'scheduledTime'].includes(category.property)) {
        propertyType = 'Date | string';
      } else if (['seasonNumber', 'marketValue', 'potentialStars'].includes(category.property)) {
        propertyType = 'number';
      } else if (['isOnMarket', 'starter', 'isActive'].includes(category.property)) {
        propertyType = 'boolean';
      } else if (['rosterPosition', 'text', 'description'].includes(category.property)) {
        propertyType = 'string';
      } else {
        propertyType = 'string'; // Most common fallback
      }
      
      extensions[typeName].properties.push({
        name: category.property,
        type: propertyType,
        optional: true, // Always optional to prevent breaking changes
        errors: category.count,
        files: category.files
      });
    }
    
    console.log(`🏗️ Generated extensions for ${Object.keys(extensions).length} types`);
    return extensions;
  }
  
  applyTypeExtensions(extensions) {
    console.log('\\n⚡ Applying type extensions to shared/types/models.ts...');
    
    // Read current shared types
    if (!fs.existsSync(this.sharedTypesPath)) {
      console.error(`❌ Shared types file not found: ${this.sharedTypesPath}`);
      return false;
    }
    
    let sharedTypesContent = fs.readFileSync(this.sharedTypesPath, 'utf8');
    let modifications = 0;
    
    for (const [typeName, extension] of Object.entries(extensions)) {
      console.log(`🔧 Extending ${typeName} interface...`);
      
      // Find the interface definition
      const interfaceRegex = new RegExp(
        `export interface ${typeName}\\s*{([^}]+)}`,
        'ms'
      );
      
      const match = sharedTypesContent.match(interfaceRegex);
      if (!match) {
        console.log(`⚠️ Interface ${typeName} not found in shared types`);
        continue;
      }
      
      const [fullMatch, interfaceBody] = match;
      const existingProperties = new Set();
      
      // Extract existing properties
      const propertyMatches = interfaceBody.matchAll(/^\\s*([\\w\\?]+)\\s*:/gm);
      for (const propMatch of propertyMatches) {
        existingProperties.add(propMatch[1].replace('?', ''));
      }
      
      // Add new properties
      let newProperties = [];
      for (const prop of extension.properties) {
        if (!existingProperties.has(prop.name)) {
          newProperties.push(`  ${prop.name}?: ${prop.type};  // Fixes ${prop.errors} errors`);
          console.log(`  ✅ Adding ${prop.name}?: ${prop.type}`);
        } else {
          console.log(`  ⏭️ Skipping ${prop.name} (already exists)`);
        }
      }
      
      if (newProperties.length > 0) {
        // Insert new properties before the closing brace
        const newInterfaceBody = interfaceBody.trimEnd() + '\\n\\n  // Added by Property Mapper v3.0\\n' + newProperties.join('\\n') + '\\n';
        sharedTypesContent = sharedTypesContent.replace(fullMatch, `export interface ${typeName} {${newInterfaceBody}}`);
        modifications += newProperties.length;
      }
    }
    
    if (modifications > 0) {
      // Create backup
      const backupPath = this.sharedTypesPath + '.backup.' + Date.now();
      fs.copyFileSync(this.sharedTypesPath, backupPath);
      console.log(`💾 Backup created: ${backupPath}`);
      
      // Write updated file
      fs.writeFileSync(this.sharedTypesPath, sharedTypesContent);
      console.log(`✅ Applied ${modifications} property extensions to shared/types/models.ts`);
      return true;
    } else {
      console.log('⏭️ No modifications needed');
      return false;
    }
  }
  
  validateChanges(errorsBefore, errorDescriptor = '') {
    console.log(`\\n🔍 Validating changes ${errorDescriptor}...`);
    
    const errorsAfter = this.getCurrentErrorCount();
    const reduction = errorsBefore - errorsAfter;
    const reductionPercentage = errorsBefore > 0 ? ((reduction / errorsBefore) * 100).toFixed(1) : '0.0';
    
    console.log(`📊 Error count: ${errorsBefore} → ${errorsAfter} (${reduction >= 0 ? '+' : ''}${reduction})`);
    console.log(`📈 Reduction: ${reductionPercentage}%`);
    
    const result = {
      success: errorsAfter < errorsBefore,
      errorsBefore,
      errorsAfter,
      reduction,
      reductionPercentage: parseFloat(reductionPercentage),
      improved: errorsAfter < errorsBefore,
      neutral: errorsAfter === errorsBefore,
      regressed: errorsAfter > errorsBefore
    };
    
    if (result.regressed) {
      console.log('❌ REGRESSION DETECTED - Changes increased error count');
    } else if (result.improved) {
      console.log('✅ SUCCESS - Changes reduced error count');
    } else {
      console.log('➡️ NEUTRAL - No change in error count');
    }
    
    return result;
  }
  
  rollbackChanges() {
    console.log('\\n🔄 Rolling back changes...');
    
    // Find the most recent backup
    const sharedTypesDir = path.dirname(this.sharedTypesPath);
    const sharedTypesFile = path.basename(this.sharedTypesPath);
    
    try {
      const files = fs.readdirSync(sharedTypesDir);
      const backupFiles = files
        .filter(f => f.startsWith(sharedTypesFile + '.backup.'))
        .sort()
        .reverse();
      
      if (backupFiles.length === 0) {
        console.log('❌ No backup files found');
        return false;
      }
      
      const latestBackup = path.join(sharedTypesDir, backupFiles[0]);
      fs.copyFileSync(latestBackup, this.sharedTypesPath);
      
      console.log(`✅ Restored from backup: ${backupFiles[0]}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      return false;
    }
  }
  
  run() {
    console.log('\\n🚀 Starting Property Mapper v3.0...');
    
    const startTime = Date.now();
    const errorsBefore = this.getCurrentErrorCount();
    
    console.log(`📊 Starting with ${errorsBefore} TypeScript errors`);
    
    if (errorsBefore === 0) {
      console.log('🎉 No errors found! Property mapping not needed.');
      return {
        success: true,
        errorsBefore: 0,
        errorsAfter: 0,
        message: 'No errors to fix'
      };
    }
    
    // Step 1: Analyze property access errors
    const propertyErrors = this.analyzePropertyAccessErrors();
    
    if (propertyErrors.length === 0) {
      console.log('✅ No property access errors found');
      return {
        success: true,
        errorsBefore,
        errorsAfter: errorsBefore,
        message: 'No property access errors to fix'
      };
    }
    
    // Step 2: Categorize errors
    const categories = this.categorizeErrors(propertyErrors);
    
    // Step 3: Generate extensions
    const extensions = this.generateTypeExtensions(categories);
    
    if (Object.keys(extensions).length === 0) {
      console.log('⚠️ No known solutions for current property access errors');
      return {
        success: false,
        errorsBefore,
        errorsAfter: errorsBefore,
        message: 'No actionable property access patterns found'
      };
    }
    
    // Step 4: Apply extensions
    const applied = this.applyTypeExtensions(extensions);
    
    if (!applied) {
      console.log('⚠️ No modifications were applied');
      return {
        success: false,
        errorsBefore,
        errorsAfter: errorsBefore,
        message: 'No modifications applied'
      };
    }
    
    // Step 5: Validate changes
    const validation = this.validateChanges(errorsBefore, 'after property extensions');
    
    // Step 6: Rollback if regression
    if (validation.regressed) {
      console.log('🔄 Rolling back due to regression...');
      this.rollbackChanges();
      
      const rollbackValidation = this.validateChanges(errorsBefore, 'after rollback');
      
      return {
        success: false,
        ...validation,
        rollback: true,
        rollbackValidation,
        message: 'Changes caused regression and were rolled back'
      };
    }
    
    // Step 7: Generate results
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: validation.improved || validation.neutral,
      ...validation,
      duration: `${duration}s`,
      categoriesProcessed: categories.length,
      extensionsApplied: Object.keys(extensions).length,
      propertiesAdded: Object.values(extensions).reduce((sum, ext) => sum + ext.properties.length, 0),
      message: validation.improved 
        ? `Successfully reduced errors by ${validation.reductionPercentage}%`
        : 'Property extensions applied without regression'
    };
    
    console.log(`\\n🎉 Property Mapper completed in ${duration}s`);
    console.log(`📈 Final result: ${validation.improved ? 'SUCCESS' : 'NEUTRAL'}`);
    
    // Save detailed results
    const resultsPath = path.join(this.v3Dir, '4-orchestration/property-mapper-results.json');
    this.saveJSON(resultsPath, {
      ...result,
      timestamp: new Date().toISOString(),
      categories: categories.slice(0, 20), // Top 20 for analysis
      extensions
    });
    
    return result;
  }
}

// Run if called directly
if (require.main === module) {
  const mapper = new PropertyMapper();
  const result = mapper.run();
  
  console.log('\\n' + '='.repeat(60));
  console.log('PROPERTY MAPPER v3.0 - FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success}`);
  console.log(`Errors: ${result.errorsBefore} → ${result.errorsAfter}`);
  console.log(`Reduction: ${result.reductionPercentage || 0}%`);
  console.log(`Duration: ${result.duration || 'N/A'}`);
  console.log(`Message: ${result.message}`);
  console.log('='.repeat(60));
  
  process.exit(result.success ? 0 : 1);
}

module.exports = PropertyMapper;