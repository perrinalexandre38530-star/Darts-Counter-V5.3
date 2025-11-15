// ============================================
// src/lib/trainingStore.ts
// Store IndexedDB / localStorage pour le Training
// ============================================

import { nanoid } from "nanoid";
import type { TrainingHit, TrainingSession, TrainingMode } from "./trainingTypes";

// --- STORAGE SIMPLE (tu pourras le migrer sur IndexedDB plus tard) ---

const TRAINING_HITS_KEY = "dc_training_hits_v1";
const TRAINING_SESSIONS_KEY = "dc_training_sessions_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Liste complète (tu pourras optimiser avec de l'IDB si ça grossit)
function loadHits(): TrainingHit[] {
  return safeParse<TrainingHit[]>(localStorage.getItem(TRAINING_HITS_KEY), []);
}

function saveHits(list: TrainingHit[]) {
  localStorage.setItem(TRAINING_HITS_KEY, JSON.stringify(list));
}

function loadSessions(): TrainingSession[] {
  return safeParse<TrainingSession[]>(
    localStorage.getItem(TRAINING_SESSIONS_KEY),
    [],
  );
}

function saveSessions(list: TrainingSession[]) {
  localStorage.setItem(TRAINING_SESSIONS_KEY, JSON.stringify(list));
}

// --- API PUBLIQUE ---

export const TrainingStore = {
  startSession(
    mode: TrainingMode,
    profileId: string | null,
    target?: string,
  ): TrainingSession {
    const sessions = loadSessions();
    const session: TrainingSession = {
      id: nanoid(),
      profileId,
      mode,
      createdAt: Date.now(),
      finishedAt: null,
      totalDarts: 0,
      totalHits: 0,
      target,
    };
    sessions.push(session);
    saveSessions(sessions);
    return session;
  },

  finishSession(sessionId: string) {
    const sessions = loadSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index === -1) return;
    sessions[index] = {
      ...sessions[index],
      finishedAt: Date.now(),
    };
    saveSessions(sessions);
  },

  addHits(sessionId: string, hits: Omit<TrainingHit, "id" | "sessionId">[]) {
    const allHits = loadHits();
    const now = Date.now();

    const mapped: TrainingHit[] = hits.map((h) => ({
      ...h,
      id: nanoid(),
      sessionId,
      timestamp: now,
    }));

    allHits.push(...mapped);
    saveHits(allHits);

    // mettre à jour le résumé de session
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      const addedHits = mapped.filter((h) => h.isHit).length;
      sessions[idx] = {
        ...sessions[idx],
        totalDarts: sessions[idx].totalDarts + mapped.length,
        totalHits: sessions[idx].totalHits + addedHits,
      };
      saveSessions(sessions);
    }
  },

  // Pour l’écran d’évolution
  getSessionsForProfile(profileId: string | null): TrainingSession[] {
    return loadSessions()
      .filter((s) => s.profileId === profileId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  getHitsForProfile(profileId: string | null): TrainingHit[] {
    return loadHits()
      .filter((h) => h.profileId === profileId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  // Pour reset complet si besoin
  clearAll() {
    localStorage.removeItem(TRAINING_HITS_KEY);
    localStorage.removeItem(TRAINING_SESSIONS_KEY);
  },
};
