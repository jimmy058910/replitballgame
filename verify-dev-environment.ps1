# Development Environment Verification Script
# Run this on both computers to ensure identical setup

Write-Host "🔍 Realm Rivalry Development Environment Verification" -ForegroundColor Cyan
Write-Host "=" * 60

# Check prerequisites
Write-Host "`n📋 Prerequisites Check:" -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js: Not installed" -ForegroundColor Red
}

try {
    $npmVersion = npm --version
    Write-Host "✅ NPM: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ NPM: Not installed" -ForegroundColor Red
}

try {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python: Not installed" -ForegroundColor Red
}

try {
    $uvxVersion = uvx --version
    Write-Host "✅ UVX: $uvxVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ UVX: Not installed (pip install uv)" -ForegroundColor Red
}

try {
    $claudeVersion = claude --version
    Write-Host "✅ Claude Code: $claudeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Claude Code: Not installed" -ForegroundColor Red
}

try {
    $gcloudVersion = (gcloud --version | Select-Object -First 1)
    Write-Host "✅ Google Cloud SDK: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK: Not installed" -ForegroundColor Red
}

# Check project directory
Write-Host "`n📁 Project Directory Check:" -ForegroundColor Yellow
$projectPath = "C:\Users\Jimmy\OneDrive\Documents\Realm Rivalry\replitballgame"

if (Test-Path $projectPath) {
    Write-Host "✅ Project directory exists: $projectPath" -ForegroundColor Green
    
    # Check key files
    $criticalFiles = @(
        "package.json",
        ".env.local.example", 
        "CLAUDE.md",
        ".claude\commands\dev-start.md",
        ".claude\commands\primer.md"
    )
    
    foreach ($file in $criticalFiles) {
        $fullPath = Join-Path $projectPath $file
        if (Test-Path $fullPath) {
            Write-Host "  ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file (missing)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

# Check MCP Server availability
Write-Host "`n🤖 MCP Server Availability:" -ForegroundColor Yellow

# Test Playwright MCP
try {
    $playwrightTest = npx "@playwright/mcp@latest" --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Playwright MCP: Available" -ForegroundColor Green
    } else {
        Write-Host "❌ Playwright MCP: Failed to load" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Playwright MCP: Not available" -ForegroundColor Red
}

# Test Serena MCP
try {
    $serenaTest = uvx --from "git+https://github.com/oraios/serena" serena --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Serena MCP: Available" -ForegroundColor Green
    } else {
        Write-Host "❌ Serena MCP: Failed to load" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Serena MCP: Not available" -ForegroundColor Red
}

# Test In Memoria MCP
try {
    $memoriaTest = npx in-memoria --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ In Memoria MCP: Available" -ForegroundColor Green
    } else {
        Write-Host "❌ In Memoria MCP: Failed to load" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ In Memoria MCP: Not available" -ForegroundColor Red
}

# Check Claude Code MCP configuration
Write-Host "`n⚙️ Claude Code MCP Configuration:" -ForegroundColor Yellow
$claudeConfigPath = "$env:USERPROFILE\.claude.json"

if (Test-Path $claudeConfigPath) {
    Write-Host "✅ Claude config file exists" -ForegroundColor Green
    
    try {
        $claudeConfig = Get-Content $claudeConfigPath | ConvertFrom-Json
        $mcpServers = $claudeConfig.projects.$projectPath.mcpServers
        
        if ($mcpServers) {
            $expectedServers = @("playwright", "serena", "in-memoria")
            foreach ($server in $expectedServers) {
                if ($mcpServers.$server) {
                    Write-Host "  ✅ $server MCP configured" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ $server MCP not configured" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ No MCP servers configured in Claude Code" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Unable to parse Claude config file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Claude config file not found: $claudeConfigPath" -ForegroundColor Red
}

# Test MCP connections (if Claude Code available)
Write-Host "`n🔗 MCP Connection Test:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    $mcpList = claude mcp list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MCP servers status:" -ForegroundColor Green
        Write-Host $mcpList
    } else {
        Write-Host "❌ Unable to check MCP server status" -ForegroundColor Red
        Write-Host $mcpList
    }
    Pop-Location
} catch {
    Write-Host "❌ Claude Code MCP check failed" -ForegroundColor Red
}

# Project dependencies check
Write-Host "`n📦 Project Dependencies:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    
    if (Test-Path "package-lock.json") {
        Write-Host "✅ Dependencies locked with package-lock.json" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No package-lock.json found" -ForegroundColor Yellow
    }
    
    $nodeModulesExists = Test-Path "node_modules"
    if ($nodeModulesExists) {
        Write-Host "✅ node_modules directory exists" -ForegroundColor Green
    } else {
        Write-Host "❌ node_modules not found - run 'npm install'" -ForegroundColor Red
    }
    
    Pop-Location
} catch {
    Write-Host "❌ Unable to check project dependencies" -ForegroundColor Red
}

# Environment file check
Write-Host "`n🌍 Environment Configuration:" -ForegroundColor Yellow
Push-Location $projectPath

if (Test-Path ".env.local") {
    Write-Host "✅ .env.local exists" -ForegroundColor Green
    
    # Check for critical environment variables (without showing values)
    $envContent = Get-Content ".env.local"
    $criticalVars = @("DATABASE_URL", "FIREBASE_PROJECT_ID", "GOOGLE_CLOUD_PROJECT")
    
    foreach ($var in $criticalVars) {
        $found = $envContent | Where-Object { $_ -like "$var=*" }
        if ($found) {
            Write-Host "  ✅ $var configured" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $var missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ .env.local not found - copy from .env.local.example" -ForegroundColor Red
}

Pop-Location

# Summary
Write-Host "`n📊 Environment Status Summary:" -ForegroundColor Cyan
Write-Host "Run this script on both computers and compare results." -ForegroundColor White
Write-Host "All items should show ✅ for consistent development environments." -ForegroundColor White
Write-Host "`nFor setup instructions, run: /dev-setup-sync in Claude Code" -ForegroundColor Yellow