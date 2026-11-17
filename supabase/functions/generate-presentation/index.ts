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
{"title":"short presentation title","slides":[{"heading":"slide heading","body":"short supporting context","layout":"title|content|stats|comparison|roadmap|closing","bullets":["point one","point two"],"metrics":[{"value":"12%","label":"Metric","note":"Clearly marked estimate"}],"columns":[{"label":"OPTION A","title":"Heading","body":"Explanation"},{"label":"OPTION B","title":"Heading","body":"Explanation"}],"steps":[{"title":"Milestone","description":"What happens"}]}]}
Create exactly ${count} slides. Slide 1 is a strong title slide. The final slide is a conclusion or call to action.
Use specific, practical content rather than generic filler. Do not invent statistics, sources, customer names, or facts. If evidence is missing, label assumptions clearly and suggest what should be validated.
Use varied layouts intentionally: title for slide 1; content for key ideas; stats for metric dashboards (only use supplied or explicitly labelled illustrative values, never invent measured facts); comparison for two-sided choices; roadmap for chronological milestones; closing for the final slide. Provide 3-6 concise bullets for content slides, 2 columns for comparison, 3-5 steps for roadmaps, and up to 4 metrics for dashboards. Return optional bullets, metrics, columns, and steps arrays when suitable. Never force a chart or metric slide when the brief has no data. Avoid markdown fences.
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
      layout: index === 0 ? "title" : index === count - 1 ? "closing" : ["content", "stats", "comparison", "roadmap"].includes(String(slide.layout)) ? String(slide.layout) : "content",
      bullets: Array.isArray(slide.bullets) ? slide.bullets.slice(0, 8).map((x) => String(x).slice(0, 240)) : [],
      metrics: Array.isArray(slide.metrics) ? slide.metrics.slice(0, 4).map((m) => ({ value: String((m as Record<string, unknown>).value ?? ""), label: String((m as Record<string, unknown>).label ?? ""), note: String((m as Record<string, unknown>).note ?? "") })) : [],
      columns: Array.isArray(slide.columns) ? slide.columns.slice(0, 2).map((c) => ({ label: String((c as Record<string, unknown>).label ?? ""), title: String((c as Record<string, unknown>).title ?? ""), body: String((c as Record<string, unknown>).body ?? "") })) : [],
      steps: Array.isArray(slide.steps) ? slide.steps.slice(0, 6).map((st) => ({ title: String((st as Record<string, unknown>).title ?? ""), description: String((st as Record<string, unknown>).description ?? "") })) : [],
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
