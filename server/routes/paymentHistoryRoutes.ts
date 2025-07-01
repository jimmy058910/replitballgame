import { Router, type Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { PaymentHistoryService } from "../services/paymentHistoryService";
import { ErrorCreators, asyncHandler } from "../services/errorService";
import { z } from "zod";

const router = Router();

// Validation schemas
const paymentHistoryQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  currencyFilter: z.enum(["credits", "gems", "both"]).optional().default("both"),
  transactionType: z.string().optional(),
  status: z.string().optional(),
});

// Get user's payment history with filtering
router.get("/", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  const queryParams = paymentHistoryQuerySchema.parse(req.query);
  
  const result = await PaymentHistoryService.getUserPaymentHistory(userId, queryParams);
  
  res.json(result);
}));

// Get transaction summary for current user
router.get("/summary", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  const summary = await PaymentHistoryService.getUserTransactionSummary(userId);
  
  res.json(summary);
}));

// Get team payment history (for team-specific purchases)
router.get("/team/:teamId", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { teamId } = req.params;
  
  // Verify user owns this team (basic security check)
  // This should be expanded based on your team ownership logic
  
  const transactions = await PaymentHistoryService.getTeamPaymentHistory(teamId);
  
  res.json({ transactions });
}));

// Record a new transaction (for system use)
const recordTransactionSchema = z.object({
  teamId: z.string().optional(),
  transactionType: z.enum(["purchase", "refund", "reward", "admin_grant"]),
  itemType: z.string().optional(),
  itemName: z.string().optional(),
  amount: z.number().optional(),
  creditsChange: z.number().default(0),
  gemsChange: z.number().default(0),
  status: z.string().default("completed"),
  paymentMethod: z.string().optional(),
  metadata: z.any().optional(),
});

router.post("/record", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const transactionData = recordTransactionSchema.parse(req.body);
  
  const transaction = await PaymentHistoryService.recordTransaction({
    userId,
    ...transactionData,
  });
  
  res.json({ transaction });
}));

// Helper endpoint to record item purchases
const itemPurchaseSchema = z.object({
  teamId: z.string().optional(),
  itemName: z.string(),
  itemType: z.string(),
  creditsSpent: z.number().default(0),
  gemsSpent: z.number().default(0),
  metadata: z.any().optional(),
});

router.post("/purchase", isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const purchaseData = itemPurchaseSchema.parse(req.body);
  
  const transaction = await PaymentHistoryService.recordItemPurchase(
    userId,
    purchaseData.teamId || null,
    purchaseData.itemName,
    purchaseData.itemType,
    purchaseData.creditsSpent,
    purchaseData.gemsSpent,
    purchaseData.metadata
  );
  
  res.json({ transaction });
}));

export default router;