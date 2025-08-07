// Simple health check endpoint
export function createHealthCheck() {
  return (req: any, res: any) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 5000
    });
  };
}