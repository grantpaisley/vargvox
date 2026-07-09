"use client";

// Tabbed editor for the whole scheme: the bike's mode slots first, then the
// parameter voices (HP / regen / TC), the fixed signals (reverse / crawl) and
// extras (mode chirps, power-on, sequencing).
//
// Moving any control auto-plays the affected sound once (debounced), using
// the preview-mode selector at the top for the parameter voices.

import { useEffect, useRef, useState } from "react";
import type {
  FixedSignal,
  ModeSettings,
  Scheme,
  SegmentTweak,
  VoiceOrder,
  Waveform,
} from "@/lib/scheme";
import { LIMITS, signalSegments } from "@/lib/scheme";
import {
  playChirps,
  playModeSound,
  playSignalPreview,
  playVoice,
  playVoiceSequence,
  stopAll,
} from "@/lib/audio";
import ModePanel from "./ModePanel";
import { Select, Slider, Toggle } from "./controls";

const TABS = ["Modes", "HP", "Regen", "TC", "Reverse", "Crawl", "Horn", "Extras"] as const;
type Tab = (typeof TABS)[number];

type PreviewKind =
  | "mode"
  | "hp"
  | "regen"
  | "tc"
  | "chirps"
  | "reverse"
  | "crawl"
  | "horn"
  | "powerOn";

const WAVE_OPTIONS: { value: Waveform; label: string }[] = [
  { value: "sine", label: "Sine (smooth)" },
  { value: "square", label: "Square (beepy)" },
  { value: "sawtooth", label: "Sawtooth (buzzy)" },
  { value: "triangle", label: "Triangle (soft)" },
];

const ORDER_OPTIONS: { value: string; label: string }[] = [
  ["hp", "regen", "tc"],
  ["hp", "tc", "regen"],
  ["regen", "hp", "tc"],
  ["regen", "tc", "hp"],
  ["tc", "hp", "regen"],
  ["tc", "regen", "hp"],
].map((o) => ({ value: o.join(","), label: o.map((v) => v.toUpperCase()).join(" → ") }));

export default function VoicePanels({
  scheme,
  modes,
  onChange,
  onModesChange,
}: {
  scheme: Scheme;
  modes: ModeSettings[];
  onChange: (scheme: Scheme) => void;
  onModesChange: (modes: ModeSettings[]) => void;
}) {
  const [tab, setTab] = useState<Tab>("Modes");
  const [previewMode, setPreviewMode] = useState(1); // 1..5
  // Per-voice preview values: while editing a voice, slider moves audition it
  // at each selected value in sequence (empty = use the preview mode's value).
  const [previewVals, setPreviewVals] = useState<Record<"hp" | "regen" | "tc", number[]>>({
    hp: [],
    regen: [],
    tc: [],
  });
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Progress sweep: while a preview sounds, a bar travels across the pane.
  const [sweep, setSweep] = useState<{ id: number; ms: number } | null>(null);
  const sweepId = useRef(0);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    []
  );

  const startSweep = (ms: number) => {
    if (ms <= 0) return;
    sweepId.current += 1;
    setSweep({ id: sweepId.current, ms });
  };

  // Play the sound a preview kind refers to and return its duration in ms.
  // Looping signals audition two repeats so the pause between them is heard.
  const playKind = (
    kind: PreviewKind,
    s: Scheme,
    m: ModeSettings[],
    modeNumber: number
  ): number => {
    if (kind === "reverse") return playSignalPreview(s.reverse);
    if (kind === "crawl") return playSignalPreview(s.crawl);
    if (kind === "horn") return playSignalPreview(s.horn);
    if (kind === "powerOn") return playSignalPreview({ ...s.powerOn, loop: false });
    if (kind === "chirps") return playChirps(s, modeNumber);
    if (kind === "hp" || kind === "regen" || kind === "tc") {
      const vals = previewVals[kind];
      if (vals.length > 0) return playVoiceSequence(s, kind, vals);
      return playVoice(s, kind, m[modeNumber - 1]);
    }
    return playModeSound(s, m[modeNumber - 1], modeNumber);
  };

  // Debounced auto-play: fires once, shortly after the last control movement.
  const schedulePreview = (
    kind: PreviewKind,
    nextScheme: Scheme,
    nextModes: ModeSettings[],
    modeNumber: number
  ) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      stopAll();
      startSweep(playKind(kind, nextScheme, nextModes, modeNumber));
    }, 250);
  };

  // Editing a tab auditions only that part of the sound.
  const previewKindForTab: PreviewKind =
    tab === "HP"
      ? "hp"
      : tab === "Regen"
        ? "regen"
        : tab === "TC"
          ? "tc"
          : tab === "Reverse"
            ? "reverse"
            : tab === "Crawl"
              ? "crawl"
              : tab === "Horn"
                ? "horn"
                : "mode";

  const set = (patch: Partial<Scheme>, kind: PreviewKind = previewKindForTab) => {
    const next = { ...scheme, ...patch };
    onChange(next);
    schedulePreview(kind, next, modes, previewMode);
  };

  const playPreview = () => {
    stopAll();
    startSweep(playModeSound(scheme, modes[previewMode - 1], previewMode));
  };

  // Play the sound the current pane is editing — same thing the auto-play
  // triggers on a slider change, but on demand.
  const playCurrentPane = () => {
    stopAll();
    startSweep(playKind(previewKindForTab, scheme, modes, previewMode));
  };

  const toggleVal = (voice: "hp" | "regen" | "tc", v: number) => {
    const selecting = !previewVals[voice].includes(v);
    setPreviewVals((prev) => {
      const vals = prev[voice];
      const sel = !vals.includes(v);
      return {
        ...prev,
        [voice]: sel ? [...vals, v].sort((a, b) => a - b) : vals.filter((x) => x !== v),
      };
    });
    if (selecting) {
      stopAll();
      startSweep(playVoice(scheme, voice, { hp: v, regen: v, tc: v }));
    }
  };

  return (
    <div>
      {/* Preview bar: which mode the voice edits are auditioned against */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
        <span className="px-1 text-xs text-zinc-500">Preview mode</span>
        <div className="flex overflow-hidden rounded border border-zinc-700">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setPreviewMode(n);
                stopAll();
                playModeSound(scheme, modes[n - 1], n);
              }}
              className={`h-9 w-9 text-sm font-semibold transition-colors ${
                previewMode === n
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={playPreview}
          className="rounded bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
          title={`Play mode ${previewMode} sound`}
        >
          ▶ Play
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-t px-3 py-2 text-sm ${
              tab === t
                ? "bg-zinc-800 font-semibold text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60">
        {/* Progress sweep: travels across the pane for the duration of the preview */}
        {sweep && (
          <div
            key={sweep.id}
            onAnimationEnd={() => setSweep(null)}
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ animation: `panesweep ${sweep.ms}ms linear forwards` }}
          />
        )}
        <div className="space-y-4 p-4">
        {/* Pane header: enable toggle for what this pane edits + its play button */}
        <div className="flex items-center justify-between gap-2">
          {tab === "Modes" && (
            <Toggle
              label="Mode voice enabled (chirps: mode 3 = three chirps)"
              checked={scheme.modeChirps.enabled}
              onChange={(enabled) =>
                set({ modeChirps: { ...scheme.modeChirps, enabled } }, "chirps")
              }
            />
          )}
          {tab === "HP" && (
            <Toggle
              label="HP voice enabled"
              checked={scheme.hp.enabled}
              onChange={(enabled) => set({ hp: { ...scheme.hp, enabled } })}
            />
          )}
          {tab === "Regen" && (
            <Toggle
              label="Regen voice enabled"
              checked={scheme.regen.enabled}
              onChange={(enabled) => set({ regen: { ...scheme.regen, enabled } })}
            />
          )}
          {tab === "TC" && (
            <Toggle
              label="TC voice enabled"
              checked={scheme.tc.enabled}
              onChange={(enabled) => set({ tc: { ...scheme.tc, enabled } })}
            />
          )}
          {tab === "Reverse" && (
            <Toggle
              label="Reverse voice enabled"
              checked={scheme.reverse.enabled}
              onChange={(enabled) => set({ reverse: { ...scheme.reverse, enabled } }, "reverse")}
            />
          )}
          {tab === "Crawl" && (
            <Toggle
              label="Crawl voice enabled"
              checked={scheme.crawl.enabled}
              onChange={(enabled) => set({ crawl: { ...scheme.crawl, enabled } }, "crawl")}
            />
          )}
          {tab === "Horn" && (
            <Toggle
              label="Horn enabled"
              checked={scheme.horn.enabled}
              onChange={(enabled) => set({ horn: { ...scheme.horn, enabled } }, "horn")}
            />
          )}
          {tab === "Extras" && (
            <span className="text-sm font-medium text-zinc-300">Extras</span>
          )}
          <PlayPaneButton onClick={playCurrentPane} />
        </div>

        {tab === "Modes" && (
          <>
            <ModePanel
              modes={modes}
              scheme={scheme}
              onChange={(nextModes, editedIndex) => {
                onModesChange(nextModes);
                setPreviewMode(editedIndex + 1);
                schedulePreview("mode", scheme, nextModes, editedIndex + 1);
              }}
            />
          </>
        )}

        {tab === "HP" && (
          <>
            <ValueChips
              values={[0, 10, 20, 30, 40, 50, 60, 70, 80]}
              selected={previewVals.hp}
              onToggle={(v) => toggleVal("hp", v)}
              unit="HP"
            />
            <p className="text-xs text-zinc-500">
              A tone whose pitch scales with horsepower: 0 hp sits at the low pitch, 80 hp reaches
              the high pitch.
            </p>
            <Select
              label="Waveform"
              value={scheme.hp.waveform}
              options={WAVE_OPTIONS}
              onChange={(waveform) => set({ hp: { ...scheme.hp, waveform } })}
            />
            <Select
              label="Shape"
              value={scheme.hp.sweep}
              options={[
                { value: "rise", label: "Sweep up to the HP pitch" },
                { value: "flat", label: "Single tone at the HP pitch" },
              ]}
              onChange={(sweep) => set({ hp: { ...scheme.hp, sweep } })}
            />
            <Slider
              label="Low pitch (0 hp)"
              value={scheme.hp.basePitchHz}
              min={LIMITS.pitchHz.min}
              max={1000}
              unit=" Hz"
              onChange={(basePitchHz) => set({ hp: { ...scheme.hp, basePitchHz } })}
            />
            <Slider
              label="High pitch (80 hp)"
              value={scheme.hp.maxPitchHz}
              min={300}
              max={LIMITS.pitchHz.max}
              unit=" Hz"
              onChange={(maxPitchHz) => set({ hp: { ...scheme.hp, maxPitchHz } })}
            />
            <Slider
              label="Duration"
              value={scheme.hp.durationMs}
              min={50}
              max={1000}
              step={10}
              unit=" ms"
              onChange={(durationMs) => set({ hp: { ...scheme.hp, durationMs } })}
            />
            <Slider
              label="Volume"
              value={scheme.hp.volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(volume) => set({ hp: { ...scheme.hp, volume } })}
            />
          </>
        )}

        {tab === "Regen" && (
          <>
            <ValueChips
              values={[0, 20, 40, 60, 80, 100]}
              selected={previewVals.regen}
              onToggle={(v) => toggleVal("regen", v)}
              unit="%"
            />
            <p className="text-xs text-zinc-500">
              Engine-braking strength, 0–100%. Pulses: more regen = more pulses. Fall: more regen =
              deeper falling tone. 0% is silent.
            </p>
            <Select
              label="Style"
              value={scheme.regen.style}
              options={[
                { value: "pulses", label: "Low pulses (count = regen)" },
                { value: "fall", label: "Falling tone (depth = regen)" },
              ]}
              onChange={(style) => set({ regen: { ...scheme.regen, style } })}
            />
            <Select
              label="Waveform"
              value={scheme.regen.waveform}
              options={WAVE_OPTIONS}
              onChange={(waveform) => set({ regen: { ...scheme.regen, waveform } })}
            />
            <Slider
              label="Pitch"
              value={scheme.regen.pitchHz}
              min={LIMITS.pitchHz.min}
              max={1500}
              unit=" Hz"
              onChange={(pitchHz) => set({ regen: { ...scheme.regen, pitchHz } })}
            />
            {scheme.regen.style === "pulses" ? (
              <>
                <Slider
                  label="Pulses at 100%"
                  value={scheme.regen.maxPulses}
                  min={LIMITS.pulses.min}
                  max={LIMITS.pulses.max}
                  onChange={(maxPulses) => set({ regen: { ...scheme.regen, maxPulses } })}
                />
                <Slider
                  label="Pulse length"
                  value={scheme.regen.pulseMs}
                  min={20}
                  max={300}
                  step={5}
                  unit=" ms"
                  onChange={(pulseMs) => set({ regen: { ...scheme.regen, pulseMs } })}
                />
                <Slider
                  label="Gap between pulses"
                  value={scheme.regen.gapMs}
                  min={10}
                  max={300}
                  step={5}
                  unit=" ms"
                  onChange={(gapMs) => set({ regen: { ...scheme.regen, gapMs } })}
                />
              </>
            ) : (
              <Slider
                label="Fall duration"
                value={scheme.regen.fallDurationMs}
                min={100}
                max={1000}
                step={10}
                unit=" ms"
                onChange={(fallDurationMs) => set({ regen: { ...scheme.regen, fallDurationMs } })}
              />
            )}
            <Slider
              label="Volume"
              value={scheme.regen.volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(volume) => set({ regen: { ...scheme.regen, volume } })}
            />
          </>
        )}

        {tab === "TC" && (
          <>
            <ValueChips
              values={[0, 20, 40, 60, 80, 100]}
              selected={previewVals.tc}
              onToggle={(v) => toggleVal("tc", v)}
              unit="%"
            />
            <p className="text-xs text-zinc-500">
              Traction control, 0–100%, as a run of short ticks: more TC = more ticks. 0% is
              silent.
            </p>
            <Slider
              label="Tick pitch"
              value={scheme.tc.pitchHz}
              min={800}
              max={LIMITS.pitchHz.max}
              unit=" Hz"
              onChange={(pitchHz) => set({ tc: { ...scheme.tc, pitchHz } })}
            />
            <Slider
              label="Ticks at 100%"
              value={scheme.tc.maxTicks}
              min={LIMITS.ticks.min}
              max={LIMITS.ticks.max}
              onChange={(maxTicks) => set({ tc: { ...scheme.tc, maxTicks } })}
            />
            <Slider
              label="Tick length"
              value={scheme.tc.tickMs}
              min={5}
              max={80}
              unit=" ms"
              onChange={(tickMs) => set({ tc: { ...scheme.tc, tickMs } })}
            />
            <Slider
              label="Gap between ticks"
              value={scheme.tc.gapMs}
              min={20}
              max={300}
              step={5}
              unit=" ms"
              onChange={(gapMs) => set({ tc: { ...scheme.tc, gapMs } })}
            />
            <Slider
              label="Volume"
              value={scheme.tc.volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(volume) => set({ tc: { ...scheme.tc, volume } })}
            />
          </>
        )}

        {tab === "Reverse" && (
          <FixedSignalEditor
            signal={scheme.reverse}
            onChange={(reverse) => set({ reverse: { ...reverse, loop: true } }, "reverse")}
            lockLoop
            hint="The safety centerpiece. It repeats the whole time reverse is engaged — make it unmissable, like a truck's backup beeper."
          />
        )}

        {tab === "Crawl" && (
          <FixedSignalEditor
            signal={scheme.crawl}
            onChange={(crawl) => set({ crawl }, "crawl")}
            hint="Walking-pace mode. Distinct from reverse but gentler."
          />
        )}

        {tab === "Horn" && (
          <FixedSignalEditor
            signal={scheme.horn}
            onChange={(horn) => set({ horn: { ...horn, loop: true } }, "horn")}
            lockLoop
            hint="Hold the HORN button on the switchgear to sound it — it repeats while held. Default: beluga-style rising chirps."
          />
        )}

        {tab === "Extras" && (
          <>
            <div className="space-y-3 border-b border-zinc-800 pb-4">
              <Toggle
                label="Mode-number chirps (mode 3 = three chirps)"
                checked={scheme.modeChirps.enabled}
                onChange={(enabled) =>
                  set({ modeChirps: { ...scheme.modeChirps, enabled } }, "chirps")
                }
              />
              {scheme.modeChirps.enabled && (
                <>
                  <Slider
                    label="Chirp pitch"
                    value={scheme.modeChirps.pitchHz}
                    min={500}
                    max={LIMITS.pitchHz.max}
                    unit=" Hz"
                    onChange={(pitchHz) =>
                      set({ modeChirps: { ...scheme.modeChirps, pitchHz } }, "chirps")
                    }
                  />
                  <Slider
                    label="Chirp length"
                    value={scheme.modeChirps.chirpMs}
                    min={10}
                    max={150}
                    unit=" ms"
                    onChange={(chirpMs) =>
                      set({ modeChirps: { ...scheme.modeChirps, chirpMs } }, "chirps")
                    }
                  />
                  <Slider
                    label="Gap"
                    value={scheme.modeChirps.gapMs}
                    min={20}
                    max={300}
                    step={5}
                    unit=" ms"
                    onChange={(gapMs) =>
                      set({ modeChirps: { ...scheme.modeChirps, gapMs } }, "chirps")
                    }
                  />
                  <Slider
                    label="Volume"
                    value={scheme.modeChirps.volume}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(volume) =>
                      set({ modeChirps: { ...scheme.modeChirps, volume } }, "chirps")
                    }
                  />
                </>
              )}
            </div>

            <div className="space-y-3 border-b border-zinc-800 pb-4">
              <Select
                label="Voice order"
                value={scheme.sequence.order.join(",")}
                options={ORDER_OPTIONS}
                onChange={(v) =>
                  set({
                    sequence: { ...scheme.sequence, order: v.split(",") as VoiceOrder[] },
                  })
                }
              />
              <Toggle
                label="Layer voices (play together instead of in sequence)"
                checked={scheme.sequence.layered}
                onChange={(layered) => set({ sequence: { ...scheme.sequence, layered } })}
              />
              <Slider
                label="Gap between voices"
                value={scheme.sequence.gapMs}
                min={0}
                max={500}
                step={10}
                unit=" ms"
                onChange={(gapMs) => set({ sequence: { ...scheme.sequence, gapMs } })}
              />
            </div>

            <div className="space-y-3">
              <Toggle
                label="Power-on sound"
                checked={scheme.powerOn.enabled}
                onChange={(enabled) =>
                  set({ powerOn: { ...scheme.powerOn, enabled } }, "powerOn")
                }
              />
              {scheme.powerOn.enabled && (
                <FixedSignalEditor
                  signal={scheme.powerOn}
                  onChange={(s) =>
                    set({ powerOn: { ...scheme.powerOn, ...s, loop: false } }, "powerOn")
                  }
                  lockLoop
                  compact
                />
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

// Multi-select preview values for a voice tab. Click to select (plays that
// value), click again to deselect. While any are selected, slider moves play
// the voice at each selected value in sequence.
function ValueChips({
  values,
  selected,
  onToggle,
  unit,
}: {
  values: number[];
  selected: number[];
  onToggle: (v: number) => void;
  unit: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      title="Preview values — slider changes play each selected value in sequence"
    >
      <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-500">Preview at</span>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onToggle(v)}
          className={`min-w-8 rounded px-1.5 py-1 text-xs font-medium transition-colors ${
            selected.includes(v)
              ? "bg-red-600 text-white"
              : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          {v}
        </button>
      ))}
      <span className="text-[10px] text-zinc-500">{unit}</span>
    </div>
  );
}

function PlayPaneButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Play this pane's sound"
      aria-label="Play this pane's sound"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-600 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-700 ${className}`}
    >
      ▶
    </button>
  );
}

// Rhythm pattern input: "." = beep, space = pause between groups.
// e.g. ".. . .." beeps twice, once, twice. Empty = plain beep count.
function PatternField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-zinc-400">Rhythm (. = beep, space = pause)</span>
        <span className="text-zinc-500">e.g. &quot;.. . ..&quot;</span>
      </div>
      <input
        type="text"
        value={value}
        maxLength={16}
        placeholder="empty = use beep count"
        onChange={(e) => onChange(e.target.value.replace(/[^. ]/g, ""))}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm tracking-[0.3em] text-zinc-200 placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-600"
      />
    </label>
  );
}

function FixedSignalEditor({
  signal,
  onChange,
  hint,
  lockLoop = false,
  compact = false,
}: {
  signal: FixedSignal;
  onChange: (s: FixedSignal) => void;
  hint?: string;
  lockLoop?: boolean;
  compact?: boolean;
}) {
  // Segment editing: click segments in the timeline to select them, then the
  // sliders below shape just those. Tweaks are cleared if the rhythm changes.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const segments = signalSegments(signal);
  const selection = [...selected].filter((i) => i < segments.length).sort((a, b) => a - b);
  const firstSel = selection.length > 0 ? segments[selection[0]] : null;
  const firstBeepIdx = selection.find((i) => segments[i].kind === "beep");
  const firstBeep = firstBeepIdx !== undefined ? segments[firstBeepIdx] : null;
  const hasTweaks = signal.tweaks.some(Boolean);

  const toggleSegment = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const applyTweak = (patch: SegmentTweak, beepsOnly = false) => {
    const tweaks = [...signal.tweaks];
    for (const i of selection) {
      if (beepsOnly && segments[i].kind !== "beep") continue;
      tweaks[i] = { ...(tweaks[i] ?? {}), ...patch };
    }
    onChange({ ...signal, tweaks });
  };

  // Rhythm edits change the segment layout, so per-segment tweaks reset.
  const changeRhythm = (patch: Partial<FixedSignal>) => {
    setSelected(new Set());
    onChange({ ...signal, ...patch, tweaks: [] });
  };

  return (
    <div className="space-y-4">
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}

      {/* Timeline: one block per beep/gap, width proportional to duration */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-zinc-400">Timeline — click segments, then shape them below</span>
          {hasTweaks && (
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                onChange({ ...signal, tweaks: [] });
              }}
              className="text-zinc-500 underline hover:text-zinc-300"
            >
              even out
            </button>
          )}
        </div>
        <div className="flex h-9 w-full items-stretch gap-px overflow-hidden rounded border border-zinc-700 bg-zinc-950 p-px">
          {segments.map((seg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleSegment(i)}
              title={
                seg.kind === "beep"
                  ? `Beep — ${Math.round(seg.durMs)} ms, ${Math.round(seg.startHz)}${
                      seg.endHz !== seg.startHz ? `→${Math.round(seg.endHz)}` : ""
                    } Hz`
                  : `Gap — ${Math.round(seg.durMs)} ms`
              }
              style={{ flexGrow: Math.max(seg.durMs, 1), flexBasis: 0, minWidth: 10 }}
              className={`rounded-sm transition-colors ${
                seg.kind === "beep"
                  ? selected.has(i)
                    ? "bg-red-400 ring-2 ring-inset ring-white/70"
                    : "bg-red-600/70 hover:bg-red-500"
                  : selected.has(i)
                    ? "bg-zinc-600 ring-2 ring-inset ring-white/40"
                    : "bg-zinc-800/80 hover:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {selection.length > 0 && firstSel && (
        <div className="space-y-3 rounded border border-zinc-700/70 bg-zinc-950/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            {selection.length} segment{selection.length > 1 ? "s" : ""} selected
          </p>
          <Slider
            label="Length"
            value={Math.round(firstSel.durMs)}
            min={0}
            max={800}
            step={5}
            unit=" ms"
            onChange={(durMs) => applyTweak({ durMs })}
          />
          {firstBeep && (
            <>
              <Slider
                label="Pitch start"
                value={Math.round(firstBeep.startHz)}
                min={LIMITS.pitchHz.min}
                max={LIMITS.pitchHz.max}
                unit=" Hz"
                onChange={(startHz) => applyTweak({ startHz }, true)}
              />
              <Slider
                label="Pitch end"
                value={Math.round(firstBeep.endHz)}
                min={LIMITS.pitchHz.min}
                max={LIMITS.pitchHz.max}
                unit=" Hz"
                onChange={(endHz) => applyTweak({ endHz }, true)}
              />
            </>
          )}
        </div>
      )}
      <Select
        label="Waveform"
        value={signal.waveform}
        options={WAVE_OPTIONS}
        onChange={(waveform) => onChange({ ...signal, waveform })}
      />
      <Slider
        label="Pitch"
        value={signal.pitchHz}
        min={LIMITS.pitchHz.min}
        max={LIMITS.pitchHz.max}
        unit=" Hz"
        onChange={(pitchHz) => onChange({ ...signal, pitchHz })}
      />
      <Slider
        label="Second pitch (0 = off, alternates beeps)"
        value={signal.pitch2Hz}
        min={0}
        max={LIMITS.pitchHz.max}
        unit=" Hz"
        onChange={(pitch2Hz) =>
          onChange({
            ...signal,
            pitch2Hz: pitch2Hz < LIMITS.pitchHz.min ? 0 : pitch2Hz,
          })
        }
      />
      <Slider
        label="Sweep to (0 = off, each beep glides here)"
        value={signal.sweepHz}
        min={0}
        max={LIMITS.pitchHz.max}
        unit=" Hz"
        onChange={(sweepHz) =>
          onChange({
            ...signal,
            sweepHz: sweepHz < LIMITS.pitchHz.min ? 0 : sweepHz,
          })
        }
      />
      <PatternField
        value={signal.pattern}
        onChange={(pattern) => changeRhythm({ pattern })}
      />
      {!signal.pattern.includes(".") && (
        <Slider
          label="Beeps per burst"
          value={signal.beeps}
          min={LIMITS.beeps.min}
          max={LIMITS.beeps.max}
          onChange={(beeps) => changeRhythm({ beeps })}
        />
      )}
      <Slider
        label="Beep length"
        value={signal.beepMs}
        min={30}
        max={800}
        step={10}
        unit=" ms"
        onChange={(beepMs) => onChange({ ...signal, beepMs })}
      />
      <Slider
        label="Gap between beeps"
        value={signal.gapMs}
        min={0}
        max={500}
        step={10}
        unit=" ms"
        onChange={(gapMs) => onChange({ ...signal, gapMs })}
      />
      {signal.pattern.includes(" ") && signal.pattern.includes(".") && (
        <Slider
          label="Gap between groups (each space in the rhythm)"
          value={signal.groupGapMs}
          min={0}
          max={1000}
          step={10}
          unit=" ms"
          onChange={(groupGapMs) => onChange({ ...signal, groupGapMs })}
        />
      )}
      {!compact && (
        <>
          {!lockLoop && (
            <Toggle
              label="Loop while engaged"
              checked={signal.loop}
              onChange={(loop) => onChange({ ...signal, loop })}
            />
          )}
          {(signal.loop || lockLoop) && (
            <Slider
              label="Pause between repeats"
              value={signal.loopIntervalMs}
              min={0}
              max={2000}
              step={50}
              unit=" ms"
              onChange={(loopIntervalMs) => onChange({ ...signal, loopIntervalMs })}
            />
          )}
        </>
      )}
      <Slider
        label="Volume"
        value={signal.volume}
        min={0}
        max={1}
        step={0.05}
        onChange={(volume) => onChange({ ...signal, volume })}
      />
    </div>
  );
}
