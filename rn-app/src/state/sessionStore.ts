import {create} from 'zustand';

type SessionState = {
  isSynced: boolean;
  lastSyncAtEpochMs: number | null;
  setSynced: (isSynced: boolean) => void;
};

export const useSessionStore = create<SessionState>(set => ({
  isSynced: false,
  lastSyncAtEpochMs: null,
  setSynced: isSynced =>
    set({
      isSynced,
      lastSyncAtEpochMs: isSynced ? Date.now() : null,
    }),
}));
