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
      s.modeChirps = { ...s.modeChirps, pitchHz: 2400, chirpMs: 25, gapMs: 50, volume: 0.4 };
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
      s.tc = { ...s.tc, pitchHz: 3400, maxTicks: 6, tickMs: 12, gapMs: 50 };
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
      s.modeChirps = { ...s.modeChirps, pitchHz: 1600, chirpMs: 40, gapMs: 60 };
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
      s.modeChirps = { ...s.modeChirps, pitchHz: 1400, chirpMs: 25, volume: 0.3 };
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
    name: "Beluga Pod",
    description: "Whale-song sweeps on every voice — squeaks, trills and falls.",
    scheme: make("Beluga Pod", (s) => {
      s.modeChirps = { ...s.modeChirps, pitchHz: 2200, chirpMs: 30, gapMs: 60, volume: 0.4 };
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
