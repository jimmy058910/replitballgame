// Simple health check endpoint with environment debugging
export function createHealthCheck() {
  return (req: any, res: any) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected', // This will be updated when database is connected
      version: '2.0.0',
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not-set',
        production: process.env.NODE_ENV === 'production',
        port: process.env.PORT || 5000
      }
    });
  };
}