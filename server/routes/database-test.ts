import { Router } from 'express';
import { getPrismaClient } from '../db.js';

const router = Router();

// Database connection test endpoint for debugging
router.post('/database-test', async (req, res) => {
  try {
    console.log('🔍 MANUAL DATABASE TEST INITIATED:', new Date().toISOString());
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as timestamp`;
    console.log('✅ Database query successful:', result);
    
    // Test a simple table query
    const userCount = await prisma.userProfile.count();
    console.log('✅ User count query successful:', userCount);
    
    res.json({
      status: 'success',
      connection: 'working',
      testQuery: result,
      userCount: userCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DATABASE TEST FAILED:', error);
    res.status(500).json({
      status: 'error',
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple GET version for easier testing
router.get('/database-test', async (req, res) => {
  try {
    console.log('🔍 SIMPLE DATABASE TEST:', new Date().toISOString());
    console.log('🔍 Using working db.ts Prisma client');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Simple database test successful');
    
    res.json({
      status: 'success',
      connection: 'working',
      result: result,
      client: 'db.ts',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SIMPLE DATABASE TEST FAILED:', error);
    res.status(500).json({
      status: 'error',
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      client: 'db.ts',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;