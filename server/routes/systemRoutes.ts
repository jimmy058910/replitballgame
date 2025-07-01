import { Router, type Request, type Response } from "express";
import { ErrorCreators, asyncHandler, logInfo } from "../services/errorService";
import { z } from "zod";

const router = Router();

// Demo endpoint for error handling system
router.get('/error-demo/:type', asyncHandler(async (req: Request, res: Response) => {
  const errorType = req.params.type;
  
  logInfo("Error handling demo endpoint called", { 
    errorType, 
    requestId: req.requestId 
  });

  switch (errorType) {
    case 'validation':
      // Throw a validation error
      const schema = z.object({ required: z.string() });
      schema.parse({}); // This will throw a ZodError
      break;
      
    case 'not-found':
      throw ErrorCreators.notFound("Demo resource not found");
      
    case 'conflict':
      throw ErrorCreators.conflict("Demo conflict - resource already exists");
      
    case 'unauthorized':
      throw ErrorCreators.unauthorized("Demo unauthorized access");
      
    case 'forbidden':
      throw ErrorCreators.forbidden("Demo forbidden operation");
      
    case 'database':
      throw ErrorCreators.database("Demo database connection error");
      
    case 'external':
      throw ErrorCreators.externalService("Demo external API failure");
      
    case 'rate-limit':
      throw ErrorCreators.rateLimit("Demo rate limit exceeded");
      
    case 'internal':
      throw ErrorCreators.internal("Demo internal server error");
      
    default:
      // Regular error - should be converted to internal error
      throw new Error("Demo generic error");
  }
  
  res.json({ message: "This should not be reached" });
}));

// Server time endpoint (existing functionality)
router.get('/time', asyncHandler(async (req: Request, res: Response) => {
  const { getServerTimeInfo } = await import("@shared/timezone");
  const timeInfo = getServerTimeInfo();
  
  logInfo("Server time requested", { 
    currentTime: timeInfo.currentTime,
    requestId: req.requestId 
  });
  
  res.json({ 
    success: true,
    data: {
      currentTime: timeInfo.currentTime.toISOString(),
      formattedTime: timeInfo.formattedTime,
      timezone: timeInfo.timezone,
      isSchedulingWindow: timeInfo.isSchedulingWindow,
      schedulingWindow: timeInfo.schedulingWindow,
      timeUntilNextWindow: timeInfo.timeUntilNextWindow
    }
  });
}));

// Health check endpoint
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  logInfo("Health check requested", { 
    status: healthStatus.status,
    uptime: healthStatus.uptime,
    requestId: req.requestId 
  });
  
  res.json({ 
    success: true,
    data: healthStatus
  });
}));

export { router as systemRoutes };