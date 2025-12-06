try {
  const response = await fetch("http://127.0.0.1:11434/api/embed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nomic-embed-text:latest",
      input:
        "_id: 507244; title: Afterburn; overview: Set against the backdrop of a postapocalyptic Earth whose Eastern Hemisphere...; poster_path: /xR0IhVBjbNU34b8erhJCgRbjXo3.jpg; release_date: 2025-08-20; language: en; tagline: The apocalypse isn't for everybody; vote_average: 6.88; runtime: 105",
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  console.log("✅ Embedding result:", result);
} catch (error) {
  console.error("❌ Error:", error.message);
}
