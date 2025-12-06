// lib/gemini.js
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY/GOOGLE_API_KEY in environment");
}

const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ai = new GoogleGenAI({ apiKey });

/**
 * Gọi Gemini để sinh câu trả lời.
 * Gộp system + context (top-k phim) + câu hỏi user vào 1 prompt (contents:string)
 */
export async function generateWithGemini({ system, context, user }) {
  const contents = [
    // Dạng Content[] (an toàn cho mở rộng sau này)
    {
      role: "user",
      parts: [
        {
          text:
`[SYSTEM]
${system}

[CONTEXT]
${context}

[QUESTION]
${user}

[INSTRUCTIONS]
- Trả lời ngắn gọn, ưu tiên tiếng Việt.
- Chỉ dùng dữ kiện có trong CONTEXT; nếu thiếu thì nói "Mình không chắc từ dữ liệu phim hiện có."`
        }
      ]
    }
  ];

  const resp = await ai.models.generateContent({
    model: modelName,
    contents
  });

  // SDK mới có resp.text tiện dụng
  return resp.text || "";
}
