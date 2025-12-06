import Movie from "../models/Movie.js";
import axios from "axios";
import { createEmbedding } from "../lib/ollama.js";
import { buildEmbeddingText, hasEmbeddingRelevantChange } from "../lib/embedding.js";

// Lấy tất cả phim
export const getMovies = async (req, res) => {
  try {
    const movies = await Movie.find().sort({ release_date: -1 });
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching movies" });
  }
};

export const addMovie = async (req, res) => {
  try {
    const movieData = req.body;

    // kiểm tra trùng
    const existing = await Movie.findById(movieData._id);
    if (existing) return res.status(400).json({ message: "Movie already exists" });

    // Ghép nội dung có nhãn để giữ ngữ cảnh tốt hơn
    const textToEmbed = [
      `title: ${movieData.title || ""}`,
      movieData.tagline ? `tagline: ${movieData.tagline}` : "",
      `overview: ${movieData.overview || ""}`,
      movieData.language ? `language: ${movieData.language}` : "",
      movieData.release_date ? `release_date: ${movieData.release_date}` : "",
      movieData.vote_average ? `vote_average: ${movieData.vote_average}` : "",
      ...(movieData.genres || []).map(g => `genre: ${g.name ?? g.id ?? ""}`),
      ...(movieData.casts || []).map(c => `cast: ${c.name ?? ""}`)
    ].filter(Boolean).join("\n");

    const embedding = await createEmbedding(textToEmbed);
    movieData.embedding = embedding;

    const movie = await Movie.create(movieData);
    res.json(movie);
  } catch (err) {
    console.error("AddMovie Error:", err);
    res.status(500).json({ message: "Error adding movie" });
  }
};


// Cập nhật phim
export const updateMovie = async (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body || {};

    const existing = await Movie.findById(id);
    if (!existing) return res.status(404).json({ message: "Movie not found" });

    // Cho phép ép re-embed qua query/body
    const reembedRequested =
      String(req.query.reembed || "").toLowerCase() === "1" ||
      patch.force_reembed === true;

    let needReembed = reembedRequested || hasEmbeddingRelevantChange(existing, patch);

    // Merge tạm để tạo text (không save)
    const merged = { ...existing.toObject(), ...patch };

    if (needReembed) {
      try {
        const textToEmbed = buildEmbeddingText(merged);
        const vector = await createEmbedding(textToEmbed);

        patch.embedding = vector;
        patch.embedding_model = process.env.OLLAMA_MODEL || "nomic-embed-text:latest";
        patch.embedding_updated_at = new Date();
      } catch (e) {
        // Tuỳ chính sách: fail-soft (vẫn update dữ liệu khác) hoặc fail-fast
        const strict = process.env.STRICT_REEMBED === "1";
        console.warn("[updateMovie] Re-embed failed:", e?.message || e);
        if (strict) {
          return res.status(502).json({ message: "Embedding service unavailable" });
        }
        // Nếu không strict: tiếp tục update, giữ embedding cũ
      }
    }

    const updated = await Movie.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    );

    return res.json(updated);
  } catch (err) {
    console.error("UpdateMovie Error:", err);
    return res.status(500).json({ message: "Error updating movie" });
  }
};

// Xóa phim
export const deleteMovie = async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: "Movie deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting movie" });
  }
};

// Import phim từ TMDB (chỉ trả về danh sách để frontend thêm)
export const importNowPlaying = async (req, res) => {
  try {
    const { data } = await axios.get("https://api.themoviedb.org/3/movie/now_playing", {
      headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
    });

    res.json({ success: true, movies: data.results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
