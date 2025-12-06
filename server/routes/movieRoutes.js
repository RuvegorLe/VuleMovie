import express from "express";
import { getMovies, addMovie, updateMovie, deleteMovie, importNowPlaying } from "../controllers/movieController.js";
import { protectAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protectAdmin, getMovies);
router.post("/", protectAdmin, addMovie);
router.put("/:id", protectAdmin, updateMovie);
router.delete("/:id", protectAdmin, deleteMovie);
router.get("/import/tmdb", protectAdmin, importNowPlaying);
router.post("/:id/reembed", protectAdmin, async (req, res) => {
  // Ép cờ re-embed rồi reuse updateMovie
  req.query.reembed = "1";
  req.body = { ...(req.body || {}), force_reembed: true };
  return updateMovie(req, res);
});

export default router;
