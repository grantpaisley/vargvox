# VargVox — Design Document

**Date:** 2026-07-08
**Status:** Validated with project owner

## Purpose

Community-designed audible mode feedback for the Stark Varg electric dirt bike.

The Varg gives no audible confirmation when the rider changes ride modes. Riders
have believed they were in reverse, opened the throttle, and discovered they were
in an 80 hp forward mode — the bike launches out from under them. Distinct,
information-carrying sounds for each mode state are a genuine safety feature.

The project's output is a community-voted **sound grammar spec** (not audio
files): a JSON format that generates a sound from any mode's actual settings,
plus the winning community scheme, sent to Stark for implementation.

## The bike's controls (ground truth)

Handlebar pod: two large machined buttons (up, down) and a red power button.

- **Single click up/down** — cycle through the 5 ride modes.
- **Click-and-hold down** — enter reverse.
- **Tap up** (while in reverse) — return to the current mode.
- **Click-and-hold up** — enter crawl.

Each of the 5 modes is rider-configurable in the Stark app:
**HP 0–80, regen 0–100 %, traction control 0–100 %.**
Because mode slots differ per rider, sounds must be *generated from the values*,
not hand-assigned to slot numbers.

## Key decisions (validated)

| Decision | Choice |
|---|---|
| Sound creation | Synthesized (Web Audio API), simple controls + natural-language AI editing |
| Sound model | **Generative grammar**: rules turn any HP/regen/TC values into sound; reverse & crawl are fixed hand-designed signals |
| Centerpiece UX | Virtual switchgear simulator with the real button behaviors |
| Community | Gallery + upvotes + remix with attribution |
| AI interface | In-app chat (Claude API); MCP deferred |
| Stack | Next.js + Supabase + Vercel; open-source repo |
| Self-hosting | Anyone can run the app locally with their own AI key and publish schemes to the central site via token-authenticated API |

## Architecture — one codebase, two ways to run

1. **Hosted site** — Next.js on Vercel, Supabase (auth, Postgres). Home of the
   gallery, voting, remixing, and a full editor for casual visitors.
2. **Local mode** — same repo, open source. `git clone`, set
   `ANTHROPIC_API_KEY` in `.env`, `npm run dev`. Full editor + simulator + AI
   chat, no account needed. **Publish** POSTs the scheme JSON to the central
   site's public API using a personal token from a free account there.

A scheme is pure data (a few KB of JSON); all audio is synthesized in the
browser with the Web Audio API. No audio files are stored or served anywhere,
so local and hosted modes stay perfectly compatible. Any scheme can be
downloaded as JSON and imported into any copy of the app as a basis for
modification.

## The sound engine — what a "scheme" is

A scheme is a JSON document with two parts.

### 1. Encoding rules (the generative grammar)

Each parameter gets a *voice* configured with simple controls:

- **HP voice** — e.g. tone sweep whose end pitch scales with 0–80 hp.
  Controls: waveform (sine/square/saw), base pitch, pitch range, duration,
  sweep shape. 80 hp screams high; 20 hp stays low and mellow.
- **Regen voice** — e.g. falling tone or N descending pulses scaled to 0–100 %.
- **TC voice** — e.g. click/tick pattern; tick count or rate encodes 0–100 %.
- **Ordering & timing** — voices play in sequence (HP → regen → TC) or
  layered, with user-set gaps. Target total length ~1–2 s so it's usable
  mid-ride.

### 2. Fixed signals (hand-designed one-offs)

- **Reverse** — deliberately unmissable and *repeating* while engaged (truck
  backup-beeper pattern). The safety centerpiece.
- **Crawl** — distinct, gentle; looping or single, user's choice.
- Optional mode-number chirps (mode 3 = three chirps) layered before the
  parameter voices.
- Optional power-on sound (red button).

Playback is Web Audio oscillators and envelopes. Simple sliders/dropdowns per
voice on top; readable JSON underneath for the AI and power users. App-side
hard limits on volume, pitch, and duration are enforced regardless of what the
UI or AI writes.

## The editor / simulator (one screen, three zones)

- **Left — the switchgear.** Visual replica of the real pod. Behaves exactly
  like the bike (click, hold-down = reverse, tap-up = back, hold-up = crawl;
  red button powers the virtual bike). A small display shows current state
  (mode number, R, CRAWL).
- **Center — mode configuration.** Five mode slots with HP/regen/TC sliders
  (defaults near typical Varg setups). This proves the grammar works: set
  mode 2 to 30 hp and mode 5 to 80 hp and check you can tell them apart with
  your eyes closed.
- **Right — voice controls + AI chat.** Tabs for HP voice, regen voice, TC
  voice, reverse, crawl; chat panel below.

## The gallery (gallery *is* the simulator)

One page: the switchgear on the left with a **Play All** button beneath it
(runs modes 1→5, crawl, reverse in sequence). On the right, a list of
published sound-set names with author and vote count, sorted **Top** or
**Newest**. Clicking a name loads that scheme into the pod.

- **Vote** — one upvote per user per scheme (login required, toggleable).
- **Remix** — copies the loaded scheme into your editor; published remixes
  show "remixed from *X* by *Y*".
- **Download JSON** on every scheme; **Import JSON** in every editor.
- **Names** — AI suggests a name at publish time (user may override). Every
  name passes an AI rudeness/moderation check before going public.
- No comments at launch (YAGNI; revisit if the community asks).
- **Endgame export** — any scheme can be exported as the JSON spec plus a
  human-readable grammar description, ready to send to Stark.

## The AI layer

One chat panel, three jobs, all operating on the scheme JSON:

1. **Modify** — "make reverse more urgent, like a truck backing up" → AI
   rewrites the relevant JSON, editor hot-reloads, change is undoable.
2. **Create** — "a scheme that sounds like a sci-fi movie" → full starting
   scheme.
3. **Name** — suggests the set name at publish time (+ moderation check).

**API keys:** local mode uses the self-hoster's own key. The hosted site gives
logged-in users a modest rate-limited free allowance (e.g. 20 edits/day) on
the site's key; users may instead paste their own key, stored only in browser
localStorage, never in the database.

**Reliability:** the system prompt carries the scheme JSON schema (field
meanings and legal ranges) plus the current scheme; the model returns a
structured patch that is validated against the schema before applying. Hard
audio limits are enforced app-side regardless.

MCP endpoint deferred — trivial wrapper over the same internal API if demand
appears.

## Data model & public API

Supabase/Postgres:

- `users` — Supabase auth (Google + email magic link); display name.
- `schemes` — id, owner, name, JSON blob, `remixed_from` (nullable),
  created_at, published flag.
- `votes` — unique (user_id, scheme_id).
- `api_tokens` — personal tokens for local-mode publishing, revocable from
  the account page.

Public API surface:

- `POST /api/schemes` (token auth) — publish; runs name moderation; returns
  gallery URL.
- `GET /api/schemes/:id` — download JSON.
- `GET /api/schemes` — list.

## Build phases (each ends usable)

1. **The instrument** — sound engine + editor + simulator with real switchgear
   behaviors. No login; schemes in localStorage + JSON import/export. Already
   shareable as files.
2. **The community** — Supabase auth, publish, gallery-as-simulator, voting,
   remixing, personal API tokens.
3. **The AI** — chat panel (modify/create/name), BYO-key option, moderation,
   rate limits.
4. **The pitch** — export pack for Stark, polish, open-source README for
   self-hosters.

Phase 1 first because it carries the real risk and the real fun: proving that
HP/regen/TC can genuinely be *heard*. Everything after is conventional web
work.
