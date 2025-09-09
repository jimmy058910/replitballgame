import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Realm Rivalry
 * Ensures consistent Chrome browser usage for design reviews
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    // Use Chrome for consistency with MCP Playwright
    channel: 'chrome',
    // Base URL for local development
    baseURL: 'http://localhost:5173',
    // Capture traces and screenshots for design reviews
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Viewport settings for design review
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome' // Force Chrome usage
      },
    },
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        channel: 'chrome'
      },
    },
    
    {
      name: 'tablet-chrome', 
      use: {
        ...devices['iPad Pro'],
        channel: 'chrome'
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev:local',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for dev server to start
  },
});