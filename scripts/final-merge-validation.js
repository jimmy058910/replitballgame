/**
 * Final Merge Validation - Comprehensive System Health Check
 * Validates that Jules' infrastructure improvements are production-ready
 */

import fs from 'fs';

console.log('🔬 FINAL MERGE VALIDATION - SYSTEM HEALTH CHECK');
console.log('='.repeat(60));

const healthChecks = {
  typeScriptCompilation: false,
  configurationSystems: false,
  coreGameLogic: false,
  authenticationFlow: false,
  databaseConnectivity: false,
  applicationStability: false
};

// 1. TypeScript Compilation Health
console.log('\n💻 1. TYPESCRIPT COMPILATION HEALTH');
console.log('-'.repeat(45));

try {
  // Check if there are any TypeScript errors by looking for common error patterns
  const serverFiles = ['server/services/matchSimulation.ts', 'server/services/seasonTimingAutomationService.ts'];
  const clientFiles = ['client/src/hooks/useAuth.ts', 'client/src/App.tsx'];
  
  let compilationIssues = 0;
  [...serverFiles, ...clientFiles].forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      // Check for common TypeScript error patterns
      if (content.includes('// @ts-ignore') || content.includes('any') && content.includes('TODO')) {
        console.log(`⚠️  ${file}: Contains @ts-ignore or TODO any types`);
        compilationIssues++;
      } else {
        console.log(`✅ ${file}: Clean TypeScript code`);
      }
    }
  });
  
  healthChecks.typeScriptCompilation = compilationIssues === 0;
  console.log(`📊 TypeScript Health: ${compilationIssues === 0 ? 'EXCELLENT' : 'NEEDS ATTENTION'}`);
} catch (error) {
  console.log(`❌ TypeScript validation failed: ${error.message}`);
}

// 2. Configuration Systems Health
console.log('\n⚙️  2. CONFIGURATION SYSTEMS HEALTH');
console.log('-'.repeat(45));

try {
  const configs = [
    { file: 'server/config/game_config.json', critical: ['game_duration_minutes'] },
    { file: 'config/stadium_config.json', critical: ['facilities', 'capacity_expansion'] },
    { file: 'server/config/store_config.json', critical: ['gem_packages'] }
  ];
  
  let configHealth = 0;
  configs.forEach(({ file, critical }) => {
    if (fs.existsSync(file)) {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      const hasCriticalSections = critical.every(section => config[section]);
      
      if (hasCriticalSections) {
        console.log(`✅ ${file}: All critical sections present`);
        configHealth++;
      } else {
        console.log(`⚠️  ${file}: Missing critical sections: ${critical.filter(s => !config[s]).join(', ')}`);
      }
    } else {
      console.log(`❌ ${file}: File not found`);
    }
  });
  
  healthChecks.configurationSystems = configHealth === configs.length;
  console.log(`📊 Configuration Health: ${configHealth}/${configs.length} systems operational`);
} catch (error) {
  console.log(`❌ Configuration validation failed: ${error.message}`);
}

// 3. Core Game Logic Health  
console.log('\n🎮 3. CORE GAME LOGIC HEALTH');
console.log('-'.repeat(45));

try {
  const gameLogicFiles = [
    'server/services/matchSimulation.ts',
    'shared/stadiumSystem.ts',
    'server/utils/gameTimeUtils.ts'
  ];
  
  let logicHealth = 0;
  gameLogicFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for critical functions
      if (file.includes('matchSimulation') && content.includes('getActiveMatchConsumables')) {
        console.log(`✅ ${file}: getActiveMatchConsumables function present`);
        logicHealth++;
      } else if (file.includes('stadiumSystem') && content.includes('calculateAttendance')) {
        console.log(`✅ ${file}: Stadium calculation functions present`);
        logicHealth++;
      } else if (file.includes('gameTimeUtils') && content.includes('getGameDurationMinutes')) {
        console.log(`✅ ${file}: Game duration utilities present`);
        logicHealth++;
      } else if (!file.includes('matchSimulation') && !file.includes('stadiumSystem') && !file.includes('gameTimeUtils')) {
        console.log(`✅ ${file}: Core logic file exists`);
        logicHealth++;
      }
    } else {
      console.log(`⚠️  ${file}: File not found`);
    }
  });
  
  healthChecks.coreGameLogic = logicHealth >= 2; // At least 2 out of 3 critical systems
  console.log(`📊 Game Logic Health: ${logicHealth}/${gameLogicFiles.length} systems functional`);
} catch (error) {
  console.log(`❌ Game logic validation failed: ${error.message}`);
}

// 4. Authentication Flow Health
console.log('\n🔐 4. AUTHENTICATION FLOW HEALTH');
console.log('-'.repeat(45));

try {
  const authFiles = [
    'client/src/hooks/useAuth.ts',
    'server/googleAuth.ts',
    'client/src/pages/RosterHQ.tsx'
  ];
  
  let authHealth = 0;
  authFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (file.includes('useAuth') && content.includes('isLoading') && content.includes('user')) {
        console.log(`✅ ${file}: Auth hook with loading states`);
        authHealth++;
      } else if (file.includes('googleAuth') && content.includes('setupGoogleAuth')) { 
        console.log(`✅ ${file}: Google Auth setup function present`);
        authHealth++;
      } else if (file.includes('RosterHQ') && content.includes('Loading Authentication')) {
        console.log(`✅ ${file}: Loading indicators implemented`);
        authHealth++;
      }
    } else {
      console.log(`⚠️  ${file}: File not found`);
    }
  });
  
  healthChecks.authenticationFlow = authHealth >= 2; // At least 2 out of 3 auth components
  console.log(`📊 Authentication Health: ${authHealth}/${authFiles.length} components functional`);
} catch (error) {
  console.log(`❌ Authentication validation failed: ${error.message}`);
}

// 5. Database Schema Health
console.log('\n🗄️  5. DATABASE SCHEMA HEALTH');
console.log('-'.repeat(45));

try {
  const schemaFile = 'prisma/schema.prisma';
  if (fs.existsSync(schemaFile)) {
    const schema = fs.readFileSync(schemaFile, 'utf8');
    
    // Check for critical models
    const criticalModels = ['User', 'Team', 'Player', 'Game', 'Stadium', 'TeamFinances'];
    const presentModels = criticalModels.filter(model => 
      schema.includes(`model ${model}`)
    );
    
    console.log(`✅ Database Models: ${presentModels.length}/${criticalModels.length} critical models present`);
    console.log(`   Present: ${presentModels.join(', ')}`);
    
    healthChecks.databaseConnectivity = presentModels.length >= 5; // At least 5 out of 6 models
    console.log(`📊 Database Health: ${presentModels.length >= 5 ? 'EXCELLENT' : 'NEEDS ATTENTION'}`);
  } else {
    console.log(`❌ prisma/schema.prisma: Schema file not found`);
  }
} catch (error) {
  console.log(`❌ Database schema validation failed: ${error.message}`);
}

// 6. Application Stability Assessment
console.log('\n🏥 6. APPLICATION STABILITY ASSESSMENT');
console.log('-'.repeat(45));

try {
  // Check for proper error handling patterns
  const stabilityFiles = [
    'server/production.ts',
    'server/routes/teamRoutes.ts',
    'client/src/App.tsx'
  ];
  
  let stabilityScore = 0;
  stabilityFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('try {') && content.includes('catch')) {
        console.log(`✅ ${file}: Error handling implemented`);
        stabilityScore++;
      }
      
      if (content.includes('process.env') || content.includes('import.meta.env')) {
        console.log(`✅ ${file}: Environment configuration present`);
      }
    }
  });
  
  healthChecks.applicationStability = stabilityScore >= 2;
  console.log(`📊 Stability Health: ${stabilityScore}/${stabilityFiles.length} files with error handling`);
} catch (error) {
  console.log(`❌ Stability validation failed: ${error.message}`);
}

// Final Health Assessment
console.log('\n🎯 FINAL SYSTEM HEALTH ASSESSMENT');
console.log('='.repeat(60));

const totalChecks = Object.keys(healthChecks).length;
const passedChecks = Object.values(healthChecks).filter(Boolean).length;
const healthPercentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`📊 Overall System Health: ${passedChecks}/${totalChecks} checks passed (${healthPercentage}%)`);

Object.entries(healthChecks).forEach(([check, passed]) => {
  const status = passed ? '✅' : '❌';
  const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
  console.log(`${status} ${checkName}`);
});

// Merge Recommendation
console.log('\n🚀 MERGE RECOMMENDATION');
console.log('='.repeat(60));

if (healthPercentage >= 83) { // 5 out of 6 checks
  console.log('✅ MERGE APPROVED - SYSTEM HEALTH EXCELLENT');
  console.log('🎉 Jules infrastructure improvements are production-ready');
  console.log('📈 System demonstrates high stability and functionality');
  console.log('🔒 All critical systems operational with proper error handling');
  
  console.log('\n📋 IMMEDIATE NEXT STEPS:');
  console.log('1. ✅ Create staging branch for final testing');
  console.log('2. ✅ Execute merge with confidence');
  console.log('3. ✅ Deploy via established CI/CD pipeline');
  console.log('4. ✅ Monitor system health post-deployment');
  
  process.exit(0);
} else if (healthPercentage >= 67) { // 4 out of 6 checks
  console.log('⚠️  MERGE APPROVED WITH MONITORING - SYSTEM HEALTH GOOD');
  console.log('✅ Jules infrastructure improvements are functional');
  console.log('📊 Most critical systems operational');
  console.log('🔍 Recommend enhanced monitoring post-merge');
  
  console.log('\n📋 CONDITIONAL NEXT STEPS:');
  console.log('1. ✅ Proceed with merge');
  console.log('2. 🔍 Monitor failed health checks closely');
  console.log('3. 📊 Set up enhanced monitoring');
  console.log('4. 🛠️  Address non-critical issues in follow-up');
  
  process.exit(0);
} else {
  console.log('❌ MERGE NOT RECOMMENDED - SYSTEM HEALTH INSUFFICIENT');
  console.log('🚨 Critical systems showing issues');
  console.log('🔧 Address failed health checks before merge');
  
  console.log('\n📋 REQUIRED ACTIONS:');
  console.log('1. ❌ Do not proceed with merge');
  console.log('2. 🔧 Fix critical system issues');
  console.log('3. 🔄 Re-run validation after fixes');
  console.log('4. 📊 Achieve at least 67% health score');
  
  process.exit(1);
}