// Built-in example sound sets. Each starts from the default scheme and
// overrides the character of every voice, so they always carry a full, valid
// Scheme even as fields are added later.

import type { Scheme } from "./scheme";
import { defaultScheme } from "./scheme";

export interface Preset {
  name: string;
  description: string;
  scheme: Scheme;
}

function make(name: string, patch: (s: Scheme) => void): Scheme {
  const s = defaultScheme();
  s.name = name;
  patch(s);
  return s;
}

export const PRESETS: Preset[] = [
  {
    name: "Factory Beeper",
    description: "The stock scheme — sawtooth HP sweep, square pulses, beluga horn.",
    scheme: make("Factory Beeper", () => {}),
  },
  {
    name: "Sci-Fi Shuttle",
    description: "Smooth sine sweeps and scanner ticks, like a spacecraft console.",
    scheme: make("Sci-Fi Shuttle", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 2400, beepMs: 25, gapMs: 50, volume: 0.4 };
      s.hp = {
        ...s.hp,
        waveform: "sine",
        basePitchHz: 300,
        maxPitchHz: 2600,
        durationMs: 500,
        sweep: "rise",
        volume: 0.6,
      };
      s.regen = {
        ...s.regen,
        style: "fall",
        waveform: "sine",
        pitchHz: 900,
        fallDurationMs: 400,
        volume: 0.5,
      };
      s.tc = { ...s.tc, pitchHz: 2800, endPitchHz: 4000, maxTicks: 6, tickMs: 12, gapMs: 50 };
      s.reverse = {
        ...s.reverse,
        waveform: "triangle",
        pitchHz: 1200,
        pitch2Hz: 700,
        beeps: 2,
        beepMs: 180,
        gapMs: 60,
        loopIntervalMs: 250,
      };
      s.crawl = { ...s.crawl, waveform: "sine", pitchHz: 420, sweepHz: 560, beeps: 1, beepMs: 260 };
      s.powerOn = {
        ...s.powerOn,
        pitchHz: 300,
        pitch2Hz: 0,
        sweepHz: 1200,
        beeps: 1,
        beepMs: 400,
      };
      s.horn = {
        ...s.horn,
        waveform: "sine",
        pitchHz: 700,
        sweepHz: 2200,
        beeps: 1,
        pattern: "",
        beepMs: 500,
        loopIntervalMs: 60,
      };
    }),
  },
  {
    name: "Retro Arcade",
    description: "Chunky square waves everywhere — 8-bit cabinet energy.",
    scheme: make("Retro Arcade", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 1600, beepMs: 40, gapMs: 60 };
      s.hp = {
        ...s.hp,
        waveform: "square",
        basePitchHz: 180,
        maxPitchHz: 1300,
        durationMs: 300,
        volume: 0.55,
      };
      s.regen = { ...s.regen, style: "pulses", waveform: "square", pitchHz: 160, maxPulses: 5 };
      s.tc = { ...s.tc, pitchHz: 3000, maxTicks: 6, tickMs: 20 };
      s.reverse = { ...s.reverse, waveform: "square", pitchHz: 1000, beepMs: 250, loopIntervalMs: 250 };
      s.crawl = { ...s.crawl, waveform: "square", pitchHz: 520, pitch2Hz: 660, volume: 0.4 };
      s.powerOn = {
        ...s.powerOn,
        waveform: "square",
        pitchHz: 990,
        pitch2Hz: 1480,
        beepMs: 90,
        gapMs: 30,
      };
      s.horn = {
        ...s.horn,
        waveform: "square",
        pitchHz: 440,
        pitch2Hz: 330,
        sweepHz: 0,
        pattern: ".. ..",
        beepMs: 90,
        gapMs: 40,
        groupGapMs: 120,
        loopIntervalMs: 150,
      };
    }),
  },
  {
    name: "Quiet Commuter",
    description: "Soft, short and low-volume — reverse stays loud for safety.",
    scheme: make("Quiet Commuter", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 1400, beepMs: 25, volume: 0.3 };
      s.hp = {
        ...s.hp,
        waveform: "triangle",
        durationMs: 240,
        sweep: "flat",
        volume: 0.35,
      };
      s.regen = { ...s.regen, style: "fall", waveform: "sine", pitchHz: 700, fallDurationMs: 250, volume: 0.3 };
      s.tc = { ...s.tc, maxTicks: 3, volume: 0.3 };
      s.reverse = { ...s.reverse, volume: 0.65 };
      s.crawl = { ...s.crawl, volume: 0.3 };
      s.powerOn = { ...s.powerOn, volume: 0.35 };
      s.horn = { ...s.horn, volume: 0.6 };
    }),
  },
  {
    name: "Riser",
    description: "Everything sweeps upward — rising chirps, signals, horn and TC ramp.",
    scheme: make("Riser", (s) => {
      s.modeChirps = {
        ...s.modeChirps,
        waveform: "triangle",
        pitchHz: 900,
        sweepHz: 1800,
        beepMs: 45,
        gapMs: 60,
      };
      s.hp = {
        ...s.hp,
        waveform: "sine",
        basePitchHz: 250,
        maxPitchHz: 2200,
        durationMs: 450,
        sweep: "rise",
        volume: 0.6,
      };
      s.regen = { ...s.regen, style: "pulses", waveform: "triangle", pitchHz: 300 };
      s.tc = { ...s.tc, pitchHz: 1500, endPitchHz: 3800, tickMs: 15, gapMs: 55 };
      s.reverse = { ...s.reverse, pitchHz: 700, sweepHz: 1400, beepMs: 350, loopIntervalMs: 250 };
      s.crawl = { ...s.crawl, waveform: "sine", pitchHz: 400, pitch2Hz: 0, sweepHz: 700 };
      s.horn = { ...s.horn, pitchHz: 500, sweepHz: 2000, beeps: 2, beepMs: 300, gapMs: 80 };
      s.powerOn = {
        ...s.powerOn,
        pitchHz: 350,
        pitch2Hz: 0,
        sweepHz: 1600,
        beeps: 1,
        beepMs: 500,
      };
    }),
  },
  {
    name: "Deep Descent",
    description: "Falling sweeps everywhere — foghorn, sinking power-on, TC ramps down.",
    scheme: make("Deep Descent", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 2000, sweepHz: 1200, beepMs: 45 };
      s.hp = { ...s.hp, waveform: "triangle", sweep: "flat", durationMs: 420, volume: 0.6 };
      s.regen = { ...s.regen, style: "fall", waveform: "sine", pitchHz: 1100, fallDurationMs: 420 };
      s.tc = { ...s.tc, pitchHz: 3800, endPitchHz: 2000 };
      s.reverse = { ...s.reverse, pitchHz: 1200, sweepHz: 800, beepMs: 320 };
      s.crawl = { ...s.crawl, waveform: "sine", pitchHz: 700, pitch2Hz: 0, sweepHz: 450 };
      s.horn = {
        ...s.horn,
        waveform: "sawtooth",
        pitchHz: 1300,
        sweepHz: 400,
        beeps: 1,
        beepMs: 500,
        loopIntervalMs: 150,
        volume: 0.65,
      };
      s.powerOn = {
        ...s.powerOn,
        pitchHz: 1500,
        pitch2Hz: 0,
        sweepHz: 500,
        beeps: 1,
        beepMs: 450,
      };
    }),
  },
  {
    name: "Two-Tone Klaxon",
    description: "Alternating hi-lo pairs, like a European siren.",
    scheme: make("Two-Tone Klaxon", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 1400, pitch2Hz: 2100, beepMs: 45, gapMs: 55 };
      s.hp = {
        ...s.hp,
        waveform: "square",
        basePitchHz: 200,
        maxPitchHz: 1400,
        durationMs: 320,
        volume: 0.55,
      };
      s.tc = { ...s.tc, pitchHz: 3200 };
      s.reverse = {
        ...s.reverse,
        pitchHz: 800,
        pitch2Hz: 1100,
        beeps: 2,
        beepMs: 200,
        gapMs: 40,
        loopIntervalMs: 200,
      };
      s.crawl = { ...s.crawl, pitchHz: 550, pitch2Hz: 750, beeps: 2, beepMs: 160 };
      s.horn = {
        ...s.horn,
        waveform: "square",
        pitchHz: 700,
        pitch2Hz: 880,
        sweepHz: 0,
        beeps: 4,
        beepMs: 150,
        gapMs: 30,
        loopIntervalMs: 80,
        volume: 0.75,
      };
    }),
  },
  {
    name: "Morse Rider",
    description: "Dot-dash rhythms — dashes made by stretching segments.",
    scheme: make("Morse Rider", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 1900, beepMs: 40, gapMs: 90 };
      s.hp = { ...s.hp, waveform: "sine", sweep: "flat", durationMs: 300 };
      s.regen = { ...s.regen, style: "pulses", pitchHz: 190 };
      s.tc = { ...s.tc, pitchHz: 2900 };
      s.crawl = { ...s.crawl, pitch2Hz: 0, pattern: ".. .", groupGapMs: 220, beepMs: 90 };
      // Horn spells "R" (dot dash dot): middle beep stretched into a dash.
      s.horn = {
        ...s.horn,
        waveform: "square",
        pitchHz: 900,
        sweepHz: 0,
        pattern: "...",
        beepMs: 90,
        gapMs: 70,
        loopIntervalMs: 350,
        tweaks: [null, null, { durMs: 270 }],
        volume: 0.7,
      };
      s.powerOn = {
        ...s.powerOn,
        pitch2Hz: 0,
        pattern: ". .",
        beepMs: 90,
        groupGapMs: 200,
      };
    }),
  },
  {
    name: "Droid Chatter",
    description: "Quick squeaks sweeping up and down — expressive little robot noises.",
    scheme: make("Droid Chatter", (s) => {
      s.modeChirps = {
        ...s.modeChirps,
        waveform: "sine",
        pitchHz: 2600,
        sweepHz: 3400,
        beepMs: 28,
        gapMs: 55,
        volume: 0.45,
      };
      s.hp = {
        ...s.hp,
        waveform: "sine",
        basePitchHz: 500,
        maxPitchHz: 3000,
        durationMs: 300,
        volume: 0.55,
      };
      s.regen = {
        ...s.regen,
        style: "pulses",
        waveform: "triangle",
        pitchHz: 800,
        pulseMs: 45,
        gapMs: 45,
      };
      s.tc = { ...s.tc, pitchHz: 2400, endPitchHz: 4200, tickMs: 10, gapMs: 45 };
      s.reverse = { ...s.reverse, waveform: "triangle", pitchHz: 1000, sweepHz: 1300, beepMs: 260 };
      s.crawl = {
        ...s.crawl,
        waveform: "sine",
        pitchHz: 900,
        pitch2Hz: 0,
        sweepHz: 1400,
        beeps: 2,
        beepMs: 100,
        gapMs: 60,
      };
      // Squeaks alternate up/down via per-beep pitch tweaks (beeps 2 & 4).
      s.horn = {
        ...s.horn,
        pitchHz: 1200,
        sweepHz: 2400,
        beeps: 4,
        beepMs: 110,
        gapMs: 45,
        loopIntervalMs: 100,
        tweaks: [
          null,
          null,
          { startHz: 2200, endHz: 900 },
          null,
          null,
          null,
          { startHz: 2600, endHz: 1100 },
        ],
      };
      s.powerOn = {
        ...s.powerOn,
        pitchHz: 800,
        pitch2Hz: 0,
        sweepHz: 2600,
        beeps: 3,
        beepMs: 90,
        gapMs: 50,
        tweaks: [null, null, null, null, { startHz: 2600, endHz: 1200 }],
      };
    }),
  },
  {
    name: "Beluga Pod",
    description: "Whale-song sweeps on every voice — squeaks, trills and falls.",
    scheme: make("Beluga Pod", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 2200, beepMs: 30, gapMs: 60, volume: 0.4 };
      s.hp = {
        ...s.hp,
        waveform: "sine",
        basePitchHz: 400,
        maxPitchHz: 2000,
        durationMs: 600,
        sweep: "rise",
        volume: 0.6,
      };
      s.regen = { ...s.regen, style: "fall", waveform: "sine", pitchHz: 1400, fallDurationMs: 450 };
      s.tc = { ...s.tc, pitchHz: 2600, tickMs: 25, gapMs: 60 };
      s.reverse = {
        ...s.reverse,
        waveform: "sine",
        pitchHz: 900,
        sweepHz: 1300,
        beeps: 2,
        beepMs: 200,
        gapMs: 60,
        loopIntervalMs: 350,
      };
      s.crawl = { ...s.crawl, waveform: "sine", pitchHz: 600, sweepHz: 800, beepMs: 180 };
      s.powerOn = { ...s.powerOn, pitchHz: 500, pitch2Hz: 0, sweepHz: 1500, beeps: 2, beepMs: 220 };
      s.horn = {
        ...s.horn,
        pattern: "... .",
        beepMs: 140,
        gapMs: 40,
        groupGapMs: 160,
        // Segment tweaks: long rising call, two quick squeaks, falling tail.
        tweaks: [
          { durMs: 220, startHz: 420, endHz: 1500 },
          null,
          { durMs: 90 },
          null,
          { durMs: 90 },
          null,
          { durMs: 260, startHz: 1100, endHz: 500 },
        ],
      };
    }),
  },
];
