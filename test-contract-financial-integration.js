/**
 * Comprehensive Contract and Financial Integration Test
 * Tests all contract acceptance and financial integration fixes
 */

const API_BASE = 'http://localhost:5000';

async function makeRequest(method, path, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const result = await response.json();
  
  return {
    status: response.status,
    data: result,
    ok: response.ok
  };
}

async function testEndpoint(name, method, path, expectedStatus = 200, data = null) {
  console.log(`\n🧪 Testing ${name}`);
  console.log(`   ${method} ${path}`);
  
  try {
    const result = await makeRequest(method, path, data);
    
    if (result.status === expectedStatus) {
      console.log(`   ✅ Success: ${result.status}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   📊 Response keys: ${Object.keys(result.data).join(', ')}`);
      }
      return result.data;
    } else {
      console.log(`   ❌ Failed: Expected ${expectedStatus}, got ${result.status}`);
      if (result.data?.message) {
        console.log(`   💬 Message: ${result.data.message}`);
      }
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function runContractIntegrationTests() {
  console.log('🚀 STARTING CONTRACT & FINANCIAL INTEGRATION TESTS');
  console.log('=' .repeat(60));

  // Test 1: Player Contract Value Calculation
  console.log('\n📋 SECTION 1: PLAYER CONTRACT VALUE CALCULATION');
  const playerContractValue = await testEndpoint(
    'Player Contract Value Calculation',
    'GET',
    '/api/players/1/contract-value'
  );

  if (playerContractValue) {
    console.log(`   💰 Market Value: ${playerContractValue.marketValue?.toLocaleString()}₡`);
    console.log(`   📊 Attribute Value: ${playerContractValue.attributeValue}`);
    console.log(`   ⭐ Potential Value: ${playerContractValue.potentialValue}`);
    console.log(`   🎂 Age Modifier: ${playerContractValue.ageModifier}`);
  }

  // Test 2: Player Details with Active Contract
  console.log('\n📋 SECTION 2: PLAYER DETAILS WITH ACTIVE CONTRACT');
  const playerDetails = await testEndpoint(
    'Player Details with Active Contract',
    'GET',
    '/api/players/1'
  );

  if (playerDetails) {
    console.log(`   👤 Player: ${playerDetails.firstName} ${playerDetails.lastName}`);
    console.log(`   💼 Current Salary: ${playerDetails.salary?.toLocaleString()}₡`);
    console.log(`   📅 Contract Seasons: ${playerDetails.contractSeasons}`);
    console.log(`   🏆 Active Contract: ${playerDetails.activeContract ? 'YES' : 'NO'}`);
    if (playerDetails.activeContract) {
      console.log(`   📝 Contract ID: ${playerDetails.activeContract.id}`);
      console.log(`   💰 Contract Salary: ${playerDetails.activeContract.salary?.toLocaleString()}₡`);
      console.log(`   ⏰ Remaining Years: ${playerDetails.activeContract.remainingYears}`);
    }
  }

  // Test 3: Contract Negotiation (this will create playerContracts entry)
  console.log('\n📋 SECTION 3: CONTRACT NEGOTIATION & FINANCIAL INTEGRATION');
  const negotiationResult = await testEndpoint(
    'Player Contract Negotiation',
    'POST',
    '/api/players/1/negotiate',
    200,
    {
      salary: 75000,
      seasons: 3
    }
  );

  if (negotiationResult) {
    console.log(`   🤝 Negotiation Success: ${negotiationResult.success}`);
    console.log(`   💬 Player Response: ${negotiationResult.negotiationResult?.response}`);
    console.log(`   📝 Message: ${negotiationResult.negotiationResult?.message}`);
    
    if (negotiationResult.success) {
      console.log(`   ✅ Contract accepted!`);
      console.log(`   💰 New Salary: ${negotiationResult.player?.salary?.toLocaleString()}₡`);
      console.log(`   📅 Contract Seasons: ${negotiationResult.player?.contractSeasons}`);
    }
  }

  // Test 4: Team Finances (should reflect updated salary cap)
  console.log('\n📋 SECTION 4: TEAM FINANCES INTEGRATION');
  const teamFinances = await testEndpoint(
    'Team Finances with Updated Salary Cap',
    'GET',
    '/api/teams/1/finances'
  );

  if (teamFinances) {
    console.log(`   💰 Credits: ${teamFinances.credits ? Number(teamFinances.credits).toLocaleString() : 'N/A'}₡`);
    console.log(`   💎 Gems: ${teamFinances.gems || 'N/A'}`);
    console.log(`   📊 Salary Cap: ${teamFinances.salaryCap ? Number(teamFinances.salaryCap).toLocaleString() : 'N/A'}₡`);
    console.log(`   💼 Total Salary: ${teamFinances.totalSalary ? Number(teamFinances.totalSalary).toLocaleString() : 'N/A'}₡`);
    console.log(`   🆓 Cap Space: ${teamFinances.capSpace ? Number(teamFinances.capSpace).toLocaleString() : 'N/A'}₡`);
    console.log(`   👥 Staff Salaries: ${teamFinances.staffSalaries ? Number(teamFinances.staffSalaries).toLocaleString() : 'N/A'}₡`);
  }

  // Test 5: Staff Contract Integration
  console.log('\n📋 SECTION 5: STAFF CONTRACT INTEGRATION');
  const staffList = await testEndpoint(
    'Team Staff List',
    'GET',
    '/api/teams/1/staff'
  );

  if (staffList && staffList.length > 0) {
    console.log(`   👥 Total Staff: ${staffList.length}`);
    const totalStaffSalaries = staffList.reduce((sum, staff) => sum + (staff.salary || 0), 0);
    console.log(`   💰 Total Staff Salaries: ${totalStaffSalaries.toLocaleString()}₡`);
    
    // Test staff salary update
    const firstStaff = staffList[0];
    if (firstStaff) {
      const updatedStaff = await testEndpoint(
        'Staff Salary Update',
        'PUT',
        `/api/staff/${firstStaff.id}`,
        200,
        {
          salary: firstStaff.salary + 5000
        }
      );
      
      if (updatedStaff) {
        console.log(`   ✅ Staff salary updated: ${updatedStaff.salary?.toLocaleString()}₡`);
      }
    }
  }

  // Test 6: Verify Financial Integration After Staff Update
  console.log('\n📋 SECTION 6: POST-UPDATE FINANCIAL VERIFICATION');
  const updatedFinances = await testEndpoint(
    'Updated Team Finances',
    'GET',
    '/api/teams/1/finances'
  );

  if (updatedFinances) {
    console.log(`   👥 Updated Staff Salaries: ${updatedFinances.staffSalaries ? Number(updatedFinances.staffSalaries).toLocaleString() : 'N/A'}₡`);
    console.log(`   💼 Player Salaries: ${updatedFinances.totalSalary ? Number(updatedFinances.totalSalary).toLocaleString() : 'N/A'}₡`);
    console.log(`   🆓 Remaining Cap Space: ${updatedFinances.capSpace ? Number(updatedFinances.capSpace).toLocaleString() : 'N/A'}₡`);
  }

  // Test 7: Player Contract Records (check playerContracts table)
  console.log('\n📋 SECTION 7: PLAYER CONTRACT RECORDS VALIDATION');
  const playerContracts = await testEndpoint(
    'Player Contract Records',
    'GET',
    '/api/teams/1/contracts'
  );

  if (playerContracts) {
    console.log(`   📝 Total Contract Records: ${playerContracts.length || 0}`);
    const activeContracts = playerContracts.filter(c => c.isActive);
    console.log(`   ✅ Active Contracts: ${activeContracts.length}`);
    
    if (activeContracts.length > 0) {
      console.log(`   📊 Active Contract Details:`);
      activeContracts.forEach((contract, index) => {
        console.log(`     ${index + 1}. Player ID: ${contract.playerId}, Salary: ${contract.salary?.toLocaleString()}₡, Years: ${contract.remainingYears}`);
      });
    }
  }

  console.log('\n🎯 CONTRACT & FINANCIAL INTEGRATION TESTS COMPLETED');
  console.log('=' .repeat(60));
}

// Run the tests
runContractIntegrationTests().catch(console.error);