// The scheme is the core data model of VargVox: a small JSON document that
// describes how to *generate* a sound from any mode's HP/regen/TC values,
// plus hand-designed fixed signals for reverse, crawl and power-on.

export type Waveform = "sine" | "square" | "sawtooth" | "triangle";

export interface HpVoice {
  enabled: boolean;
  waveform: Waveform;
  basePitchHz: number; // pitch at 0 hp
  maxPitchHz: number; // pitch at 80 hp
  durationMs: number;
  sweep: "rise" | "flat"; // rise = glide from base up to the hp pitch
  volume: number; // 0..1
}

export interface RegenVoice {
  enabled: boolean;
  style: "pulses" | "fall";
  waveform: Waveform;
  pitchHz: number; // pulse pitch, or start pitch of the fall
  maxPulses: number; // pulse count at 100%
  pulseMs: number;
  gapMs: number;
  fallDurationMs: number; // for "fall": length of the descending tone
  volume: number;
}

export interface TcVoice {
  enabled: boolean;
  pitchHz: number;
  maxTicks: number; // tick count at 100%
  tickMs: number;
  gapMs: number;
  volume: number;
}

// Per-segment override on top of the signal's even defaults. Indexed by the
// segment's position in signalSegments() — beeps and gaps interleaved.
export interface SegmentTweak {
  durMs?: number;
  startHz?: number; // beeps only
  endHz?: number; // beeps only
}

export interface FixedSignal {
  enabled: boolean;
  waveform: Waveform;
  pitchHz: number;
  pitch2Hz: number; // 0 = single pitch; otherwise beeps alternate pitch/pitch2
  sweepHz: number; // 0 = off; otherwise every beep glides from pitchHz to this
  beeps: number;
  pattern: string; // rhythm like ".. . .." — overrides beeps when it has any "."
  beepMs: number;
  gapMs: number;
  groupGapMs: number; // silence for each space in the pattern
  tweaks: (SegmentTweak | null)[]; // sparse; cleared when the rhythm changes
  loop: boolean;
  loopIntervalMs: number; // silence between repeats while engaged
  volume: number;
}

// The rendered timeline of one burst: beeps and the gaps between them, with
// the even defaults from the signal and any per-segment tweaks applied.
// Single source of truth for both the audio engine and the segment editor.
export interface SignalSegment {
  kind: "beep" | "gap";
  durMs: number;
  startHz: number; // gaps ignore the pitches
  endHz: number;
}

export function signalSegments(sig: FixedSignal): SignalSegment[] {
  const pattern = sig.pattern.includes(".") ? sig.pattern : ".".repeat(sig.beeps);
  const segments: SignalSegment[] = [];
  let pendingGap = 0;
  let beepIndex = 0;
  for (const ch of pattern) {
    if (ch !== ".") {
      pendingGap += sig.groupGapMs;
      continue;
    }
    if (beepIndex > 0) {
      segments.push({ kind: "gap", durMs: sig.gapMs + pendingGap, startHz: 0, endHz: 0 });
    }
    pendingGap = 0;
    const base = sig.pitch2Hz > 0 && beepIndex % 2 === 1 ? sig.pitch2Hz : sig.pitchHz;
    segments.push({
      kind: "beep",
      durMs: sig.beepMs,
      startHz: base,
      endHz: sig.sweepHz > 0 ? sig.sweepHz : base,
    });
    beepIndex++;
  }
  return segments.map((seg, i) => {
    const t = sig.tweaks[i];
    if (!t) return seg;
    return {
      ...seg,
      durMs: t.durMs ?? seg.durMs,
      startHz: seg.kind === "beep" ? (t.startHz ?? seg.startHz) : seg.startHz,
      endHz: seg.kind === "beep" ? (t.endHz ?? seg.endHz) : seg.endHz,
    };
  });
}

export interface ModeChirps {
  enabled: boolean;
  pitchHz: number;
  chirpMs: number;
  gapMs: number;
  volume: number;
}

export type PowerOnSignal = FixedSignal;

export type VoiceOrder = "hp" | "regen" | "tc";

export interface Scheme {
  version: 1;
  name: string;
  modeChirps: ModeChirps; // mode 3 = three chirps, played before the voices
  sequence: { order: VoiceOrder[]; gapMs: number; layered: boolean };
  hp: HpVoice;
  regen: RegenVoice;
  tc: TcVoice;
  reverse: FixedSignal;
  crawl: FixedSignal;
  horn: FixedSignal; // rider-triggered; loops while the horn button is held
  powerOn: PowerOnSignal;
}

// A rider's configuration of one mode slot (as set in the Stark app).
export interface ModeSettings {
  hp: number; // 0..80
  regen: number; // 0..100 %
  tc: number; // 0..100 %
}

export const HP_MAX = 80;

// Hard safety limits, enforced on every scheme regardless of where it came
// from (UI, imported JSON, or — later — AI edits).
export const LIMITS = {
  pitchHz: { min: 60, max: 4200 },
  durationMs: { min: 10, max: 2000 },
  gapMs: { min: 0, max: 1000 },
  volume: { min: 0, max: 1 },
  pulses: { min: 1, max: 8 },
  ticks: { min: 1, max: 10 },
  beeps: { min: 1, max: 6 },
};

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

const WAVEFORMS: Waveform[] = ["sine", "square", "sawtooth", "triangle"];
const wave = (w: unknown): Waveform =>
  WAVEFORMS.includes(w as Waveform) ? (w as Waveform) : "sine";

export function defaultScheme(): Scheme {
  return {
    version: 1,
    name: "Untitled scheme",
    modeChirps: { enabled: true, pitchHz: 1800, chirpMs: 35, gapMs: 70, volume: 0.5 },
    sequence: { order: ["hp", "regen", "tc"], gapMs: 130, layered: false },
    hp: {
      enabled: true,
      waveform: "sawtooth",
      basePitchHz: 220,
      maxPitchHz: 1500,
      durationMs: 380,
      sweep: "rise",
      volume: 0.65,
    },
    regen: {
      enabled: true,
      style: "pulses",
      waveform: "square",
      pitchHz: 210,
      maxPulses: 4,
      pulseMs: 70,
      gapMs: 60,
      fallDurationMs: 350,
      volume: 0.55,
    },
    tc: {
      enabled: true,
      pitchHz: 2600,
      maxTicks: 5,
      tickMs: 18,
      gapMs: 70,
      volume: 0.5,
    },
    reverse: {
      enabled: true,
      waveform: "square",
      pitchHz: 950,
      pitch2Hz: 0,
      sweepHz: 0,
      beeps: 1,
      pattern: "",
      beepMs: 300,
      gapMs: 0,
      groupGapMs: 200,
      tweaks: [],
      loop: true,
      loopIntervalMs: 300,
      volume: 0.7,
    },
    crawl: {
      enabled: true,
      waveform: "sine",
      pitchHz: 500,
      pitch2Hz: 650,
      sweepHz: 0,
      beeps: 2,
      pattern: "",
      beepMs: 120,
      gapMs: 80,
      groupGapMs: 200,
      tweaks: [],
      loop: true,
      loopIntervalMs: 700,
      volume: 0.45,
    },
    // Beluga-ish: quick squeaky chirps, each sweeping up like whale song.
    horn: {
      enabled: true,
      waveform: "sine",
      pitchHz: 480,
      pitch2Hz: 0,
      sweepHz: 1600,
      beeps: 3,
      pattern: "",
      beepMs: 160,
      gapMs: 50,
      groupGapMs: 200,
      tweaks: [],
      loop: true,
      loopIntervalMs: 120,
      volume: 0.7,
    },
    powerOn: {
      enabled: true,
      waveform: "sine",
      pitchHz: 620,
      pitch2Hz: 930,
      sweepHz: 0,
      beeps: 2,
      pattern: "",
      beepMs: 110,
      gapMs: 40,
      groupGapMs: 200,
      tweaks: [],
      loop: false,
      loopIntervalMs: 0,
      volume: 0.5,
    },
  };
}

export function defaultModes(): ModeSettings[] {
  return [
    { hp: 15, regen: 70, tc: 90 },
    { hp: 30, regen: 60, tc: 70 },
    { hp: 45, regen: 50, tc: 50 },
    { hp: 60, regen: 40, tc: 30 },
    { hp: 80, regen: 30, tc: 10 },
  ];
}

function sanitizeTweak(raw: unknown): SegmentTweak | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  const out: SegmentTweak = {};
  if (typeof t.durMs === "number") out.durMs = clamp(t.durMs, 0, 2000);
  if (typeof t.startHz === "number")
    out.startHz = clamp(t.startHz, LIMITS.pitchHz.min, LIMITS.pitchHz.max);
  if (typeof t.endHz === "number")
    out.endHz = clamp(t.endHz, LIMITS.pitchHz.min, LIMITS.pitchHz.max);
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeFixedSignal(raw: unknown, fallback: FixedSignal): FixedSignal {
  const s = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown, fb: number) => (typeof v === "number" ? v : fb);
  return {
    enabled: typeof s.enabled === "boolean" ? s.enabled : fallback.enabled,
    waveform: wave(s.waveform ?? fallback.waveform),
    pitchHz: clamp(n(s.pitchHz, fallback.pitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
    pitch2Hz:
      n(s.pitch2Hz, fallback.pitch2Hz) === 0
        ? 0
        : clamp(n(s.pitch2Hz, fallback.pitch2Hz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
    sweepHz:
      n(s.sweepHz, fallback.sweepHz) === 0
        ? 0
        : clamp(n(s.sweepHz, fallback.sweepHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
    beeps: Math.round(clamp(n(s.beeps, fallback.beeps), LIMITS.beeps.min, LIMITS.beeps.max)),
    pattern:
      typeof s.pattern === "string"
        ? s.pattern.replace(/[^. ]/g, "").slice(0, 16)
        : fallback.pattern,
    beepMs: clamp(n(s.beepMs, fallback.beepMs), LIMITS.durationMs.min, LIMITS.durationMs.max),
    gapMs: clamp(n(s.gapMs, fallback.gapMs), LIMITS.gapMs.min, LIMITS.gapMs.max),
    groupGapMs: clamp(n(s.groupGapMs, fallback.groupGapMs), 0, 2000),
    tweaks: Array.isArray(s.tweaks) ? s.tweaks.slice(0, 32).map(sanitizeTweak) : [],
    loop: typeof s.loop === "boolean" ? s.loop : fallback.loop,
    loopIntervalMs: clamp(n(s.loopIntervalMs, fallback.loopIntervalMs), 0, 2000),
    volume: clamp(n(s.volume, fallback.volume), LIMITS.volume.min, LIMITS.volume.max),
  };
}

// Coerce arbitrary parsed JSON into a valid Scheme, clamping every value to
// the hard limits. Throws only if the input isn't an object at all.
export function sanitizeScheme(raw: unknown): Scheme {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Not a valid scheme: expected a JSON object");
  }
  const r = raw as Record<string, unknown>;
  const d = defaultScheme();
  const n = (v: unknown, fb: number) => (typeof v === "number" ? v : fb);

  const hp = (r.hp ?? {}) as Record<string, unknown>;
  const regen = (r.regen ?? {}) as Record<string, unknown>;
  const tc = (r.tc ?? {}) as Record<string, unknown>;
  const chirps = (r.modeChirps ?? {}) as Record<string, unknown>;
  const seq = (r.sequence ?? {}) as Record<string, unknown>;

  const orderRaw = Array.isArray(seq.order) ? seq.order : d.sequence.order;
  const order = orderRaw.filter((v): v is VoiceOrder =>
    ["hp", "regen", "tc"].includes(v as string)
  );
  for (const v of d.sequence.order) if (!order.includes(v)) order.push(v);

  return {
    version: 1,
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 60) : d.name,
    modeChirps: {
      enabled: typeof chirps.enabled === "boolean" ? chirps.enabled : d.modeChirps.enabled,
      pitchHz: clamp(n(chirps.pitchHz, d.modeChirps.pitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
      chirpMs: clamp(n(chirps.chirpMs, d.modeChirps.chirpMs), LIMITS.durationMs.min, 200),
      gapMs: clamp(n(chirps.gapMs, d.modeChirps.gapMs), LIMITS.gapMs.min, LIMITS.gapMs.max),
      volume: clamp(n(chirps.volume, d.modeChirps.volume), 0, 1),
    },
    sequence: {
      order,
      gapMs: clamp(n(seq.gapMs, d.sequence.gapMs), LIMITS.gapMs.min, LIMITS.gapMs.max),
      layered: typeof seq.layered === "boolean" ? seq.layered : d.sequence.layered,
    },
    hp: {
      enabled: typeof hp.enabled === "boolean" ? hp.enabled : d.hp.enabled,
      waveform: wave(hp.waveform ?? d.hp.waveform),
      basePitchHz: clamp(n(hp.basePitchHz, d.hp.basePitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
      maxPitchHz: clamp(n(hp.maxPitchHz, d.hp.maxPitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
      durationMs: clamp(n(hp.durationMs, d.hp.durationMs), LIMITS.durationMs.min, LIMITS.durationMs.max),
      sweep: hp.sweep === "flat" ? "flat" : "rise",
      volume: clamp(n(hp.volume, d.hp.volume), 0, 1),
    },
    regen: {
      enabled: typeof regen.enabled === "boolean" ? regen.enabled : d.regen.enabled,
      style: regen.style === "fall" ? "fall" : "pulses",
      waveform: wave(regen.waveform ?? d.regen.waveform),
      pitchHz: clamp(n(regen.pitchHz, d.regen.pitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
      maxPulses: Math.round(clamp(n(regen.maxPulses, d.regen.maxPulses), LIMITS.pulses.min, LIMITS.pulses.max)),
      pulseMs: clamp(n(regen.pulseMs, d.regen.pulseMs), LIMITS.durationMs.min, 500),
      gapMs: clamp(n(regen.gapMs, d.regen.gapMs), LIMITS.gapMs.min, LIMITS.gapMs.max),
      fallDurationMs: clamp(n(regen.fallDurationMs, d.regen.fallDurationMs), LIMITS.durationMs.min, LIMITS.durationMs.max),
      volume: clamp(n(regen.volume, d.regen.volume), 0, 1),
    },
    tc: {
      enabled: typeof tc.enabled === "boolean" ? tc.enabled : d.tc.enabled,
      pitchHz: clamp(n(tc.pitchHz, d.tc.pitchHz), LIMITS.pitchHz.min, LIMITS.pitchHz.max),
      maxTicks: Math.round(clamp(n(tc.maxTicks, d.tc.maxTicks), LIMITS.ticks.min, LIMITS.ticks.max)),
      tickMs: clamp(n(tc.tickMs, d.tc.tickMs), 5, 100),
      gapMs: clamp(n(tc.gapMs, d.tc.gapMs), LIMITS.gapMs.min, LIMITS.gapMs.max),
      volume: clamp(n(tc.volume, d.tc.volume), 0, 1),
    },
    reverse: { ...sanitizeFixedSignal(r.reverse, d.reverse), loop: true },
    crawl: sanitizeFixedSignal(r.crawl, d.crawl),
    horn: { ...sanitizeFixedSignal(r.horn, d.horn), loop: true },
    powerOn: { ...sanitizeFixedSignal(r.powerOn, d.powerOn), loop: false },
  };
}

export function sanitizeModes(raw: unknown): ModeSettings[] {
  const d = defaultModes();
  if (!Array.isArray(raw)) return d;
  return d.map((fb, i) => {
    const m = (raw[i] ?? {}) as Record<string, unknown>;
    const n = (v: unknown, f: number) => (typeof v === "number" ? v : f);
    return {
      hp: Math.round(clamp(n(m.hp, fb.hp), 0, HP_MAX)),
      regen: Math.round(clamp(n(m.regen, fb.regen), 0, 100)),
      tc: Math.round(clamp(n(m.tc, fb.tc), 0, 100)),
    };
  });
}
