import('./server/services/dailyTournamentAutoFillService.js').then(async ({ dailyTournamentAutoFillService }) => {
  console.log('🧪 [MANUAL TRIGGER] Starting auto-fill for tournament 2...');
  try {
    await dailyTournamentAutoFillService.manualTriggerAutoFill(2);
    console.log('✅ [MANUAL TRIGGER] Auto-fill completed successfully!');
  } catch (error) {
    console.error('❌ [MANUAL TRIGGER] Auto-fill failed:', error);
  }
  process.exit(0);
});