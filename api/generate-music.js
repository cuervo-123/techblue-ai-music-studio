export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      title,
      artist,
      genre,
      mood,
      voice,
      language,
      duration,
      tempo,
      lyrics,
      instrumentalOnly
    } = req.body || {};

    if (!lyrics || !String(lyrics).trim()) {
      return res.status(400).json({ ok: false, error: "Lyrics are required" });
    }

    const safeDuration = Math.max(3, Math.min(Number(duration || 60), 600));
    const musicLengthMs = safeDuration * 1000;

    const prompt = [
      `Create a complete ${genre || "modern"} song.`,
      `Language: ${language || "Spanish"}.`,
      `Mood: ${mood || "inspirational"}.`,
      `Voice style: ${voice || "male expressive vocal"}.`,
      `Tempo: ${tempo || 96} BPM.`,
      `Title: ${title || "Untitled"}.`,
      `Artist reference: ${artist || "Unknown Artist"}.`,
      instrumentalOnly ? `Make it instrumental only.` : `Use sung vocals where appropriate.`,
      `Use these lyrics as the main lyrical basis:`,
      lyrics
    ].join("\n");

    const response = await fetch("https://api.elevenlabs.io/v1/music/compose?output_format=mp3_44100_128", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: musicLengthMs,
        model_id: "music_v1",
        force_instrumental: !!instrumentalOnly,
        sign_with_c2pa: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        ok: false,
        error: "ElevenLabs music generation failed",
        details: errorText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    return res.status(200).json({
      ok: true,
      mimeType: "audio/mpeg",
      audioBase64: base64Audio
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error.message
    });
  }
}
