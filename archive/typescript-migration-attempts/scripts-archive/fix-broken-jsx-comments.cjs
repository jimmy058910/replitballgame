#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Fix broken JSX comments that are causing syntax errors
 */

const fixes = [
  {
    file: 'client/src/pages/Inventory.tsx',
    fixes: [
      { old: '      <div className="min-h-screen bg-gray-900 text-white">\n      {/* */}\n      <Navigation />', 
        new: '      <div className="min-h-screen bg-gray-900 text-white">\n      <Navigation />' },
      { old: '                                  <span className="capitalize">{stat}:</span>\n                                  {/* */}\n                                  <span className="text-green-400">+{boost}</span>',
        new: '                                  <span className="capitalize">{stat}:</span>\n                                  <span className="text-green-400">+{boost}</span>' }
    ]
  },
  {
    file: 'client/src/components/WebSocketTestPage.tsx',
    fixes: [
      { old: '                      {/* \n                      <Badge variant="outline" size="sm">\n                        {Math.floor(event.time / 60)}:{(event.time % 60).toString().padStart(2, \'0\')} */}',
        new: '                      <Badge variant="outline" size="sm">\n                        {Math.floor(event.time / 60)}:{(event.time % 60).toString().padStart(2, \'0\')}' },
      { old: '                      {/* \n                      <Badge variant="secondary" size="sm">\n                        {event.type} */}',
        new: '                      <Badge variant="secondary" size="sm">\n                        {event.type}' }
    ]
  },
  {
    file: 'client/src/components/PlayerSkillsManager.tsx',
    fixes: [
      { old: '                      {/*  */}\n                      <span className="text-sm font-medium">{count}</span>',
        new: '                      <span className="text-sm font-medium">{count}</span>' },
      { old: '                        {/*  */}\n                        <span className="text-sm font-medium">{count} skills</span>',
        new: '                        <span className="text-sm font-medium">{count} skills</span>' },
      { old: '                        {/*  */}\n                        <span className="text-sm font-medium">{count}</span>',
        new: '                        <span className="text-sm font-medium">{count}</span>' }
    ]
  },
  {
    file: 'client/src/components/LiveMatchSimulation.tsx',
    fixes: [
      { old: '      {/* Halftime Ad System - Temporarily disabled for testing */}\n      {/* \n      {false && liveState.currentHalf === 2 && !halftimeAdShown && (\n        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">\n          <Card className="p-6">\n            <CardContent>\n              <div className="text-center"> */}\n                <h3 className="text-lg font-bold mb-4">Halftime Break</h3>',
        new: '      {/* Halftime Ad System - Temporarily disabled for testing */}\n      {/* \n      {false && liveState.currentHalf === 2 && !halftimeAdShown && (\n        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">\n          <Card className="p-6">\n            <CardContent>\n              <div className="text-center">\n                <h3 className="text-lg font-bold mb-4">Halftime Break</h3>' }
    ]
  },
  {
    file: 'client/src/components/GameSimulationUI.tsx',
    fixes: [
      { old: '      {/* Post-Match Summary - Show when match is finished */}\n      {/*\n      {liveState?.status === \'FINISHED\' && (\n        <div className="mb-6">\n          <Card>\n            <CardHeader>\n              <CardTitle className="text-lg flex items-center gap-2"> */}\n                <Trophy className="h-5 w-5 text-yellow-500" />',
        new: '      {/* Post-Match Summary - Show when match is finished */}\n      {liveState?.status === \'FINISHED\' && (\n        <div className="mb-6">\n          <Card>\n            <CardHeader>\n              <CardTitle className="text-lg flex items-center gap-2">\n                <Trophy className="h-5 w-5 text-yellow-500" />' }
    ]
  },
  {
    file: 'client/src/components/FinancialCenter.tsx',
    fixes: [
      { old: '        <TabsContent value="history" className="space-y-4">\n          {/*  */}\n          <PaymentHistory teamId={teamId} />',
        new: '        <TabsContent value="history" className="space-y-4">\n          <PaymentHistory teamId={teamId} />' }
    ]
  },
  {
    file: 'client/src/components/EnhancedLoadingWrapper.tsx',
    fixes: [
      { old: '    <EnhancedLoadingWrapper {...options}>\n      {/*  */}\n      <LazyComponent {...props} />',
        new: '    <EnhancedLoadingWrapper {...options}>\n      <LazyComponent {...props} />' }
    ]
  }
];

let totalFixes = 0;

fixes.forEach(({ file, fixes: fileFixes }) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fileFixes.forEach(fix => {
    if (content.includes(fix.old)) {
      content = content.replace(fix.old, fix.new);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
    totalFixes++;
  }
});

console.log(`\n📊 Total files fixed: ${totalFixes}`);