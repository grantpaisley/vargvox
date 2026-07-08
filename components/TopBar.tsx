"use client";

// Scheme management bar: name, new/save/library, JSON import/export, Play All.

import { useRef, useState } from "react";
import type { Scheme } from "@/lib/scheme";
import { importSchemeFile, type SavedScheme } from "@/lib/storage";
import { Button } from "./controls";

export default function TopBar({
  scheme,
  library,
  playingAll,
  onRename,
  onNew,
  onSave,
  onLoad,
  onDelete,
  onImport,
  onExport,
  onPlayAll,
}: {
  scheme: Scheme;
  library: SavedScheme[];
  playingAll: boolean;
  onRename: (name: string) => void;
  onNew: () => void;
  onSave: () => void;
  onLoad: (entry: SavedScheme) => void;
  onDelete: (id: string) => void;
  onImport: (scheme: Scheme) => void;
  onExport: () => void;
  onPlayAll: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-white">
          Varg<span className="text-red-500">Vox</span>
        </h1>
        <input
          value={scheme.name}
          onChange={(e) => onRename(e.target.value)}
          maxLength={60}
          className="min-w-40 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 sm:max-w-xs"
          placeholder="Scheme name"
          aria-label="Scheme name"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPlayAll} variant="primary" title="Play modes 1–5, crawl, reverse">
            {playingAll ? "■ Stop" : "▶ Play All"}
          </Button>
          <Button onClick={onSave} title="Save to your browser's library">
            Save
          </Button>
          <div className="relative">
            <Button onClick={() => setLibraryOpen((o) => !o)}>
              Library ({library.length})
            </Button>
            {libraryOpen && (
              <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
                {library.length === 0 && (
                  <p className="px-2 py-3 text-xs text-zinc-500">
                    Nothing saved yet. Hit Save to keep the current scheme.
                  </p>
                )}
                {library.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-zinc-800"
                  >
                    <button
                      type="button"
                      className="flex-1 truncate text-left text-sm text-zinc-200"
                      title={`Load "${entry.scheme.name}"`}
                      onClick={() => {
                        onLoad(entry);
                        setLibraryOpen(false);
                      }}
                    >
                      {entry.scheme.name}
                      <span className="ml-2 text-xs text-zinc-500">
                        {new Date(entry.savedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      className="text-xs text-zinc-500 hover:text-red-400"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={onNew} title="Start a fresh default scheme">
            New
          </Button>
          <Button onClick={() => fileInput.current?.click()} title="Import a .vargvox.json file">
            Import
          </Button>
          <Button onClick={onExport} title="Download this scheme as JSON">
            Export
          </Button>
        </div>
      </div>
      {importError && (
        <p className="mx-auto mt-2 max-w-7xl text-xs text-red-400">{importError}</p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            setImportError(null);
            onImport(await importSchemeFile(file));
          } catch {
            setImportError("Couldn't import that file — it doesn't look like a VargVox scheme.");
          }
        }}
      />
    </div>
  );
}
