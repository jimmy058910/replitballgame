#!/bin/bash

echo "🔧 FIXING ALL SERVER IMPORT EXTENSIONS..."

# Fix relative imports in all TypeScript files
find server/ -name "*.ts" -type f -exec sed -i -E 's/from ["'\''](\.\.?\/[^"'\'']*[^j][^s])["\'\']/from "\1.js"/g' {} \;

# Specific fixes for common patterns
find server/ -name "*.ts" -exec sed -i 's/from "\.\/index"/from "\.\/index.js"/g' {} \;
find server/ -name "*.ts" -exec sed -i 's/from "\.\.\/index"/from "\.\.\/index.js"/g' {} \;
find server/ -name "*.ts" -exec sed -i 's/from "\.\/storage\/index"/from "\.\/storage\/index.js"/g' {} \;
find server/ -name "*.ts" -exec sed -i 's/from "\.\.\/storage\/index"/from "\.\.\/storage\/index.js"/g' {} \;

# Fix storage-related imports that commonly cause issues
find server/routes/ -name "*.ts" -exec sed -i 's/from "\.\.\/storage"/from "\.\.\/storage.js"/g' {} \;
find server/routes/ -name "*.ts" -exec sed -i 's/from "\.\.\storage/index"/from "\.\.\/storage\/index.js"/g' {} \;

echo "✅ Import extensions fixed"
