#!/usr/bin/env tsx

// Trigger schedule generation using the existing server infrastructure
import { ScheduleGenerationService } from './server/services/scheduleGenerationService';

async function triggerScheduleGeneration() {
  console.log('🚀 === TRIGGERING SCHEDULE GENERATION ===');
  
  try {
    // Call the schedule generation service directly
    const result = await ScheduleGenerationService.generateCompleteSchedule();
    
    console.log('✅ SCHEDULE GENERATION RESULT:');
    console.log(`   Total matches created: ${result.totalMatches}`);
    console.log(`   Days scheduled: ${result.daysScheduled}`);
    
    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
    } else {
      console.log('🎉 Schedule generation completed successfully!');
      console.log('📊 Summary:');
      console.log(`   - Generated ${result.totalMatches} total games`);
      console.log(`   - Covers Days 5-14 (10 days)`);
      console.log(`   - 4 games per day at 4:00, 4:15, 4:30, 4:45 PM EDT`);
      console.log(`   - Each team plays once per day`);
    }
    
  } catch (error) {
    console.error('❌ Failed to trigger schedule generation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
triggerScheduleGeneration();