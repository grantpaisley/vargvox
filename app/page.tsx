"use client";

// The Phase 1 editor: switchgear simulator (left), mode configuration
// (center), voice editing (right). State auto-saves to localStorage.

import { useEffect, useRef, useState } from "react";
import type { ModeSettings, Scheme } from "@/lib/scheme";
import { defaultModes, defaultScheme } from "@/lib/scheme";
import { playModeSound, playSignal, stopAll } from "@/lib/audio";
import {
  deleteFromLibrary,
  exportScheme,
  loadCurrent,
  loadLibrary,
  saveCurrent,
  saveToLibrary,
  type SavedScheme,
} from "@/lib/storage";
import Switchgear from "@/components/Switchgear";
import VoicePanels from "@/components/VoicePanels";
import TopBar from "@/components/TopBar";

export default function Editor() {
  const [scheme, setScheme] = useState<Scheme>(defaultScheme);
  const [modes, setModes] = useState<ModeSettings[]>(defaultModes);
  const [library, setLibrary] = useState<SavedScheme[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  const playAllTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Restore working state + library once on the client.
  useEffect(() => {
    const current = loadCurrent();
    if (current) {
      setScheme(current.scheme);
      setModes(current.modes);
    }
    setLibrary(loadLibrary());
    setHydrated(true);
  }, []);

  // Auto-save the working state.
  useEffect(() => {
    if (hydrated) saveCurrent(scheme, modes);
  }, [scheme, modes, hydrated]);

  const stopPlayAll = () => {
    for (const t of playAllTimers.current) clearTimeout(t);
    playAllTimers.current = [];
    stopAll();
    setPlayingAll(false);
  };

  // Play modes 1–5, then crawl, then reverse — the full tour of the scheme.
  const playAll = () => {
    if (playingAll) {
      stopPlayAll();
      return;
    }
    setPlayingAll(true);
    let cursor = 0;
    const GAP = 700;
    modes.forEach((mode, i) => {
      playAllTimers.current.push(
        setTimeout(() => playModeSound(scheme, mode, i + 1), cursor)
      );
      cursor += 1600 + GAP;
    });
    playAllTimers.current.push(
      setTimeout(() => playSignal({ ...scheme.crawl, loop: false }), cursor)
    );
    cursor += 1600 + GAP;
    playAllTimers.current.push(
      setTimeout(() => {
        // Three reverse bursts so its repeating character comes across.
        const burst =
          (scheme.reverse.beepMs + scheme.reverse.gapMs) * scheme.reverse.beeps +
          scheme.reverse.loopIntervalMs;
        for (let i = 0; i < 3; i++) {
          playAllTimers.current.push(
            setTimeout(() => playSignal({ ...scheme.reverse, loop: false }), i * burst)
          );
        }
      }, cursor)
    );
    cursor += 2200;
    playAllTimers.current.push(setTimeout(() => setPlayingAll(false), cursor));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <TopBar
        scheme={scheme}
        library={library}
        playingAll={playingAll}
        onRename={(name) => setScheme({ ...scheme, name })}
        onNew={() => {
          stopPlayAll();
          setScheme(defaultScheme());
        }}
        onSave={() => setLibrary(saveToLibrary(scheme))}
        onLoad={(entry) => {
          stopPlayAll();
          setScheme(entry.scheme);
        }}
        onDelete={(id) => setLibrary(deleteFromLibrary(id))}
        onImport={(imported) => {
          stopPlayAll();
          setScheme(imported);
        }}
        onExport={() => exportScheme(scheme)}
        onPlayAll={playAll}
      />

      <main className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[320px_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Switchgear
          </h2>
          <div className="md:sticky md:top-4">
            <Switchgear scheme={scheme} modes={modes} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Sound design
          </h2>
          <VoicePanels
            scheme={scheme}
            modes={modes}
            onChange={setScheme}
            onModesChange={setModes}
          />
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-zinc-600">
        VargVox — community-designed audible mode feedback for the Stark Varg. Your work
        auto-saves in this browser.
      </footer>
    </div>
  );
}
