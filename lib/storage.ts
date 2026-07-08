// Phase 1 persistence: localStorage only. The working scheme/modes auto-save;
// named schemes are kept in a simple library list. JSON export/import lets
// schemes travel between copies of the app.

import type { ModeSettings, Scheme } from "./scheme";
import { sanitizeModes, sanitizeScheme } from "./scheme";

const CURRENT_KEY = "vargvox:current";
const LIBRARY_KEY = "vargvox:library";

export interface SavedScheme {
  id: string;
  savedAt: string; // ISO date
  scheme: Scheme;
}

export function loadCurrent(): { scheme: Scheme; modes: ModeSettings[] } | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      scheme: sanitizeScheme(parsed.scheme),
      modes: sanitizeModes(parsed.modes),
    };
  } catch {
    return null;
  }
}

export function saveCurrent(scheme: Scheme, modes: ModeSettings[]): void {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ scheme, modes }));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

export function loadLibrary(): SavedScheme[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.id === "string")
      .map((e) => ({
        id: e.id,
        savedAt: typeof e.savedAt === "string" ? e.savedAt : new Date().toISOString(),
        scheme: sanitizeScheme(e.scheme),
      }));
  } catch {
    return [];
  }
}

export function saveToLibrary(scheme: Scheme): SavedScheme[] {
  const library = loadLibrary();
  // One entry per name: saving again under the same name overwrites.
  const existing = library.findIndex(
    (e) => e.scheme.name.toLowerCase() === scheme.name.toLowerCase()
  );
  const entry: SavedScheme = {
    id: existing >= 0 ? library[existing].id : crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    scheme,
  };
  if (existing >= 0) library[existing] = entry;
  else library.unshift(entry);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  return library;
}

export function deleteFromLibrary(id: string): SavedScheme[] {
  const library = loadLibrary().filter((e) => e.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  return library;
}

export function exportScheme(scheme: Scheme): void {
  const blob = new Blob([JSON.stringify(scheme, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scheme.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "scheme"}.vargvox.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importSchemeFile(file: File): Promise<Scheme> {
  return file.text().then((text) => sanitizeScheme(JSON.parse(text)));
}
