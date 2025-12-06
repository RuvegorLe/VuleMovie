import React, { useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { Loader2, MessageCircle, Minus, X, Send, GripHorizontal } from "lucide-react";
import toast from "react-hot-toast";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const buildImg = (base, path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return (base || "") + path;
};

export default function ChatMoviesWidget({
  initialX = 24,
  initialY = 24,
  defaultOpen = true,
  defaultWidth = 360,
  defaultHeight = 520,
  topKDefault = 5,
}) {
  const { axios, getToken, image_base_url } = useAppContext();

  // --- UI state ---
  const [open, setOpen] = useState(defaultOpen);
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem("chat.movies.pos");
      return saved ? JSON.parse(saved) : { x: initialX, y: initialY };
    } catch {
      return { x: initialX, y: initialY };
    }
  });
  const [size, setSize] = useState(() => {
    try {
      const saved = localStorage.getItem("chat.movies.size");
      return saved ? JSON.parse(saved) : { w: defaultWidth, h: defaultHeight };
    } catch {
      return { w: defaultWidth, h: defaultHeight };
    }
  });

  const headerRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });

  // --- Chat state ---
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(topKDefault);
  const [messages, setMessages] = useState([]); // [{role:'user'|'assistant', content}]
  const [hits, setHits] = useState([]); // top-k phim của câu hỏi cuối

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const nx = e.clientX - dragOffset.current.dx;
      const ny = e.clientY - dragOffset.current.dy;
      const maxX = window.innerWidth - size.w - 8;
      const maxY = window.innerHeight - size.h - 8;
      setPos({
        x: clamp(nx, 8, Math.max(8, maxX)),
        y: clamp(ny, 8, Math.max(8, maxY)),
      });
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [size.w, size.h]);

  useEffect(() => {
    try {
      localStorage.setItem("chat.movies.pos", JSON.stringify(pos));
      localStorage.setItem("chat.movies.size", JSON.stringify(size));
    } catch {}
  }, [pos, size]);

  const onHeaderPointerDown = (e) => {
    if (!headerRef.current) return;
    dragging.current = true;
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const ask = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((xs) => [...xs, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    setHits([]);
    try {
      const res = await axios.post(
        "/api/chat/movies",
        { message: q, top_k: Number(topK) || 5 },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      const answer = res?.data?.answer || "(no answer)";
      const _hits = Array.isArray(res?.data?.hits) ? res.data.hits : [];
      setMessages((xs) => [...xs, { role: "assistant", content: answer }]);
      setHits(_hits);
    } catch (err) {
      console.error(err);
      toast.error("Chat failed");
      setMessages((xs) => [...xs, { role: "assistant", content: "Xin lỗi, mình không trả lời được." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  if (!open) {
    return (
      <button
        className="fixed w-10 h-10 bottom-6 right-6 z-50 rounded-full p-3 bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        onClick={() => setOpen(true)}
        title="Open Movie Chat"
      >
        <MessageCircle className="w-5 h-5 bg-center" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Header (draggable) */}
      <div
        ref={headerRef}
        onPointerDown={onHeaderPointerDown}
        className="cursor-grab active:cursor-grabbing select-none px-3 py-2 flex items-center justify-between bg-indigo-600 text-white rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 opacity-80" />
          <span className="font-semibold">Movie Chat (Gemini + Embedding)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-indigo-500"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-indigo-500"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500">
            Hỏi mình về phim trong DB nhé: ví dụ “Gợi ý phim hành động hậu tận thế?”, “Diễn viên chính của X?”, “Có phim nào phát hành 2025 không?”.
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-2xl px-3 py-2 bg-indigo-600 text-white shadow"
                : "mr-auto max-w-[80%] rounded-2xl px-3 py-2 bg-gray-100 text-gray-900 shadow"
            }
          >
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
          </div>
        ))}

        {/* Hits */}
        {hits.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-semibold text-gray-600 mb-2">Top matches</div>
            <div className="grid grid-cols-3 gap-2">
              {hits.map((h) => (
                <div key={h._id} className="border rounded-lg overflow-hidden">
                  <img
                    src={buildImg(image_base_url, h.poster_path)}
                    alt={h.title}
                    className="w-full h-28 object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <div className="p-2">
                    <div className="text-xs font-medium line-clamp-2">{h.title}</div>
                    <div className="text-[10px] text-gray-500 flex justify-between mt-1">
                      <span>{h.release_date || "-"}</span>
                      <span>{typeof h.score === "number" ? h.score.toFixed(3) : "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tạo câu trả lời…
          </div>
        )}
      </div>

      {/* Footer / input */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs text-gray-600">Top-K:</label>
          <input
            type="number"
            min={1}
            max={20}
            className="w-16 border rounded px-2 py-1 text-xs"
            value={topK}
            onChange={(e) => setTopK(e.target.value)}
          />
          <div className="text-[11px] text-gray-500">Số phim dùng làm context</div>
        </div>
        <div className=" text-gray-500 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Nhập câu hỏi… (Enter để gửi, Shift+Enter xuống dòng)"
          />
          <button
            onClick={ask}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-60"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
