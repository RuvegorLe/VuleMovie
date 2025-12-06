// embedding.js
import fetch from "node-fetch";

// (Tuỳ chọn) chỉ chuẩn hoá whitespace, KHÔNG xoá dấu/chấm câu để giữ ngữ nghĩa tốt hơn
export const normalize = (s) =>
  String(s ?? "").replace(/\s+/g, " ").trim();

export const createEmbedding = async (textOrArray) => {
  if (!textOrArray || (Array.isArray(textOrArray) && textOrArray.length === 0)) {
    throw new Error("Empty text for embedding");
  }

  const baseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "nomic-embed-text:latest";

  const input = Array.isArray(textOrArray)
    ? textOrArray.map(normalize)
    : [normalize(textOrArray)];

  const resp = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input })
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Ollama /api/embed ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  if (!data.embeddings || !data.embeddings[0]) {
    throw new Error("No embeddings returned from Ollama");
  }

  // Trả một vector nếu input là string, còn nếu batch thì trả mảng vector
  return Array.isArray(textOrArray) ? data.embeddings : data.embeddings[0];
};
