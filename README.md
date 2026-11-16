# SlidePilot AI

Responsive presentation workspace with Supabase authentication, an owner-only presentation library, slide editing, PowerPoint export and browser print-to-PDF.

## Supabase setup

1. Use the existing Garage Operations Supabase project.
2. Run `supabase.sql` in SQL Editor. SlidePilot uses only its own `sp_` table and RLS policies; it does not read or write Garage Operations business tables.
3. Enable Email authentication.
4. Add the published GitHub Pages URL to Supabase Authentication → URL Configuration → Redirect URLs.
5. Keep only the Supabase project URL and publishable key in `config.js`. Never put a service-role key or AI provider key in browser code.

## Enable real AI generation

The secure Edge Function source is in `supabase/functions/generate-presentation/index.ts`.

1. In Supabase, open Edge Functions and create a function named `generate-presentation`.
2. Open the function source file in this repository and copy its complete contents into the Supabase function editor.
3. Deploy the function. Keep JWT verification enabled.
4. In Supabase Edge Function Secrets, add `OPENAI_API_KEY` with your own OpenAI API key. Never paste this key into GitHub, `config.js`, or this chat.
5. Return to SlidePilot and sign in. AI generation should now call the secure function.

An OpenAI API account and API billing are separate from ChatGPT subscriptions. If the secret is missing or the provider rejects the request, the app will report the error and can still create a clearly labelled structured draft.

## Current feature status

Working in the current browser app: email sign-up/sign-in, owner-scoped presentation storage, prompt-to-structured-draft fallback, slide text editing, add/delete slide, slide navigation, PPTX export, and browser print-to-PDF.

Not yet implemented as live integrations: PDF/DOCX extraction, meeting transcription, AI image generation, collaboration, translation, subscription billing and admin management. Do not advertise these as available until built and tested.
