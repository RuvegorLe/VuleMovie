// helpers/embedding-text.js
export const buildEmbeddingText = (m) => {
  return [
    `title: ${m.title || ""}`,
    m.tagline ? `tagline: ${m.tagline}` : "",
    `overview: ${m.overview || ""}`,
    m.language ? `language: ${m.language}` : "",
    m.release_date ? `release_date: ${m.release_date}` : "",
    m.vote_average ? `vote_average: ${m.vote_average}` : "",
    ...(Array.isArray(m.genres) ? m.genres : []).map(g => `genre: ${g?.name ?? g?.id ?? ""}`),
    ...(Array.isArray(m.casts) ? m.casts : []).map(c => `cast: ${c?.name ?? ""}`)
  ].filter(Boolean).join("\n");
};

// Phát hiện thay đổi các trường ảnh hưởng tới embedding
export const hasEmbeddingRelevantChange = (oldDoc, patch) => {
  const touched = ["title","overview","tagline","language","release_date", "vote_average","genres","casts"];
  const changedScalar = touched.some(k =>
    k !== "genres" && k !== "casts" &&
    Object.prototype.hasOwnProperty.call(patch, k) &&
    String(oldDoc?.[k] ?? "") !== String(patch?.[k] ?? "")
  );

  const oldGenres = (oldDoc?.genres || []).map(g => g?.name ?? g?.id ?? "").join("|");
  const newGenres = (patch?.genres ?? oldDoc?.genres ?? []).map(g => g?.name ?? g?.id ?? "").join("|");

  const oldCasts = (oldDoc?.casts || []).map(c => c?.name ?? "").join("|");
  const newCasts = (patch?.casts ?? oldDoc?.casts ?? []).map(c => c?.name ?? "").join("|");

  return changedScalar || oldGenres !== newGenres || oldCasts !== newCasts;
};
