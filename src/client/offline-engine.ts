import {
  WarehouseStateSnapshot,
  SyncMutation,
  SyncMutationType
} from '../shared/types';
import { createInitialWarehouseSeed } from '../shared/seed-data';
import { applySyncMutation } from '../shared/mutations';

const IDB_NAME = 'OgunleyeFMCGWarehouseDB';
const IDB_VERSION = 1;
const SNAPSHOT_KEY = 'fmcg_warehouse_snapshot_v1';
const OUTBOX_KEY = 'fmcg_warehouse_outbox_v1';
const SIMULATED_OFFLINE_KEY = 'fmcg_simulated_offline_v1';

export type NetworkHealth = 'ONLINE_FAST' | 'LOW_SIGNAL_SYNCING' | 'OFFLINE_LOCAL_MODE';

export interface OfflineEngineStatus {
  networkHealth: NetworkHealth;
  simulatedOffline: boolean;
  pendingOutboxCount: number;
  pendingMutations: SyncMutation[];
  lastSyncedAt: string | null;
  lastSyncLatencyMs: number | null;
  isSyncing: boolean;
}

type Listener = () => void;

class OfflineFirstWarehouseEngine {
  private state: WarehouseStateSnapshot;
  private outbox: SyncMutation[] = [];
  private simulatedOffline = false;
  private browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private lastSyncedAt: string | null = null;
  private lastSyncLatencyMs: number | null = null;
  private isSyncing = false;
  private listeners = new Set<Listener>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.state = this.loadInitialSnapshotSync();
    this.outbox = this.loadInitialOutboxSync();
    this.simulatedOffline = this.loadSimulatedOfflineSync();

    if (typeof window !== 'undefined') {
      this.initIndexedDB();
      window.addEventListener('online', () => {
        this.browserOnline = true;
        this.notify();
        this.syncNow();
      });
      window.addEventListener('offline', () => {
        this.browserOnline = false;
        this.notify();
      });

      // Initial pull/sync on boot
      setTimeout(() => {
        this.syncNow();
      }, 150);

      // Background adaptive sync every 8 seconds when online
      setInterval(() => {
        if (this.isEffectivelyOnline()) {
          if (this.outbox.length > 0) {
            this.syncNow();
          }
        }
      }, 8000);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  public getSnapshot(): WarehouseStateSnapshot {
    return this.state;
  }

  public getStatus(): OfflineEngineStatus {
    let networkHealth: NetworkHealth = 'ONLINE_FAST';
    if (!this.isEffectivelyOnline()) {
      networkHealth = 'OFFLINE_LOCAL_MODE';
    } else if (this.isSyncing || (this.lastSyncLatencyMs && this.lastSyncLatencyMs > 600)) {
      networkHealth = 'LOW_SIGNAL_SYNCING';
    }

    return {
      networkHealth,
      simulatedOffline: this.simulatedOffline,
      pendingOutboxCount: this.outbox.length,
      pendingMutations: [...this.outbox],
      lastSyncedAt: this.lastSyncedAt,
      lastSyncLatencyMs: this.lastSyncLatencyMs,
      isSyncing: this.isSyncing
    };
  }

  public isEffectivelyOnline(): boolean {
    return this.browserOnline && !this.simulatedOffline;
  }

  public setSimulatedOffline(offline: boolean): void {
    this.simulatedOffline = offline;
    try {
      localStorage.setItem(SIMULATED_OFFLINE_KEY, JSON.stringify(offline));
    } catch {}
    this.notify();
    if (!offline) {
      this.syncNow();
    }
  }

  public getDeviceFingerprint(deviceLabel: string): string {
    if (typeof navigator === 'undefined') return deviceLabel;
    const ua = navigator.userAgent;
    let browser = 'Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    const platform = navigator.platform || 'Terminal';
    return `${deviceLabel} • ${browser} / ${platform}`;
  }

  /**
   * 0ms Local-First Write:
   * Immediately updates in-memory state + IndexedDB + Outbox Queue,
   * then triggers non-blocking background sync if online.
   */
  public dispatchMutation(
    type: SyncMutationType,
    payload: any,
    user: { id: string; name: string; deviceLabel: string }
  ): SyncMutation {
    const mutation: SyncMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      deviceFingerprint: this.getDeviceFingerprint(user.deviceLabel),
      userId: user.id,
      userName: user.name
    };

    // 1. Apply optimistically in < 1ms
    this.state = applySyncMutation(
      this.state,
      mutation,
      this.isEffectivelyOnline() ? '102.89.43.105 (Live)' : '127.0.0.1 (Offline Local Cache)'
    );

    // 2. Append to persistent outbox queue
    this.outbox = [...this.outbox, mutation];
    this.persistLocalState();
    this.notify();

    // 3. Attempt background delta sync if online
    if (this.isEffectivelyOnline()) {
      this.syncNow();
    }

    return mutation;
  }

  public async syncNow(): Promise<boolean> {
    if (!this.isEffectivelyOnline() || this.isSyncing) {
      return false;
    }

    this.isSyncing = true;
    this.notify();
    const startMs = performance.now();

    try {
      if (this.outbox.length > 0) {
        const batchToSend = [...this.outbox];
        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutations: batchToSend })
        });

        if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);
        const data = await res.json();

        const sentIds = new Set(batchToSend.map(m => m.id));
        this.outbox = this.outbox.filter(m => !sentIds.has(m.id));
        if (data.snapshot) {
          // Re-apply any new mutations that happened while request was in flight
          let merged = data.snapshot as WarehouseStateSnapshot;
          for (const pending of this.outbox) {
            merged = applySyncMutation(merged, pending);
          }
          this.state = merged;
        }
      } else {
        const res = await fetch('/api/sync/pull');
        if (!res.ok) throw new Error(`Sync pull failed: ${res.status}`);
        const serverSnapshot = (await res.json()) as WarehouseStateSnapshot;

        let merged = serverSnapshot;
        for (const pending of this.outbox) {
          merged = applySyncMutation(merged, pending);
        }
        this.state = merged;
      }

      this.lastSyncLatencyMs = Math.max(1, Math.round(performance.now() - startMs));
      this.lastSyncedAt = new Date().toISOString();
      this.persistLocalState();
      this.isSyncing = false;
      this.notify();
      return true;
    } catch {
      this.isSyncing = false;
      this.notify();
      return false;
    }
  }

  public updateSnapshotFromServer(snapshot: WarehouseStateSnapshot): void {
    let merged = snapshot;
    for (const pending of this.outbox) {
      merged = applySyncMutation(merged, pending);
    }
    this.state = merged;
    this.persistLocalState();
    this.notify();
  }

  private loadInitialSnapshotSync(): WarehouseStateSnapshot {
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return createInitialWarehouseSeed();
  }

  private loadInitialOutboxSync(): SyncMutation[] {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private loadSimulatedOfflineSync(): boolean {
    try {
      const raw = localStorage.getItem(SIMULATED_OFFLINE_KEY);
      if (raw) return JSON.parse(raw) === true;
    } catch {}
    return false;
  }

  private persistLocalState(): void {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(this.state));
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(this.outbox));
    } catch {}
    this.saveToIndexedDB();
  }

  private initIndexedDB(): void {
    if (typeof indexedDB === 'undefined') return;
    this.dbPromise = new Promise(resolve => {
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv');
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          // Hydrate from IndexedDB if newer
          const tx = db.transaction('kv', 'readonly');
          const store = tx.objectStore('kv');
          const getSnap = store.get(SNAPSHOT_KEY);
          getSnap.onsuccess = () => {
            if (getSnap.result && getSnap.result.version > this.state.version) {
              this.state = getSnap.result;
              this.notify();
            }
          };
          resolve(db);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async saveToIndexedDB(): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    if (!db) return;
    try {
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      store.put(this.state, SNAPSHOT_KEY);
      store.put(this.outbox, OUTBOX_KEY);
    } catch {}
  }
}

export const offlineEngine = new OfflineFirstWarehouseEngine();
