import express from "express";
import {
  addShow,
  getShows,
  getShow,
} from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

// Lấy tất cả show (dùng cho danh sách sắp chiếu)
showRouter.get("/all", getShows);

// Lấy thông tin 1 show theo movieId
showRouter.get("/:movieId", getShow);

// Thêm show mới (chỉ cho admin)
showRouter.post("/add", protectAdmin, addShow);

export default showRouter;
