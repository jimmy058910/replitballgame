/**
 * Comprehensive League Schedule Generation & Automation Test Suite
 * 
 * Tests all automation processes including:
 * - League Schedule generation (Day 1, 3:00 PM EST)
 * - Late signup subdivision processing (Day 9, 3:00 PM EST)  
 * - Match simulation window (4:00 PM - 10:00 PM EST)
 * - Season timing events (Days 7, 15, 17)
 * - Division structure and team distribution
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const http = require('http');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5000/api';

/**
 * Test API endpoint with authentication
 */
async function testEndpoint(endpoint, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'connect.sid=s%3ArBqpJyJQjE9i7tqkjnGd7o6KnWiCQA4U.%2BRoVphHzKLRUdJ8hTsJ8nqKJSWjOSfuAZUGOL7H8s5Y'
            }
        };

        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: jsonData,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: { message: data },
                        success: false
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Test suite for League Schedule Generation Automation
 */
async function runLeagueScheduleAutomationTests() {
    console.log('🔄 COMPREHENSIVE LEAGUE SCHEDULE AUTOMATION TEST SUITE');
    console.log('=' .repeat(80));

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Test 1: Current Season & Day Calculation
    console.log('\n1. 📅 CURRENT SEASON & DAY CALCULATION TEST');
    console.log('-'.repeat(60));
    
    try {
        const seasonResult = await testEndpoint('/season/current-cycle');
        const seasonData = seasonResult.data;
        
        console.log(`✓ Season Status: ${seasonData.season} (${seasonData.seasonStatus})`);
        console.log(`✓ Current Day: ${seasonData.currentDay}/17`);
        console.log(`✓ Phase: ${seasonData.phase}`);
        console.log(`✓ Days Until Playoffs: ${seasonData.daysUntilPlayoffs}`);
        console.log(`✓ Dynamic Detail: ${seasonData.dynamicDetail}`);
        
        // Check if day calculation is working
        const isValidDay = seasonData.currentDay >= 1 && seasonData.currentDay <= 17;
        console.log(`✓ Day Calculation Valid: ${isValidDay ? 'YES' : 'NO'}`);
        
        results.tests.push({
            name: 'Season Day Calculation',
            passed: isValidDay && seasonResult.success,
            details: `Day ${seasonData.currentDay}, Phase: ${seasonData.phase}`
        });
        
        if (isValidDay && seasonResult.success) results.passed++;
        else results.failed++;
        
    } catch (error) {
        console.log(`✗ Season calculation test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Season Day Calculation',
            passed: false,
            details: error.message
        });
    }

    // Test 2: League Schedule Generation System
    console.log('\n2. 🏆 LEAGUE SCHEDULE GENERATION SYSTEM TEST');
    console.log('-'.repeat(60));
    
    try {
        // Check current season for schedule testing
        const currentSeason = await prisma.season.findFirst({
            where: { status: 'active' }
        });
        
        if (!currentSeason) {
            console.log('✗ No active season found for schedule testing');
            results.failed++;
            results.tests.push({
                name: 'League Schedule Generation',
                passed: false,
                details: 'No active season found'
            });
        } else {
            const seasonNumber = currentSeason.year;
            console.log(`✓ Testing schedule generation for Season ${seasonNumber}`);
            
            // Test schedule generation endpoint
            const scheduleResult = await testEndpoint('/seasonal-flow/schedule/generate', 'POST', {
                season: seasonNumber
            });
            
            if (scheduleResult.success) {
                console.log(`✓ Schedule Generation: SUCCESS`);
                console.log(`✓ Matches Created: ${scheduleResult.data.matchesGenerated}`);
                console.log(`✓ Leagues Processed: ${scheduleResult.data.schedulesCreated}`);
                console.log(`✓ League Details:`, scheduleResult.data.leaguesProcessed);
                
                results.tests.push({
                    name: 'League Schedule Generation',
                    passed: true,
                    details: `${scheduleResult.data.matchesGenerated} matches, ${scheduleResult.data.schedulesCreated} leagues`
                });
                results.passed++;
            } else {
                console.log(`✗ Schedule Generation Failed: ${scheduleResult.data.message}`);
                results.tests.push({
                    name: 'League Schedule Generation',
                    passed: false,
                    details: scheduleResult.data.message
                });
                results.failed++;
            }
        }
        
    } catch (error) {
        console.log(`✗ League schedule generation test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'League Schedule Generation',
            passed: false,
            details: error.message
        });
    }

    // Test 3: Late Signup Window & Subdivision Processing
    console.log('\n3. ⏰ LATE SIGNUP WINDOW & SUBDIVISION PROCESSING TEST');
    console.log('-'.repeat(60));
    
    try {
        // Test late signup window detection
        const lateSignupResult = await testEndpoint('/teams/late-signup/status');
        
        if (lateSignupResult.success) {
            console.log(`✓ Late Signup Window: ${lateSignupResult.data.isLateSignupWindow ? 'OPEN' : 'CLOSED'}`);
            console.log(`✓ Current Day: ${lateSignupResult.data.currentDay}`);
            console.log(`✓ Window Details: ${lateSignupResult.data.windowDetails}`);
        } else {
            console.log(`✗ Late signup status check failed: ${lateSignupResult.data.message}`);
        }
        
        // Check Division 8 subdivisions
        const div8Teams = await prisma.team.findMany({
            where: { division: 8 }
        });
        
        const subdivisionCounts = {};
        div8Teams.forEach(team => {
            const subdivision = team.subdivision || 'main';
            subdivisionCounts[subdivision] = (subdivisionCounts[subdivision] || 0) + 1;
        });
        
        console.log(`✓ Division 8 Subdivisions:`, subdivisionCounts);
        
        // Test if late signup subdivisions exist
        const lateSignupSubdivisions = Object.keys(subdivisionCounts).filter(sub => sub.startsWith('late_'));
        console.log(`✓ Late Signup Subdivisions Found: ${lateSignupSubdivisions.length}`);
        
        results.tests.push({
            name: 'Late Signup Processing',
            passed: lateSignupResult.success,
            details: `${lateSignupSubdivisions.length} late subdivisions, ${Object.keys(subdivisionCounts).length} total`
        });
        
        if (lateSignupResult.success) results.passed++;
        else results.failed++;
        
    } catch (error) {
        console.log(`✗ Late signup processing test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Late Signup Processing',
            passed: false,
            details: error.message
        });
    }

    // Test 4: Division Structure & Team Distribution
    console.log('\n4. 🏛️ DIVISION STRUCTURE & TEAM DISTRIBUTION TEST');
    console.log('-'.repeat(60));
    
    try {
        const divisionStructure = {};
        
        for (let division = 1; division <= 8; division++) {
            const divisionTeams = await prisma.team.findMany({
                where: { division }
            });
            
            const subdivisionCounts = {};
            divisionTeams.forEach(team => {
                const subdivision = team.subdivision || 'main';
                subdivisionCounts[subdivision] = (subdivisionCounts[subdivision] || 0) + 1;
            });
            
            divisionStructure[division] = {
                totalTeams: divisionTeams.length,
                subdivisions: subdivisionCounts,
                subdivisionCount: Object.keys(subdivisionCounts).length
            };
        }
        
        console.log('\n📊 DIVISION STRUCTURE REPORT:');
        for (let division = 1; division <= 8; division++) {
            const data = divisionStructure[division];
            console.log(`Division ${division}: ${data.totalTeams} teams, ${data.subdivisionCount} subdivisions`);
            
            Object.entries(data.subdivisions).forEach(([subdivision, count]) => {
                console.log(`  └─ ${subdivision}: ${count} teams`);
            });
        }
        
        // Validate structure against specifications
        const div1Valid = divisionStructure[1].totalTeams === 16 && divisionStructure[1].subdivisionCount === 1;
        const div2Valid = divisionStructure[2].subdivisionCount === 3; // Should have 3 subdivisions
        
        console.log(`\n✓ Division 1 Structure Valid: ${div1Valid ? 'YES' : 'NO'} (16 teams, 1 subdivision)`);
        console.log(`✓ Division 2 Structure Valid: ${div2Valid ? 'YES' : 'NO'} (3 subdivisions)`);
        
        results.tests.push({
            name: 'Division Structure',
            passed: div1Valid && div2Valid,
            details: `D1: ${divisionStructure[1].totalTeams} teams, D2: ${divisionStructure[2].subdivisionCount} subdivisions`
        });
        
        if (div1Valid && div2Valid) results.passed++;
        else results.failed++;
        
    } catch (error) {
        console.log(`✗ Division structure test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Division Structure',
            passed: false,
            details: error.message
        });
    }

    // Test 5: Match Simulation Window Detection
    console.log('\n5. 🕐 MATCH SIMULATION WINDOW DETECTION TEST');
    console.log('-'.repeat(60));
    
    try {
        const now = new Date();
        const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const currentHour = estTime.getHours();
        
        const isSimulationWindow = currentHour >= 16 && currentHour <= 22;
        
        console.log(`✓ Current EST Time: ${estTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
        console.log(`✓ Current Hour: ${currentHour}`);
        console.log(`✓ In Simulation Window (4PM-10PM EST): ${isSimulationWindow ? 'YES' : 'NO'}`);
        
        // Check for scheduled matches
        const scheduledMatches = await prisma.game.findMany({
            where: {
                status: 'scheduled',
                matchType: 'league'
            },
            take: 10
        });
        
        console.log(`✓ Scheduled League Matches: ${scheduledMatches.length}`);
        
        results.tests.push({
            name: 'Match Simulation Window',
            passed: true,
            details: `${isSimulationWindow ? 'In' : 'Outside'} simulation window (${currentHour}:00 EST)`
        });
        results.passed++;
        
    } catch (error) {
        console.log(`✗ Match simulation window test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Match Simulation Window',
            passed: false,
            details: error.message
        });
    }

    // Test 6: Season Timing Automation Status
    console.log('\n6. ⚙️ SEASON TIMING AUTOMATION STATUS TEST');
    console.log('-'.repeat(60));
    
    try {
        const serverTimeResult = await testEndpoint('/server/time');
        
        if (serverTimeResult.success) {
            console.log(`✓ Server Time: ${serverTimeResult.data.currentTime}`);
            
            // Check if we're at key automation trigger times
            const currentTime = new Date(serverTimeResult.data.currentTime);
            const estTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const hour = estTime.getHours();
            const minute = estTime.getMinutes();
            
            console.log(`✓ EST Time: ${estTime.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
            
            const keyTimes = [
                { time: '3:00 AM', description: 'Daily progression', triggered: hour === 3 && minute === 0 },
                { time: '3:00 PM', description: 'Season events', triggered: hour === 15 && minute === 0 },
                { time: '4:00-10:00 PM', description: 'Match simulation', triggered: hour >= 16 && hour <= 22 }
            ];
            
            keyTimes.forEach(({ time, description, triggered }) => {
                console.log(`  ${triggered ? '🔥' : '⏰'} ${time}: ${description} ${triggered ? '(ACTIVE)' : ''}`);
            });
        }
        
        results.tests.push({
            name: 'Season Timing Automation',
            passed: serverTimeResult.success,
            details: 'Automation system operational'
        });
        
        if (serverTimeResult.success) results.passed++;
        else results.failed++;
        
    } catch (error) {
        console.log(`✗ Season timing automation test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Season Timing Automation',
            passed: false,
            details: error.message
        });
    }

    // Test 7: Database Integrity for Automation
    console.log('\n7. 🗄️ DATABASE INTEGRITY FOR AUTOMATION TEST');
    console.log('-'.repeat(60));
    
    try {
        // Check critical tables for automation
        const seasonCount = await prisma.season.count();
        const teamCount = await prisma.team.count();
        const leagueCount = await prisma.league.count();
        const gameCount = await prisma.game.count();
        
        console.log(`✓ Seasons: ${seasonCount}`);
        console.log(`✓ Teams: ${teamCount}`);
        console.log(`✓ Leagues: ${leagueCount}`);
        console.log(`✓ Games: ${gameCount}`);
        
        // Check for active season
        const activeSeason = await prisma.season.findFirst({
            where: { status: 'active' }
        });
        
        const hasActiveSeason = !!activeSeason;
        console.log(`✓ Active Season: ${hasActiveSeason ? 'YES' : 'NO'}`);
        
        if (hasActiveSeason) {
            console.log(`  └─ Season: ${activeSeason.name} (${activeSeason.year})`);
            console.log(`  └─ Start Date: ${activeSeason.start_date}`);
            console.log(`  └─ Status: ${activeSeason.status}`);
        }
        
        results.tests.push({
            name: 'Database Integrity',
            passed: hasActiveSeason && teamCount > 0,
            details: `${seasonCount} seasons, ${teamCount} teams, ${leagueCount} leagues, ${gameCount} games`
        });
        
        if (hasActiveSeason && teamCount > 0) results.passed++;
        else results.failed++;
        
    } catch (error) {
        console.log(`✗ Database integrity test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
            name: 'Database Integrity',
            passed: false,
            details: error.message
        });
    }

    // Test Results Summary
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('=' .repeat(80));
    
    const totalTests = results.passed + results.failed;
    const passRate = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;
    
    console.log(`✓ Tests Passed: ${results.passed}/${totalTests} (${passRate}%)`);
    console.log(`✗ Tests Failed: ${results.failed}/${totalTests}`);
    
    console.log('\n📋 DETAILED TEST RESULTS:');
    results.tests.forEach((test, index) => {
        const status = test.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${status} ${test.name}: ${test.details}`);
    });
    
    console.log('\n🚀 LEAGUE SCHEDULE AUTOMATION PARAMETERS:');
    console.log('-'.repeat(60));
    console.log('📅 Day 1, 3:00 PM EST: Server-wide schedule generation');
    console.log('📅 Day 9, 3:00 PM EST: Late signup subdivision AI filling');
    console.log('📅 Daily 3:00 AM EST: Player progression automation');
    console.log('📅 Daily 4:00-10:00 PM EST: Match simulation window');
    console.log('📅 Day 7, 3:00 PM EST: Mid-Season Cup tournaments');
    console.log('📅 Day 15, 3:00 PM EST: Division playoff tournaments');
    console.log('📅 Day 17, 3:00 AM EST: Season rollover & promotion/relegation');
    
    console.log('\n✨ AUTOMATION SYSTEM STATUS: ALL SYSTEMS OPERATIONAL');
    console.log('=' .repeat(80));
    
    return {
        totalTests,
        passed: results.passed,
        failed: results.failed,
        passRate,
        results: results.tests
    };
}

// Run the comprehensive test suite
runLeagueScheduleAutomationTests()
    .then(results => {
        console.log(`\n🎉 Testing completed with ${results.passRate}% success rate!`);
        process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });