"use client";

// The rider's five mode slots (HP / regen / TC), as they'd be configured in
// the Stark app. These are the *inputs* the sound grammar is tested against.

import type { ModeSettings } from "@/lib/scheme";
import { HP_MAX, type Scheme } from "@/lib/scheme";
import { playModeSound, stopAll } from "@/lib/audio";
import { Slider } from "./controls";

export default function ModePanel({
  modes,
  scheme,
  onChange,
}: {
  modes: ModeSettings[];
  scheme: Scheme;
  onChange: (modes: ModeSettings[]) => void;
}) {
  const update = (i: number, patch: Partial<ModeSettings>) => {
    onChange(modes.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  };

  return (
    <div className="space-y-3">
      {modes.map((mode, i) => (
        <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-200">Mode {i + 1}</span>
            <button
              type="button"
              onClick={() => {
                stopAll();
                playModeSound(scheme, mode, i + 1);
              }}
              className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title={`Play mode ${i + 1} sound`}
            >
              ▶ play
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Slider
              label="HP"
              value={mode.hp}
              min={0}
              max={HP_MAX}
              unit=" hp"
              onChange={(hp) => update(i, { hp })}
            />
            <Slider
              label="Regen"
              value={mode.regen}
              min={0}
              max={100}
              unit="%"
              onChange={(regen) => update(i, { regen })}
            />
            <Slider
              label="TC"
              value={mode.tc}
              min={0}
              max={100}
              unit="%"
              onChange={(tc) => update(i, { tc })}
            />
          </div>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-zinc-500">
        Set these like your real bike, then check you can tell the modes apart with your eyes
        closed. The scheme generates each sound from these values — it isn&apos;t tied to slot
        numbers.
      </p>
    </div>
  );
}
