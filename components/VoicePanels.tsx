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
  VoiceOrder,
  Waveform,
} from "@/lib/scheme";
import { LIMITS } from "@/lib/scheme";
import { playModeSound, playSignal, stopAll } from "@/lib/audio";
import ModePanel from "./ModePanel";
import { Select, Slider, Toggle } from "./controls";

const TABS = ["Modes", "HP", "Regen", "TC", "Reverse", "Crawl", "Extras"] as const;
type Tab = (typeof TABS)[number];

type PreviewKind = "mode" | "reverse" | "crawl" | "powerOn";

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
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    []
  );

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
      if (kind === "reverse") playSignal({ ...nextScheme.reverse, loop: false });
      else if (kind === "crawl") playSignal({ ...nextScheme.crawl, loop: false });
      else if (kind === "powerOn") playSignal({ ...nextScheme.powerOn, loop: false });
      else playModeSound(nextScheme, nextModes[modeNumber - 1], modeNumber);
    }, 250);
  };

  const previewKindForTab: PreviewKind =
    tab === "Reverse" ? "reverse" : tab === "Crawl" ? "crawl" : "mode";

  const set = (patch: Partial<Scheme>, kind: PreviewKind = previewKindForTab) => {
    const next = { ...scheme, ...patch };
    onChange(next);
    schedulePreview(kind, next, modes, previewMode);
  };

  const playPreview = () => {
    stopAll();
    playModeSound(scheme, modes[previewMode - 1], previewMode);
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

      <div className="mb-3 flex flex-wrap gap-1">
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

      <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        {tab === "Modes" && (
          <ModePanel
            modes={modes}
            scheme={scheme}
            onChange={(nextModes, editedIndex) => {
              onModesChange(nextModes);
              setPreviewMode(editedIndex + 1);
              schedulePreview("mode", scheme, nextModes, editedIndex + 1);
            }}
          />
        )}

        {tab === "HP" && (
          <>
            <Toggle
              label="HP voice enabled"
              checked={scheme.hp.enabled}
              onChange={(enabled) => set({ hp: { ...scheme.hp, enabled } })}
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
            <Toggle
              label="Regen voice enabled"
              checked={scheme.regen.enabled}
              onChange={(enabled) => set({ regen: { ...scheme.regen, enabled } })}
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
            <Toggle
              label="TC voice enabled"
              checked={scheme.tc.enabled}
              onChange={(enabled) => set({ tc: { ...scheme.tc, enabled } })}
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

        {tab === "Extras" && (
          <>
            <div className="space-y-3 border-b border-zinc-800 pb-4">
              <Toggle
                label="Mode-number chirps (mode 3 = three chirps)"
                checked={scheme.modeChirps.enabled}
                onChange={(enabled) => set({ modeChirps: { ...scheme.modeChirps, enabled } })}
              />
              {scheme.modeChirps.enabled && (
                <>
                  <Slider
                    label="Chirp pitch"
                    value={scheme.modeChirps.pitchHz}
                    min={500}
                    max={LIMITS.pitchHz.max}
                    unit=" Hz"
                    onChange={(pitchHz) => set({ modeChirps: { ...scheme.modeChirps, pitchHz } })}
                  />
                  <Slider
                    label="Chirp length"
                    value={scheme.modeChirps.chirpMs}
                    min={10}
                    max={150}
                    unit=" ms"
                    onChange={(chirpMs) => set({ modeChirps: { ...scheme.modeChirps, chirpMs } })}
                  />
                  <Slider
                    label="Gap"
                    value={scheme.modeChirps.gapMs}
                    min={20}
                    max={300}
                    step={5}
                    unit=" ms"
                    onChange={(gapMs) => set({ modeChirps: { ...scheme.modeChirps, gapMs } })}
                  />
                  <Slider
                    label="Volume"
                    value={scheme.modeChirps.volume}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(volume) => set({ modeChirps: { ...scheme.modeChirps, volume } })}
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
  return (
    <div className="space-y-4">
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
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
        label="Beeps per burst"
        value={signal.beeps}
        min={LIMITS.beeps.min}
        max={LIMITS.beeps.max}
        onChange={(beeps) => onChange({ ...signal, beeps })}
      />
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
        label="Gap within burst"
        value={signal.gapMs}
        min={0}
        max={500}
        step={10}
        unit=" ms"
        onChange={(gapMs) => onChange({ ...signal, gapMs })}
      />
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
