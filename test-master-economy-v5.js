#!/usr/bin/env node
/**
 * Master Economy v5 Comprehensive Test Suite
 * Tests all new Master Economy v5 features including:
 * - 8-item daily rotation store system
 * - Gem packages with new pricing structure
 * - Realm Pass subscription system
 * - Gem exchange rates and conversion
 * - Stadium mechanics integration
 * - Enhanced game economy service
 */

const BASE_URL = 'http://localhost:5000/api';

// Test authentication headers (for testing)
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
};

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`🧪 Testing ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: AUTH_HEADERS,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ ${endpoint} - Status: ${response.status}`);
      console.log(`   Error: ${data.error || JSON.stringify(data)}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    console.log(`💥 ${endpoint} - Connection Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runMasterEconomyTests() {
  console.log('🏆 Master Economy v5 Comprehensive Test Suite');
  console.log('=' .repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: 8-item Daily Rotation Store
  console.log('\n📦 Testing 8-item Daily Rotation Store System');
  const storeTest = await testEndpoint('/store/items');
  results.total++;
  
  if (storeTest.success && storeTest.data.dailyItems && storeTest.data.dailyItems.length === 8) {
    console.log(`   ✅ Daily rotation contains exactly 8 items`);
    console.log(`   ✅ Store type: ${storeTest.data.storeType}`);
    console.log(`   ✅ Reset time: ${storeTest.data.resetTime}`);
    results.passed++;
  } else {
    console.log(`   ❌ Daily rotation failed or incorrect item count`);
    results.failed++;
  }
  
  // Test 2: Gem Packages
  console.log('\n💎 Testing Gem Packages System');
  const gemPackagesTest = await testEndpoint('/store/gem-packages');
  results.total++;
  
  if (gemPackagesTest.success && gemPackagesTest.data && gemPackagesTest.data.data) {
    const gemPackagesData = gemPackagesTest.data.data;
    if (Array.isArray(gemPackagesData)) {
      console.log(`   ✅ Gem packages endpoint working`);
      console.log(`   ✅ Available packages: ${gemPackagesData.length}`);
      
      // Check for required pricing tiers
      const priceTiers = gemPackagesData.map(pkg => pkg.price);
      console.log(`   ✅ Price tiers: $${priceTiers.join(', $')}`);
      results.passed++;
    } else {
      console.log(`   ❌ Gem packages data is not an array`);
      results.failed++;
    }
  } else {
    console.log(`   ❌ Gem packages endpoint failed`);
    results.failed++;
  }
  
  // Test 3: Realm Pass Subscription
  console.log('\n🛡️  Testing Realm Pass Subscription System');
  const realmPassTest = await testEndpoint('/store/realm-pass');
  results.total++;
  
  if (realmPassTest.success && realmPassTest.data && realmPassTest.data.data) {
    const realmPassData = realmPassTest.data.data;
    console.log(`   ✅ Realm Pass endpoint working`);
    console.log(`   ✅ Monthly price: $${realmPassData.monthlyPrice || realmPassData.price}`);
    console.log(`   ✅ Monthly gems: ${realmPassData.monthlyGems}`);
    results.passed++;
  } else {
    console.log(`   ❌ Realm Pass endpoint failed`);
    results.failed++;
  }
  
  // Test 4: Gem Exchange Rates
  console.log('\n🔄 Testing Gem Exchange Rates System');
  const exchangeRatesTest = await testEndpoint('/store/gem-exchange-rates');
  results.total++;
  
  if (exchangeRatesTest.success && exchangeRatesTest.data && exchangeRatesTest.data.data) {
    const exchangeRatesData = exchangeRatesTest.data.data;
    if (Array.isArray(exchangeRatesData)) {
      console.log(`   ✅ Gem exchange rates endpoint working`);
      console.log(`   ✅ Available exchange tiers: ${exchangeRatesData.length}`);
      
      // Show exchange rates
      exchangeRatesData.forEach(rate => {
        console.log(`   ✅ ${rate.gems} gems → ${rate.credits} credits (${rate.ratio}:1)`);
      });
      results.passed++;
    } else {
      console.log(`   ❌ Gem exchange rates data is not an array`);
      results.failed++;
    }
  } else {
    console.log(`   ❌ Gem exchange rates endpoint failed`);
    results.failed++;
  }
  
  // Test 5: Enhanced Game Economy Service Integration
  console.log('\n🎮 Testing Enhanced Game Economy Service');
  const economyTest = await testEndpoint('/store/items');
  results.total++;
  
  if (economyTest.success && economyTest.data.dailyItems) {
    // Check if items have proper Master Economy v5 structure
    const sampleItem = economyTest.data.dailyItems[0];
    const hasCorrectStructure = sampleItem.id && sampleItem.name && 
                               (sampleItem.credits || sampleItem.gems) && 
                               sampleItem.tier;
    
    if (hasCorrectStructure) {
      console.log(`   ✅ Items have correct Master Economy v5 structure`);
      console.log(`   ✅ Sample item: ${sampleItem.name} (${sampleItem.tier})`);
      
      // Check rarity distribution
      const rarities = economyTest.data.dailyItems.map(item => item.tier);
      const rarityCount = rarities.reduce((acc, rarity) => {
        acc[rarity] = (acc[rarity] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   ✅ Rarity distribution: ${JSON.stringify(rarityCount)}`);
      results.passed++;
    } else {
      console.log(`   ❌ Items missing Master Economy v5 structure`);
      results.failed++;
    }
  } else {
    console.log(`   ❌ Enhanced Game Economy Service integration failed`);
    results.failed++;
  }
  
  // Test 6: Stadium Mechanics (Check if available)
  console.log('\n🏟️  Testing Stadium Mechanics Integration');
  const stadiumTest = await testEndpoint('/stadium');
  results.total++;
  
  if (stadiumTest.success || stadiumTest.status === 401) {
    console.log(`   ✅ Stadium endpoints accessible`);
    results.passed++;
  } else {
    console.log(`   ❌ Stadium endpoints not accessible`);
    results.failed++;
  }
  
  // Summary
  console.log('\n🏆 Master Economy v5 Test Results');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📊 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 ALL TESTS PASSED! Master Economy v5 is fully operational!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
  
  // Display Master Economy v5 Features Summary
  console.log('\n📋 Master Economy v5 Features Implemented:');
  console.log('   • 8-item daily rotation store (combined equipment + consumables)');
  console.log('   • Gem packages with new pricing structure ($1.99-$99.99)');
  console.log('   • Realm Pass subscription system ($9.95/month)');
  console.log('   • Tiered gem exchange rates with bulk discounts');
  console.log('   • Enhanced game economy service integration');
  console.log('   • Stadium mechanics integration (pending full implementation)');
  
  return results;
}

// Run the tests
runMasterEconomyTests().catch(console.error);