// Direct trigger for the automation service simulation
import { SeasonTimingAutomationService } from './server/services/seasonTimingAutomationService.js';

async function triggerSimulationNow() {
  try {
    console.log('🎮 Getting automation service instance...');
    
    const automationService = SeasonTimingAutomationService.getInstance();
    
    console.log('⚡ Triggering match simulation window check directly...');
    
    // Call the checkMatchSimulationWindow method directly
    await automationService.checkMatchSimulationWindow();
    
    console.log('✅ Direct simulation trigger completed!');
    
  } catch (error) {
    console.error('❌ Error triggering simulation:', error.message);
    console.error('Full error:', error);
  }
}

triggerSimulationNow();