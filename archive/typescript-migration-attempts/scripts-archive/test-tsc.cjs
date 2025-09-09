const { execSync } = require('child_process');
const path = require('path');

console.log('Testing TSC execution...');

try {
  const projectRoot = path.join(__dirname, '..');
  console.log('Project root:', projectRoot);
  
  const result = execSync('npx tsc --noEmit', { 
    encoding: 'utf8', 
    cwd: projectRoot,
    stdio: 'inherit' // This will show the output directly
  });
  
  console.log('No errors found');
} catch (error) {
  console.log('Errors found (exit code:', error.status, ')');
}