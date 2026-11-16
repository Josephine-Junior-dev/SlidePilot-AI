// SlidePilot AI presentation generator
// Deploy as Supabase Edge Function: generate-presentation
// Required server-side secret: OPENAI_API_KEY
// Keep verify_jwt enabled when deploying this function.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "AI service is not configured. Add OPENAI_API_KEY to Supabase Edge Function secrets." }, 503);

  let input: { prompt?: string; slide_count?: number; theme?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const prompt = String(input.prompt ?? "").trim();
  const count = Math.min(15, Math.max(4, Number(input.slide_count) || 8));
  const theme = String(input.theme ?? "Modern minimal").slice(0, 60);

  if (prompt.length < 8) return json({ error: "Please provide a more detailed presentation topic." }, 400);
  if (prompt.length > 12000) return json({ error: "The presentation brief is too long. Keep it under 12,000 characters." }, 400);

  const system = `You are SlidePilot AI, an expert presentation strategist and slide writer.
Create a useful, specific, well-structured presentation from the user's brief.
Return ONLY valid JSON with this exact shape:
{"title":"short presentation title","slides":[{"heading":"slide heading","body":"concise slide content with line breaks where useful","layout":"title|content|closing"}]}
Create exactly ${count} slides. Slide 1 is a strong title slide. The final slide is a conclusion or call to action.
Use specific, practical content rather than generic filler. Do not invent statistics, sources, customer names, or facts. If evidence is missing, label assumptions clearly and suggest what should be validated.
Each content slide should have a clear point and 2-5 concise supporting points. Avoid markdown fences.
Visual style: ${theme}.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      const detail = result?.error?.message || "The AI provider could not generate this presentation.";
      return json({ error: detail }, response.status === 429 ? 429 : 502);
    }

    const raw = result?.choices?.[0]?.message?.content;
    if (!raw) return json({ error: "The AI provider returned an empty response. Please try again." }, 502);

    const deck = JSON.parse(raw);
    if (!Array.isArray(deck.slides) || deck.slides.length !== count) {
      return json({ error: "The AI response did not contain the requested number of slides. Please try again." }, 502);
    }

    const slides = deck.slides.map((slide: Record<string, unknown>, index: number) => ({
      heading: String(slide.heading ?? `Slide ${index + 1}`).slice(0, 180),
      body: String(slide.body ?? "").slice(0, 3000),
      layout: index === 0 ? "title" : index === count - 1 ? "closing" : "content",
    }));

    return json({
      title: String(deck.title ?? prompt.slice(0, 70)).slice(0, 100),
      slides,
    });
  } catch (error) {
    console.error("SlidePilot generation error:", error);
    return json({ error: "Could not generate the presentation. Check the AI service configuration and try again." }, 500);
  }
});
