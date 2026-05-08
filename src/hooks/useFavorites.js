/**
 * MacroForge — Favorites System
 *
 * Client-side favorites without accounts or backend.
 * Uses localStorage + custom events for cross-component sync.
 *
 * When a product is favorited in the modal, FavoritesList on the
 * home page updates automatically via the custom event.
 *
 * Storage: 'mf_favorites' → JSON array of product ID strings
 */

import { useState, useEffect, useCallback } from 'react';

const KEY   = 'mf_favorites';
const EVENT = 'mf:favorites';

// ── Pure helpers (no React) ───────────────────────────────────

function readSet() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}

function writeSet(s) {
  try { localStorage.setItem(KEY, JSON.stringify([...s])); }
  catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function getFavoriteIds() {
  return [...readSet()];
}

export function isFavoriteId(id) {
  return readSet().has(String(id));
}

// ── React hook ────────────────────────────────────────────────

export function useFavorites() {
  const [favs, setFavs] = useState(() => readSet());

  // Subscribe to changes from other components or tabs
  useEffect(() => {
    function sync() { setFavs(new Set(readSet())); }
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync); // cross-tab sync
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id) => {
    const next = readSet();
    const sid  = String(id);
    if (next.has(sid)) next.delete(sid);
    else               next.add(sid);
    writeSet(next);
    setFavs(new Set(next)); // optimistic local update
  }, []);

  return {
    favs,
    toggle,
    isFavorite: id => favs.has(String(id)),
    count:      favs.size,
  };
}
