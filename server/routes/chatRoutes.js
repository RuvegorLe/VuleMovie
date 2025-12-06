// routes/chatRouter.js
import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import { chatMovies } from "../controllers/chatController.js";

const router = express.Router();
// router.post("/movies", protectAdmin, chatMovies);
router.post("/movies",  chatMovies);
export default router;
