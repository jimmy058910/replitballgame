import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const router = Router();

// Serve the game manual markdown file
router.get("/manual", async (req, res) => {
  try {
    const manualPath = path.join(process.cwd(), "docs", "GAME_MANUAL.md");
    const content = await fs.readFile(manualPath, "utf-8");
    res.send(content);
  } catch (error) {
    console.error("Error reading manual:", error);
    res.status(404).json({ error: "Manual not found" });
  }
});

export default router;