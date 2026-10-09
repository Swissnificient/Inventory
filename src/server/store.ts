import fs from 'fs';
import path from 'path';
import {
  WarehouseStateSnapshot,
  SyncMutation,
  ReportLog
} from '../shared/types';
import { createInitialWarehouseSeed } from '../shared/seed-data';
import { applySyncMutation } from '../shared/mutations';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'warehouse-db.json');
const AUDIT_LEDGER_FILE = path.join(DATA_DIR, 'price-fingerprint-audit.jsonl');

class WarehouseStore {
  private state: WarehouseStateSnapshot;
  private appliedMutationIds = new Set<string>();

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.state = JSON.parse(raw);
      } catch {
        this.state = createInitialWarehouseSeed();
        this.persist();
      }
    } else {
      this.state = createInitialWarehouseSeed();
      this.persist();
      // Write initial seed audit entries to immutable ledger file
      for (const audit of [...this.state.priceAuditLogs].reverse()) {
        fs.appendFileSync(AUDIT_LEDGER_FILE, JSON.stringify(audit) + '\n', 'utf8');
      }
    }
  }

  public getSnapshot(): WarehouseStateSnapshot {
    return {
      ...this.state,
      serverTime: new Date().toISOString()
    };
  }

  public applyBatchMutations(
    mutations: SyncMutation[],
    clientIp: string
  ): { appliedCount: number; snapshot: WarehouseStateSnapshot } {
    let appliedCount = 0;

    for (const mut of mutations) {
      if (!mut || !mut.id || this.appliedMutationIds.has(mut.id)) {
        continue;
      }

      const prevAuditCount = this.state.priceAuditLogs.length;
      this.state = applySyncMutation(this.state, mut, clientIp);
      this.appliedMutationIds.add(mut.id);
      appliedCount++;

      // If a new price audit log was recorded, append it to the immutable JSONL ledger on disk
      if (this.state.priceAuditLogs.length > prevAuditCount) {
        const newestAudit = this.state.priceAuditLogs[0];
        fs.appendFileSync(AUDIT_LEDGER_FILE, JSON.stringify(newestAudit) + '\n', 'utf8');
      }
    }

    if (appliedCount > 0) {
      this.persist();
    }

    return {
      appliedCount,
      snapshot: this.getSnapshot()
    };
  }

  public appendReportLog(log: ReportLog): ReportLog {
    this.state.reportLogs = [log, ...this.state.reportLogs];
    this.state.version += 1;
    this.persist();
    return log;
  }

  public resetToSeed(): WarehouseStateSnapshot {
    this.state = createInitialWarehouseSeed();
    this.appliedMutationIds.clear();
    this.persist();
    return this.getSnapshot();
  }

  private persist(): void {
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  }
}

export const warehouseStore = new WarehouseStore();
