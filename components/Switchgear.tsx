"use client";

// Visual replica of the Varg's handlebar pod: two machined buttons plus the
// red power button, with the real behaviors — single click cycles modes,
// hold-down enters reverse, hold-up enters crawl, tap exits back to the mode.

import { useEffect, useRef, useState } from "react";
import type { ModeSettings, Scheme } from "@/lib/scheme";
import { playModeSound, playSignal, stopAll, type LoopHandle } from "@/lib/audio";

const HOLD_MS = 600;

export type BikeState = "off" | "mode" | "reverse" | "crawl";

export default function Switchgear({
  scheme,
  modes,
}: {
  scheme: Scheme;
  modes: ModeSettings[];
}) {
  const [power, setPower] = useState(false);
  const [modeIndex, setModeIndex] = useState(0);
  const [state, setState] = useState<BikeState>("off");
  const loopRef = useRef<LoopHandle | null>(null);

  // If the scheme changes while a loop (reverse/crawl) is sounding, restart
  // the loop so edits are heard immediately.
  useEffect(() => {
    if (!loopRef.current) return;
    loopRef.current.stop();
    if (state === "reverse") loopRef.current = playSignal(scheme.reverse);
    else if (state === "crawl") loopRef.current = playSignal(scheme.crawl);
    else loopRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheme]);

  useEffect(() => () => stopAll(), []);

  const stopLoop = () => {
    loopRef.current?.stop();
    loopRef.current = null;
  };

  const enterMode = (index: number) => {
    stopLoop();
    setState("mode");
    setModeIndex(index);
    playModeSound(scheme, modes[index], index + 1);
  };

  const tap = (dir: "up" | "down") => {
    if (!power) return;
    if (state === "reverse") {
      if (dir === "up") enterMode(modeIndex); // only ▲ exits reverse
      return;
    }
    if (state === "crawl") {
      if (dir === "down") enterMode(modeIndex); // only ▼ exits crawl
      return;
    }
    const next =
      dir === "up" ? Math.min(modes.length - 1, modeIndex + 1) : Math.max(0, modeIndex - 1);
    enterMode(next);
  };

  const hold = (dir: "up" | "down") => {
    if (!power) return;
    stopLoop();
    if (dir === "down") {
      setState("reverse");
      loopRef.current = playSignal(scheme.reverse);
    } else {
      setState("crawl");
      loopRef.current = playSignal(scheme.crawl);
    }
  };

  const togglePower = () => {
    if (power) {
      stopLoop();
      stopAll();
      setPower(false);
      setState("off");
    } else {
      setPower(true);
      setState("mode");
      if (scheme.powerOn.enabled) playSignal(scheme.powerOn);
    }
  };

  const display =
    state === "off"
      ? "OFF"
      : state === "reverse"
        ? "R"
        : state === "crawl"
          ? "CRAWL"
          : `MODE ${modeIndex + 1}`;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* State display */}
      <div
        className={`w-full rounded-lg border px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest transition-colors ${
          state === "reverse"
            ? "border-red-500 bg-red-950 text-red-400 animate-pulse"
            : state === "crawl"
              ? "border-amber-500 bg-amber-950 text-amber-400"
              : state === "off"
                ? "border-zinc-800 bg-zinc-950 text-zinc-600"
                : "border-emerald-600 bg-emerald-950 text-emerald-400"
        }`}
      >
        {display}
      </div>

      {/* The pod */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-br from-zinc-400 via-zinc-500 to-zinc-700 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-5">
            <PodButton
              label="UP · tap = mode up · hold = crawl"
              onTap={() => tap("up")}
              onHold={() => hold("up")}
              disabled={!power}
            >
              ▲
            </PodButton>
            <PodButton
              label="DOWN · tap = mode down · hold = reverse"
              onTap={() => tap("down")}
              onHold={() => hold("down")}
              disabled={!power}
            >
              ▼
            </PodButton>
          </div>
          {/* Power button */}
          <button
            type="button"
            onClick={togglePower}
            aria-label="Power"
            className={`h-14 w-14 rounded-full border-4 border-red-900/60 bg-gradient-to-br from-red-500 to-red-700 text-white shadow-inner transition-transform active:scale-95 ${
              power ? "ring-4 ring-red-500/40" : "opacity-80"
            }`}
          >
            ⏻
          </button>
        </div>
      </div>

      <p className="max-w-xs text-center text-xs leading-relaxed text-zinc-500">
        Tap <span className="text-zinc-300">▲/▼</span> to move through modes 1–5. Hold{" "}
        <span className="text-zinc-300">▼</span> for reverse — tap{" "}
        <span className="text-zinc-300">▲</span> to exit. Hold{" "}
        <span className="text-zinc-300">▲</span> for crawl — tap{" "}
        <span className="text-zinc-300">▼</span> to exit.
      </p>
    </div>
  );
}

function PodButton({
  children,
  label,
  onTap,
  onHold,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onTap: () => void;
  onHold: () => void;
  disabled: boolean;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFired = useRef(false);
  const [holding, setHolding] = useState(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const down = () => {
    if (disabled) return;
    holdFired.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      holdFired.current = true;
      setHolding(false);
      onHold();
    }, HOLD_MS);
  };

  const up = () => {
    const wasPending = timer.current !== null;
    cancel();
    if (disabled) return;
    if (wasPending && !holdFired.current) onTap();
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative h-24 w-24 touch-none select-none rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-500 text-2xl text-zinc-700 shadow-[inset_0_2px_6px_rgba(255,255,255,0.7),inset_0_-3px_8px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.5)] transition-transform ${
        disabled ? "cursor-not-allowed opacity-60" : "active:scale-[0.96]"
      }`}
    >
      {/* concentric machining rings */}
      <span className="pointer-events-none absolute inset-3 rounded-full border border-zinc-500/30" />
      <span className="pointer-events-none absolute inset-6 rounded-full border border-zinc-500/20" />
      <span className="relative">{children}</span>
      {/* hold progress ring */}
      {holding && (
        <span
          className="pointer-events-none absolute -inset-1 rounded-full border-4 border-amber-400"
          style={{ animation: `holdring ${HOLD_MS}ms linear forwards` }}
        />
      )}
    </button>
  );
}
