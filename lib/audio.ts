// Web Audio synthesis engine. Everything is generated from the scheme JSON —
// no samples. All output runs through a master gain + compressor so nothing
// can clip or blast the listener regardless of scheme values.

import type { FixedSignal, ModeSettings, Scheme } from "./scheme";
import { HP_MAX, signalSegments } from "./scheme";

const MASTER_GAIN = 0.6;
const ATTACK_S = 0.005;
const RELEASE_S = 0.02;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

interface Active {
  sources: Set<OscillatorNode>;
  timers: Set<ReturnType<typeof setTimeout>>;
}
const active: Active = { sources: new Set(), timers: new Set() };

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 8;
    master = ctx.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function stopAll(): void {
  for (const t of active.timers) clearTimeout(t);
  active.timers.clear();
  for (const s of active.sources) {
    try {
      s.stop();
    } catch {
      // already stopped
    }
  }
  active.sources.clear();
}

interface Tone {
  atMs: number; // start offset from "now"
  durMs: number;
  freqHz: number;
  sweepToHz?: number; // glide from freqHz to this over the duration
  waveform: OscillatorType;
  volume: number; // 0..1, pre-master
}

function scheduleTone(t: Tone): void {
  const ac = ensureContext();
  const start = ac.currentTime + t.atMs / 1000;
  const dur = Math.max(0.01, t.durMs / 1000);

  const osc = ac.createOscillator();
  osc.type = t.waveform;
  osc.frequency.setValueAtTime(t.freqHz, start);
  if (t.sweepToHz && t.sweepToHz !== t.freqHz) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, t.sweepToHz), start + dur);
  }

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(t.volume, start + ATTACK_S);
  gain.gain.setValueAtTime(t.volume, start + Math.max(ATTACK_S, dur - RELEASE_S));
  gain.gain.linearRampToValueAtTime(0, start + dur);

  osc.connect(gain);
  gain.connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.01);
  active.sources.add(osc);
  osc.onended = () => active.sources.delete(osc);
}

// ---------------------------------------------------------------------------
// Mode sound: chirps (mode number) + the three parameter voices.
// Returns total duration in ms so callers can sequence (e.g. Play All).
// ---------------------------------------------------------------------------

export function playModeSound(
  scheme: Scheme,
  mode: ModeSettings,
  modeNumber: number
): number {
  ensureContext();
  let cursor = 0;

  if (scheme.modeChirps.enabled) {
    const c = scheme.modeChirps;
    for (let i = 0; i < modeNumber; i++) {
      scheduleTone({
        atMs: cursor,
        durMs: c.chirpMs,
        freqHz: c.pitchHz,
        waveform: "square",
        volume: c.volume,
      });
      cursor += c.chirpMs + c.gapMs;
    }
    cursor += scheme.sequence.gapMs;
  }

  const voiceStart = cursor;
  let maxEnd = cursor;

  for (const voice of scheme.sequence.order) {
    const at = scheme.sequence.layered ? voiceStart : cursor;
    let len = 0;
    if (voice === "hp" && scheme.hp.enabled) len = scheduleHp(scheme, mode.hp, at);
    if (voice === "regen" && scheme.regen.enabled) len = scheduleRegen(scheme, mode.regen, at);
    if (voice === "tc" && scheme.tc.enabled) len = scheduleTc(scheme, mode.tc, at);
    if (len > 0) {
      cursor = at + len + scheme.sequence.gapMs;
      maxEnd = Math.max(maxEnd, at + len);
    }
  }

  return scheme.sequence.layered ? maxEnd : Math.max(cursor - scheme.sequence.gapMs, 0);
}

// Play a single parameter voice in isolation — used by the editor so that
// tweaking e.g. the HP tab auditions only the HP part of the sound.
// Returns the duration in ms.
export function playVoice(
  scheme: Scheme,
  voice: "hp" | "regen" | "tc",
  mode: ModeSettings
): number {
  ensureContext();
  if (voice === "hp" && scheme.hp.enabled) return scheduleHp(scheme, mode.hp, 0);
  if (voice === "regen" && scheme.regen.enabled) return scheduleRegen(scheme, mode.regen, 0);
  if (voice === "tc" && scheme.tc.enabled) return scheduleTc(scheme, mode.tc, 0);
  return 0;
}

// Play one voice at several parameter values back-to-back (e.g. HP at
// 0/40/80) so the ear can compare how the encoding scales across the range.
// A value that renders silent (e.g. 0% regen) still occupies its slot in the
// sequence, so the silence itself is audible as information.
export function playVoiceSequence(
  scheme: Scheme,
  voice: "hp" | "regen" | "tc",
  values: number[],
  gapMs = 280
): number {
  ensureContext();
  let cursor = 0;
  for (const value of values) {
    let len = 0;
    if (voice === "hp" && scheme.hp.enabled) len = scheduleHp(scheme, value, cursor);
    if (voice === "regen" && scheme.regen.enabled) len = scheduleRegen(scheme, value, cursor);
    if (voice === "tc" && scheme.tc.enabled) len = scheduleTc(scheme, value, cursor);
    cursor += Math.max(len, 120) + gapMs;
  }
  return Math.max(cursor - gapMs, 0);
}

// Play just the mode-number chirps in isolation. Returns the duration in ms.
export function playChirps(scheme: Scheme, modeNumber: number): number {
  ensureContext();
  if (!scheme.modeChirps.enabled) return 0;
  const c = scheme.modeChirps;
  for (let i = 0; i < modeNumber; i++) {
    scheduleTone({
      atMs: i * (c.chirpMs + c.gapMs),
      durMs: c.chirpMs,
      freqHz: c.pitchHz,
      waveform: "square",
      volume: c.volume,
    });
  }
  return modeNumber * (c.chirpMs + c.gapMs) - c.gapMs;
}

function scheduleHp(scheme: Scheme, hp: number, atMs: number): number {
  const v = scheme.hp;
  const target = v.basePitchHz + (v.maxPitchHz - v.basePitchHz) * (hp / HP_MAX);
  scheduleTone({
    atMs,
    durMs: v.durationMs,
    freqHz: v.sweep === "rise" ? v.basePitchHz : target,
    sweepToHz: v.sweep === "rise" ? target : undefined,
    waveform: v.waveform,
    volume: v.volume,
  });
  return v.durationMs;
}

function scheduleRegen(scheme: Scheme, regenPct: number, atMs: number): number {
  const v = scheme.regen;
  if (regenPct <= 0) return 0; // 0% regen = silence, itself informative
  if (v.style === "fall") {
    // Falling tone: depth of the fall scales with regen %.
    const endHz = Math.max(60, v.pitchHz * (1 - 0.7 * (regenPct / 100)));
    scheduleTone({
      atMs,
      durMs: v.fallDurationMs,
      freqHz: v.pitchHz,
      sweepToHz: endHz,
      waveform: v.waveform,
      volume: v.volume,
    });
    return v.fallDurationMs;
  }
  const count = Math.max(1, Math.round(v.maxPulses * (regenPct / 100)));
  for (let i = 0; i < count; i++) {
    scheduleTone({
      atMs: atMs + i * (v.pulseMs + v.gapMs),
      durMs: v.pulseMs,
      freqHz: v.pitchHz,
      waveform: v.waveform,
      volume: v.volume,
    });
  }
  return count * (v.pulseMs + v.gapMs) - v.gapMs;
}

function scheduleTc(scheme: Scheme, tcPct: number, atMs: number): number {
  const v = scheme.tc;
  if (tcPct <= 0) return 0;
  const count = Math.max(1, Math.round(v.maxTicks * (tcPct / 100)));
  for (let i = 0; i < count; i++) {
    scheduleTone({
      atMs: atMs + i * (v.tickMs + v.gapMs),
      durMs: v.tickMs,
      freqHz: v.pitchHz,
      waveform: "square",
      volume: v.volume,
    });
  }
  return count * (v.tickMs + v.gapMs) - v.gapMs;
}

// ---------------------------------------------------------------------------
// Fixed signals (reverse / crawl / power-on). Looping signals return a stop
// handle; the loop is driven by a setTimeout chain so it stops instantly.
// ---------------------------------------------------------------------------

function scheduleSignalOnce(sig: FixedSignal, atMs: number): number {
  // signalSegments resolves the rhythm pattern, even defaults and any
  // per-segment tweaks into one beep/gap timeline.
  let cursor = atMs;
  let end = atMs;
  for (const seg of signalSegments(sig)) {
    if (seg.kind === "gap") {
      cursor += seg.durMs;
      continue;
    }
    scheduleTone({
      atMs: cursor,
      durMs: seg.durMs,
      freqHz: seg.startHz,
      sweepToHz: seg.endHz !== seg.startHz ? seg.endHz : undefined,
      waveform: sig.waveform,
      volume: sig.volume,
    });
    end = cursor + seg.durMs;
    cursor = end;
  }
  return end - atMs;
}

export interface LoopHandle {
  stop: () => void;
}

// Editor preview of a fixed signal: looping signals play a couple of repeats
// so the pause between them is audible; one-shots play once. Returns the
// total duration in ms.
export function playSignalPreview(sig: FixedSignal, repeats = 2): number {
  if (!sig.enabled) return 0;
  ensureContext();
  const times = sig.loop ? repeats : 1;
  let cursor = 0;
  let end = 0;
  for (let i = 0; i < times; i++) {
    end = cursor + scheduleSignalOnce(sig, cursor);
    cursor = end + sig.loopIntervalMs;
  }
  return end;
}

export function playSignal(sig: FixedSignal): LoopHandle {
  if (!sig.enabled) return { stop: () => {} };
  ensureContext();
  let stopped = false;

  const iterate = () => {
    if (stopped) return;
    const len = scheduleSignalOnce(sig, 0);
    if (sig.loop) {
      const timer = setTimeout(() => {
        active.timers.delete(timer);
        iterate();
      }, len + sig.loopIntervalMs);
      active.timers.add(timer);
    }
  };
  iterate();

  return {
    stop: () => {
      stopped = true;
      stopAll();
    },
  };
}
