import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { createEmbedding } from "../lib/ollama.js";
import { generateWithGemini } from "../lib/gemini.js";

// cosine vì nomic-embed-text đã L2-normalized
function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

// build context cơ bản cho từng phim
function movieToContext(m) {
  const genres = (m.genres || [])
    .map(g => g?.name ?? g?.id ?? "")
    .filter(Boolean)
    .join(", ");

  const casts = (m.casts || [])
    .slice(0, 15)   // lấy tới 15 diễn viên (nhiều hơn hiện tại)
    .map(c => c?.name ?? "")
    .filter(Boolean)
    .join(", ");

  return [
    `[movie#${m._id}]`,
    `title: ${m.title || ""}`,
    m.tagline ? `tagline: ${m.tagline}` : "",
    `overview: ${m.overview || ""}`,
    `full_overview: ${m.overview || ""}`,
    m.vote_average ? `vote_average: ${m.vote_average}` : "",
    m.release_date ? `release_date: ${m.release_date}` : "",
    m.original_language ? `language: ${m.original_language}` : "",
    m.runtime ? `runtime: ${m.runtime}` : "",
    genres ? `genres: ${genres}` : "",
    casts ? `casts: ${casts}` : "",
  ].filter(Boolean).join("\n");
}

// Lấy lịch chiếu + giá vé của phim
async function getShowtimes(movieId) {
  const shows = await Show.find({
    movie: movieId,
    showDateTime: { $gte: new Date() }
  })
    .sort({ showDateTime: 1 })
    .lean();

  if (!shows.length) return "Không có suất chiếu tương lai.";

  return shows
    .map(s => {
      const d = new Date(s.showDateTime);
      const date = d.toLocaleDateString("vi-VN");
      const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const price = s.showPrice.toLocaleString() + "đ";
      return `• ${date} ${time} — ${price}`;
    })
    .join("\n");
}

// Build context: phim + showtime
async function movieToContextWithShowtimes(m) {
  const base = movieToContext(m);
  const showtimes = await getShowtimes(m._id);
  return base + `\nshowtimes:\n${showtimes}`;
}

// Build prompt cho Gemini
async function buildPromptPieces(userQuestion, hits) {
  const ctxParts = [];
  for (const hit of hits) {
    ctxParts.push(await movieToContextWithShowtimes(hit));
  }

  const context = ctxParts.join("\n\n");

  const system = `
Bạn là Trợ lý Điện Ảnh thông minh của website bán vé xem phim.
Luôn trả lời bằng tiếng Việt. CHỈ sử dụng thông tin trong CONTEXT, không dùng kiến thức ngoài.

YÊU CẦU CHUNG:
- Trả lời CHI TIẾT, đầy đủ thông tin nhất có thể từ context.
- Khi mô tả phim, trình bày các phần:
  • Tên phim (title)  
  • Chủ đề & sắc thái phim (tự suy luận từ overview, nhưng KHÔNG thêm thông tin mới)  
  • Nội dung phim (overview – giữ nguyên nội dung, không rút gọn trừ khi yêu cầu)
  • Thể loại (genres – liệt kê đầy đủ)
  • Diễn viên chính/phụ (casts – ưu tiên 5–10 người nếu có đủ dữ liệu)
  • Ngày phát hành (đổi sang DD/MM/YYYY)
  • Ngôn ngữ gốc
  • Điểm vote_average (giải thích mức độ: tốt / trung bình / xuất sắc)
  • Thời lượng (runtime, nếu có)
  • Lịch chiếu (showtimes – liệt kê đầy đủ ngày/giờ/giá vé)

YÊU CẦU VỀ LỊCH CHIẾU:
- Nếu có nhiều suất chiếu, hãy liệt kê toàn bộ.
- Nếu người dùng hỏi "giá vé" → lấy từ showtimes.
- Nếu không có suất chiếu trong tương lai → nói rõ.

TRẢ LỜI RỘNG:
- Nếu người dùng hỏi so sánh: phân tích từng phim dựa trên genres, overview, vote_average.
- Nếu người dùng hỏi đề xuất: đề xuất tất cả phim phù hợp theo context.
- Nếu người dùng không nói rõ → đưa ra 2–5 lựa chọn liên quan cao nhất và GIẢI THÍCH tại sao.

KHÔNG ĐƯỢC:
- Không bịa diễn viên mới.
- Không thêm nội dung phim không có trong overview.
- Không dùng kiến thức ngoài database.
  `.trim();

  return { system, context, user: userQuestion };
}

// API chính: POST /api/chat/movies
export const chatMovies = async (req, res) => {
  try {
    const { message, top_k = 5 } = req.body || {};
    if (!message) return res.status(400).json({ message: "Missing 'message'" });

    // 1) Embed câu hỏi
    const qVec = await createEmbedding(message);

    // 2) Lấy phim + similarity
    const docs = await Movie.find({}, {
      _id: 1, title: 1, tagline: 1, overview: 1, vote_average: 1,
      release_date: 1, original_language: 1, genres: 1, casts: 1,
      runtime: 1, embedding: 1, poster_path: 1
    }).lean();

    const scored = docs
      .filter(d => Array.isArray(d.embedding) && d.embedding.length)
      .map(d => ({ score: cosine(qVec, d.embedding), doc: d }))
      .sort((a, b) => b.score - a.score);

    const topHits = scored.slice(0, Math.min(+top_k, 20)).map(s => s.doc);

    // 3) Build prompt
    const prompt = await buildPromptPieces(message, topHits);

    // 4) Gọi Gemini
    const answer = await generateWithGemini(prompt);

    return res.json({
      answer,
      hits: scored.slice(0, top_k).map(({ score, doc }) => ({
        _id: doc._id,
        title: doc.title,
        poster_path: doc.poster_path,
        vote_average: doc.vote_average,
        release_date: doc.release_date,
        price: undefined, // chatbot tự trả lời từ showtimes trong context
        score: Number(score.toFixed(6)),
      })),
    });

  } catch (err) {
    console.error("[chatMovies] error:", err);
    return res.status(500).json({ message: "Chat failed" });
  }
};
