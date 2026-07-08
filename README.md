# VargVox

Community-designed **audible ride-mode feedback** for the Stark Varg electric dirt bike.

The Varg gives no sound when you change modes. Riders have believed they were in
reverse, opened the throttle, and discovered they were in an 80 hp forward mode.
VargVox lets the community design, hear, share and vote on mode sounds — with the
goal of sending the winning scheme to Stark as an implementable spec.

## How it works

A **scheme** is a small JSON document describing a *generative sound grammar*:

- **HP voice** — a tone whose pitch scales with horsepower (0–80 hp)
- **Regen voice** — pulses or a falling tone scaled to regen % (0–100)
- **TC voice** — a tick pattern scaled to traction control % (0–100)
- **Reverse** — a fixed, repeating, unmissable signal (the safety centerpiece)
- **Crawl** — a distinct, gentler fixed signal
- Optional mode-number chirps and power-on sound

Because sounds are generated from your mode *values*, the scheme works no matter
how you've configured your five mode slots in the Stark app.

The on-screen switchgear behaves like the real pod: tap ▲/▼ to move through
modes 1–5, **hold ▼ for reverse**, **hold ▲ for crawl**, tap to return to your
mode. All audio is synthesized live in the browser (Web Audio API) — no samples.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Your work auto-saves in the browser; use
**Save** for a local library and **Export/Import** to share schemes as
`.vargvox.json` files.

## Roadmap

1. ✅ **The instrument** — sound engine, editor, switchgear simulator, local save + JSON import/export
2. **The community** — accounts, publishing, gallery-as-simulator, voting, remixing
3. **The AI** — edit sounds in plain English ("make reverse sound like a truck backing up")
4. **The pitch** — export pack for Stark

Full design: [docs/plans/2026-07-08-vargvox-design.md](docs/plans/2026-07-08-vargvox-design.md)
