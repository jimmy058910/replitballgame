/**
 * Comprehensive Marketplace Buy-Now Price Validation Test
 * Tests minimum price validation and error handling
 */

const { execSync } = require('child_process');

async function makeRequest(method, path, data = null) {
  try {
    const cmd = data 
      ? `curl -s -X ${method} http://localhost:5000${path} -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`
      : `curl -s -X ${method} http://localhost:5000${path}`;
    
    const response = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(response);
  } catch (error) {
    console.error(`Error making ${method} request to ${path}:`, error.message);
    return null;
  }
}

// Calculate CAR and minimum buy-now price for a player
function calculateMinimumBuyNow(player) {
  const car = (player.speed + player.power + player.agility + player.throwing + player.catching + player.kicking) / 6;
  const potential = player.potentialRating || 0;
  return Math.floor((car * 1000) + (potential * 2000));
}

async function runMarketplaceValidationTest() {
  console.log('=== MARKETPLACE BUY-NOW PRICE VALIDATION TEST ===\n');
  
  try {
    // Get team players
    const players = await makeRequest('GET', '/api/teams/132/players');
    if (!players || players.length === 0) {
      console.error('❌ No players found for team 132');
      return;
    }
    
    // Find Aria Vale and calculate her minimum
    const ariaVale = players.find(p => p.firstName === 'Aria' && p.lastName === 'Vale');
    if (!ariaVale) {
      console.error('❌ Aria Vale not found in team roster');
      return;
    }
    
    console.log('📊 ARIA VALE STATS:');
    console.log(`   Speed: ${ariaVale.speed}, Power: ${ariaVale.power}, Agility: ${ariaVale.agility}`);
    console.log(`   Throwing: ${ariaVale.throwing}, Catching: ${ariaVale.catching}, Kicking: ${ariaVale.kicking}`);
    console.log(`   Potential Rating: ${ariaVale.potentialRating}`);
    
    const car = (ariaVale.speed + ariaVale.power + ariaVale.agility + ariaVale.throwing + ariaVale.catching + ariaVale.kicking) / 6;
    const minimumBuyNow = calculateMinimumBuyNow(ariaVale);
    
    console.log(`\n💰 CALCULATED VALUES:`);
    console.log(`   Core Athleticism Rating (CAR): ${car.toFixed(1)}`);
    console.log(`   Minimum Buy-Now Price: ${minimumBuyNow.toLocaleString()} credits`);
    
    // Test 1: Try to list below minimum (should fail)
    console.log('\n🚫 TEST 1: List Below Minimum (Should Fail)');
    const belowMinimum = minimumBuyNow - 1000;
    const failResult = await makeRequest('POST', '/api/dynamic-marketplace/list-player', {
      teamId: "132",
      playerId: ariaVale.id.toString(),
      startBid: 1000,
      durationHours: 24,
      buyNowPrice: belowMinimum
    });
    
    if (failResult && failResult.error && failResult.error.includes('Buy-now price too low')) {
      console.log(`✅ Correctly rejected listing below minimum (${belowMinimum.toLocaleString()} credits)`);
      console.log(`   Error: ${failResult.error}`);
    } else {
      console.log(`❌ Should have rejected listing below minimum`);
      console.log(`   Response:`, failResult);
    }
    
    // Test 2: Try to list at exact minimum (should succeed)
    console.log('\n✅ TEST 2: List At Exact Minimum (Should Succeed)');
    const atMinimum = minimumBuyNow;
    const successResult = await makeRequest('POST', '/api/dynamic-marketplace/list-player', {
      teamId: "132",
      playerId: ariaVale.id.toString(),
      startBid: 1000,
      durationHours: 24,
      buyNowPrice: atMinimum
    });
    
    if (successResult && successResult.success) {
      console.log(`✅ Successfully listed at minimum price (${atMinimum.toLocaleString()} credits)`);
      console.log(`   Listing ID: ${successResult.listingId}`);
      
      // Cancel the listing to clean up
      const cancelResult = await makeRequest('POST', `/api/dynamic-marketplace/cancel-listing`, {
        listingId: successResult.listingId,
        teamId: "132"
      });
      
      if (cancelResult && cancelResult.success) {
        console.log(`✅ Successfully cancelled test listing`);
      } else {
        console.log(`⚠️  Could not cancel test listing: ${cancelResult?.error || 'Unknown error'}`);
      }
    } else {
      console.log(`❌ Should have succeeded at minimum price`);
      console.log(`   Response:`, successResult);
    }
    
    // Test 3: Try to list above minimum (should succeed)
    console.log('\n✅ TEST 3: List Above Minimum (Should Succeed)');
    const aboveMinimum = minimumBuyNow + 5000;
    const aboveResult = await makeRequest('POST', '/api/dynamic-marketplace/list-player', {
      teamId: "132",
      playerId: ariaVale.id.toString(),
      startBid: 1000,
      durationHours: 24,
      buyNowPrice: aboveMinimum
    });
    
    if (aboveResult && aboveResult.success) {
      console.log(`✅ Successfully listed above minimum (${aboveMinimum.toLocaleString()} credits)`);
      console.log(`   Listing ID: ${aboveResult.listingId}`);
      
      // Cancel the listing to clean up
      const cancelResult = await makeRequest('POST', `/api/dynamic-marketplace/cancel-listing`, {
        listingId: aboveResult.listingId,
        teamId: "132"
      });
      
      if (cancelResult && cancelResult.success) {
        console.log(`✅ Successfully cancelled test listing`);
      } else {
        console.log(`⚠️  Could not cancel test listing: ${cancelResult?.error || 'Unknown error'}`);
      }
    } else {
      console.log(`❌ Should have succeeded above minimum price`);
      console.log(`   Response:`, aboveResult);
    }
    
    // Test 4: Test another player for comparison
    console.log('\n🔍 TEST 4: Compare With Another Player');
    const otherPlayer = players.find(p => p.firstName !== 'Aria' || p.lastName !== 'Vale');
    if (otherPlayer) {
      const otherMinimum = calculateMinimumBuyNow(otherPlayer);
      console.log(`   ${otherPlayer.firstName} ${otherPlayer.lastName}: ${otherMinimum.toLocaleString()} credits minimum`);
      console.log(`   Difference: ${Math.abs(otherMinimum - minimumBuyNow).toLocaleString()} credits`);
    }
    
    console.log('\n=== VALIDATION TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
runMarketplaceValidationTest();