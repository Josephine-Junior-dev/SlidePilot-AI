# SlidePilot AI

Responsive presentation workspace with Supabase authentication, owner-only presentation library, slide editing, PowerPoint export and browser print-to-PDF.

## Setup
1. Run supabase.sql in the existing Supabase SQL Editor. SlidePilot uses its own sp_ table and RLS; no Garage Operations data tables are used.
2. Enable Email authentication and configure allowed redirect URLs.
3. Publish main branch from root using GitHub Pages (Settings → Pages).
4. Keep only the public Supabase URL and publishable key in config.js. Never put provider secrets in frontend code.

## AI and files
Without a configured Edge Function, the app creates a structured starter deck, not AI-generated content. Deploy the function in supabase/functions/generate-presentation and set OPENAI_API_KEY as a server-side secret to enable true AI generation. PDF/DOCX extraction, meeting transcription, image generation, collaboration, translations and subscription billing are not yet live integrations; do not represent them as active.
