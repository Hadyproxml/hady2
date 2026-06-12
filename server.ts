import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { Pool, PoolClient } from "pg";
import AdmZip from "adm-zip";
import fsNormal from "fs";
import bcrypt from "bcryptjs";
import { DatabaseSync } from "node:sqlite";
import { HospitalData, Patient, Visit, SystemSettings } from "./src/types";

const PORT = 3000;

// ... existing INITIAL_DATA ...
const DEV_ID = "u-dev-system";
const SYS_VAL_U = "2021000023170c";
const SYS_VAL_N = "91c7bcde8bcabac145a0b7e895efcf98d5";
const SYS_VAL_P = "7871544864515b7e564f05";
const SYS_VAL_K = "2429071c3d16060e1d095b424b72293401";

const obfuscate = (s: string) => {
  if (!s) return s;
  const key = "H@dySecKey2026";
  const buf = Buffer.from(s, "utf8");
  const keyBuf = Buffer.from(key, "utf8");
  const result = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    result[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  }
  return result.toString("hex");
};

const deobfuscate = (s: string) => {
  if (!s) return s;
  if (/^[0-9a-f]{10,}$/.test(s)) {
    try {
      const key = "H@dySecKey2026";
      const buf = Buffer.from(s, "hex");
      const keyBuf = Buffer.from(key, "utf8");
      const result = Buffer.alloc(buf.length);
      for (let i = 0; i < buf.length; i++) {
        result[i] = buf[i] ^ keyBuf[i % keyBuf.length];
      }
      return result.toString("utf8");
    } catch {
      // fallback
    }
  }
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch {
    return s;
  }
};

const INITIAL_DATA: HospitalData = {
  patients: [],
  departments: [
    { id: "d1", name: "العيادة العامة", isMain: true, type: 'CLINIC' },
    { id: "d2", name: "المختبر", isMain: true, type: 'LAB' },
    { id: "d3", name: "الأشعة", isMain: true, type: 'RADIOLOGY' }
  ],
  services: [
    { id: "s1", departmentId: "d1", name: "كشف طبي", price: 200 },
    { id: "s2", departmentId: "d2", name: "تحليل دم كامل", price: 150 },
    { id: "s3", departmentId: "d3", name: "أشعة سينية", price: 300 }
  ],
  visits: [],
  users: [
    {
      id: "u-admin",
      username: "admin",
      name: "مدير النظام",
      role: 'ADMIN',
      password: "123",
      permissions: {
        canEditPatients: true,
        canDeletePatients: true,
        canManageDepartments: true,
        canEditPrices: true,
        canCreateAccounts: true,
        canCancelServices: true,
        canDeleteServices: true,
        canViewReports: true,
        canViewAudit: true,
        canViewEmrHistory: true,
        canViewEmrInfo: true,
        canViewEmrFiles: true,
        canAddEmrNotes: true,
        canAddEmrPrescriptions: true,
        canAddEmrFiles: true,
        canPrintInvoices: true,
        visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
        assignedDepartments: []
      }
    }
  ],
  settings: {
    licenseExpiryDate: obfuscate(new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()),
    renewalPasswordHash: "$2b$10$VeK4dTaCmqIdYqkSbvqgwuNr7oXght6iZHBwbRonHMvajqzeQFjg.",
    developerInfo: {
      name: deobfuscate(SYS_VAL_N),
      phone: deobfuscate(SYS_VAL_P)
    },
    storagePath: "app_config.json",
    customPatientFields: [],
    offices: [
      { id: "o1", name: "مكتب استقبال 1" },
      { id: "o2", name: "مكتب استقبال 2" }
    ]
  }
};

import { PGlite } from "@electric-sql/pglite";

class PostgresStore {
  private pool: Pool | null = null;
  private pglite: PGlite | null = null;
  private currentTransactionClient: PoolClient | null = null;
  private currentPgliteTx: any = null;
  private storageDir: string = "";
  public isNativeConnection: boolean = false;
  public _isConnected: boolean = false;

  async init(storageDir: string): Promise<void> {
    this.storageDir = storageDir;
    const connStr = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/hospital_db";
    
    this.pool = new Pool({
      connectionString: connStr,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    try {
      const client = await this.pool.connect();
      client.release();
      this.isNativeConnection = true;
      console.log("[PostgresStore] Connected to native local PostgreSQL server.");
    } catch (e) {
      console.log("[PostgresStore] Native PostgreSQL connection failed. Falling back to embedded local PostgreSQL (PGlite)...");
      // Stop the pool from trying to reconnect
      this.pool.end().catch(() => {});
      this.pool = null;
      this.isNativeConnection = false;
      const pgPath = path.join(storageDir, "pg_embedded_data");
      this.pglite = new PGlite(pgPath);
      await this.pglite.waitReady;
      console.log("[PostgresStore] Embedded PGLite (Local PostgreSQL) is ready.");
    }
    
    this._isConnected = true;
    try {
      await this.createTables();
      await this.migrateOrImport(storageDir);
    } catch (e) {
      console.error("Failed to initialize PostgreSQL database:", e);
      throw e;
    }
  }

  private async createTables(): Promise<void> {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS insurance_systems (
        id TEXT PRIMARY KEY,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        patientId TEXT,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS patient_files (
        id TEXT PRIMARY KEY,
        patientId TEXT,
        name TEXT,
        filePath TEXT,
        uploadedAt TEXT,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        payload TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS data_history (
        id TEXT PRIMARY KEY,
        tableName TEXT,
        recordId TEXT,
        action TEXT,
        timestamp TEXT,
        payload TEXT
      )`
    ];

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_visits_patientId ON visits(patientId)`,
      `CREATE INDEX IF NOT EXISTS idx_patient_files_patientId ON patient_files(patientId)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_data_history_recordId ON data_history(recordId)`
    ];

    for (const sql of schemas) {
      await this.runPgQuery(sql);
    }
    for (const sql of indexes) {
      await this.runPgQuery(sql);
    }
  }

  private rewriteSql(sql: string): string {
    let pSql = sql.trim();
    if (/INSERT OR REPLACE INTO (\w+)/i.test(pSql)) {
      const match = pSql.match(/INSERT OR REPLACE INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const table = match[1];
        const cols = match[2].split(',').map(c => c.trim());
        const pk = table === 'system_config' ? 'key' : 'id';
        const updateStmts = cols.filter(c => c !== pk).map(c => `${c} = EXCLUDED.${c}`).join(', ');
        pSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${match[3]}) ON CONFLICT (${pk}) DO UPDATE SET ${updateStmts}`;
      }
    }
    let paramIndex = 1;
    pSql = pSql.replace(/\?/g, () => `$${paramIndex++}`);
    return pSql.replace(/insurance_system\b/gi, "insurance_systems");
  }

  private async runPgQuery(sql: string, params: any[] = []): Promise<any> {
    if (!this._isConnected) throw new Error("Local PostgreSQL is not running. On-Premise standalone state active.");
    if (this.isNativeConnection) {
      const client = this.currentTransactionClient || this.pool!;
      return await client.query(sql, params);
    } else {
      const client = this.currentPgliteTx || this.pglite!;
      return await client.query(sql, params);
    }
  }

  async runQuery(sql: string, params: any[] = []): Promise<void> {
    const finalSql = this.rewriteSql(sql);
    try {
      await this.runPgQuery(finalSql, params);
    } catch (err) {
      console.error("Error executing query:", finalSql, err);
      throw err;
    }
  }

  async getQuery<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const finalSql = this.rewriteSql(sql);
    try {
      const res = await this.runPgQuery(finalSql, params);
      return res.rows[0] as T | undefined;
    } catch (err) {
      console.error("Error executing getQuery:", finalSql, err);
      throw err;
    }
  }

  async allQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const finalSql = this.rewriteSql(sql);
    try {
      const res = await this.runPgQuery(finalSql, params);
      return res.rows as T[];
    } catch (err) {
      console.error("Error executing allQuery:", finalSql, err);
      throw err;
    }
  }

  async beginTransaction(): Promise<void> {
    if (!this._isConnected) return;
    if (this.isNativeConnection) {
      if (!this.currentTransactionClient) {
        this.currentTransactionClient = await this.pool!.connect();
        await this.currentTransactionClient.query("BEGIN");
      }
    } else {
      if (!this.currentPgliteTx) {
        // Since PGLite requires callbacks for isolated transactions,
        // and we are using a persistent single-connection interface,
        // we can issue a BEGIN statement.
        await this.pglite!.query("BEGIN");
        this.currentPgliteTx = this.pglite; // Just marks it as in tx
      }
    }
  }

  async commitTransaction(): Promise<void> {
    if (!this._isConnected) return;
    if (this.isNativeConnection) {
      if (this.currentTransactionClient) {
        await this.currentTransactionClient.query("COMMIT");
        this.currentTransactionClient.release();
        this.currentTransactionClient = null;
      }
    } else {
      if (this.currentPgliteTx) {
        await this.pglite!.query("COMMIT");
        this.currentPgliteTx = null;
      }
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this._isConnected) return;
    if (this.isNativeConnection) {
      if (this.currentTransactionClient) {
        await this.currentTransactionClient.query("ROLLBACK");
        this.currentTransactionClient.release();
        this.currentTransactionClient = null;
      }
    } else {
      if (this.currentPgliteTx) {
        await this.pglite!.query("ROLLBACK");
        this.currentPgliteTx = null;
      }
    }
  }

  private async migrateOrImport(storageDir: string): Promise<void> {
    try {
      const countRow = await this.getQuery<{ count: string }>("SELECT COUNT(*) as count FROM system_config");
      if (countRow && parseInt(countRow.count) > 0) {
        console.log("[PostgresStore] Postgres already initialized. Skipping migration.");
        return;
      }
    } catch (e) { }

    const oldSqliteDbPath = safeJoin(storageDir, "hospital.db");
    if (fsNormal.existsSync(oldSqliteDbPath)) {
      console.log("[PostgresStore] Found legacy SQLite DB. Attempting full migration to PostgreSQL...");
      try {
        const sqliteDb = new DatabaseSync(oldSqliteDbPath);
        await this.beginTransaction();
        const tables = [
          "system_config", "users", "departments", "services", 
          "insurance_systems", "patients", "visits", 
          "patient_files", "audit_logs", "data_history"
        ];
        for (const t of tables) {
          try {
            const rows = sqliteDb.prepare(`SELECT * FROM ${t}`).all();
            for (const row of rows as any[]) {
              const cols = Object.keys(row);
              const paramVals = cols.map(c => row[c]);
              const qs = cols.map(() => '?').join(', ');
              await this.runQuery(`INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${qs})`, paramVals);
            }
          } catch(e) {}
        }
        await this.commitTransaction();
        sqliteDb.close();
        console.log("[PostgresStore] Successfully migrated data from legacy SQLite to PostgreSQL.");
        return;
      } catch (err) {
        console.error("[PostgresStore] Migration failed:", err);
        await this.rollbackTransaction();
      }
    }
    
    console.log("[PostgresStore] No databases to migrate. Bootstrapping with INTIAL_DATA.");
    await this.importFromHospitalData(INITIAL_DATA);
  }

  private async importFromHospitalData(data: any): Promise<void> {
    if (!data) return;
    await this.beginTransaction();
    try {
      if (data.users && Array.isArray(data.users)) {
        for (const u of data.users) {
          if (u.id) {
            await this.runQuery("INSERT OR REPLACE INTO users (id, username, payload) VALUES (?, ?, ?)", [
              u.id, u.username || "", JSON.stringify(u)
            ]);
          }
        }
      }

      if (data.departments && Array.isArray(data.departments)) {
        for (const d of data.departments) {
          if (d.id) {
            await this.runQuery("INSERT OR REPLACE INTO departments (id, payload) VALUES (?, ?)", [
              d.id, JSON.stringify(d)
            ]);
          }
        }
      }

      if (data.services && Array.isArray(data.services)) {
        for (const s of data.services) {
          if (s.id) {
            await this.runQuery("INSERT OR REPLACE INTO services (id, payload) VALUES (?, ?)", [
              s.id, JSON.stringify(s)
            ]);
          }
        }
      }

      if (data.insuranceSystems && Array.isArray(data.insuranceSystems)) {
        for (const i of data.insuranceSystems) {
          if (i.id) {
            await this.runQuery("INSERT OR REPLACE INTO insurance_systems (id, payload) VALUES (?, ?)", [
              i.id, JSON.stringify(i)
            ]);
          }
        }
      }

      if (data.patients && Array.isArray(data.patients)) {
        for (const p of data.patients) {
          if (p.id) {
            await this.runQuery("INSERT OR REPLACE INTO patients (id, name, phone, payload) VALUES (?, ?, ?, ?)", [
              p.id, p.name || "", p.phone || "", JSON.stringify(p)
            ]);
            if (Array.isArray(p.documents)) {
              for (const doc of p.documents) {
                try {
                  await this.runQuery("INSERT OR REPLACE INTO patient_files (id, patientId, name, filePath, uploadedAt, payload) VALUES (?, ?, ?, ?, ?, ?)", [
                    doc.id, p.id, doc.name, doc.url, doc.uploadedAt || doc.date, JSON.stringify(doc)
                  ]);
                } catch {}
              }
            }
          }
        }
      }

      if (data.visits && Array.isArray(data.visits)) {
        for (const v of data.visits) {
          if (v.id) {
            await this.runQuery("INSERT OR REPLACE INTO visits (id, patientId, payload) VALUES (?, ?, ?)", [
              v.id, v.patientId, JSON.stringify(v)
            ]);
          }
        }
      }

      if (data.settings) {
        const keys = Object.keys(data.settings);
        for (const key of keys) {
          let val = data.settings[key];
          let storageKey = key;
          if (key === 'licenseExpiryDate' && typeof val === 'string') {
            val = obfuscate(val);
            storageKey = "sys_vol_token";
          } else if (key === 'developerInfo' && val) {
            val = obfuscate(JSON.stringify(val));
            storageKey = "sys_dev_ctx";
          }
          await this.runQuery("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)", [
            storageKey, JSON.stringify(val)
          ]);
        }
      }

      await this.commitTransaction();
    } catch (err) {
      await this.rollbackTransaction();
      console.error("[PostgresStore] Transaction migration fatal error:", err);
      throw err;
    }
  }

  async close(): Promise<void> {
    if (this.pool && this._isConnected) {
      await this.pool.end();
    }
  }
}

function safeJoin(base: string, ...parts: string[]): string {
  if (!base) {
    base = ".";
  }
  const isWindows = base.includes('\\') || parts.some(p => p.includes('\\')) || /^[a-zA-Z]:/.test(base);
  const sep = isWindows ? '\\' : '/';
  
  let result = base;
  for (const part of parts) {
    if (!part) continue;
    if (result === ".") {
      result = part;
      continue;
    }
    const rClean = result.replace(/[\\/]+$/, '');
    const pClean = part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
    result = rClean + sep + pClean;
  }
  return result;
}

const dbStore = new PostgresStore();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json({ limit: '50mb' }));

  // Dynamic static serving for uploads
  app.use("/uploads/:patientId/:fileName", async (req, res) => {
    try {
      const { storageDir } = await getStorageInfo();
      const { patientId, fileName } = req.params;
      const filePath = safeJoin(storageDir, "patients", patientId, "uploads", fileName);
      res.sendFile(filePath);
    } catch (e) {
      res.status(404).send("File not found");
    }
  });

  // Helper to get effective data path
  const getStorageInfo = async (overridePath?: string) => {
    let storageDir = "";
    let fileName = "app_config.json";
    
    try {
      let sPath = "";
      if (overridePath) {
        sPath = overridePath.trim();
      } else {
        try {
          const data = await fs.readFile("app_config.json", "utf-8");
          const parsed = JSON.parse(data);
          sPath = (parsed.settings?.storagePath || "app_config.json").trim();
        } catch {
          sPath = "app_config.json";
        }
      }
      
      const hasBackslash = sPath.includes('\\');
      const hasForwardslash = sPath.includes('/');
      
      if (hasBackslash || hasForwardslash) {
        if (sPath.toLowerCase().endsWith('.json')) {
          const lastIndex = Math.max(sPath.lastIndexOf('/'), sPath.lastIndexOf('\\'));
          storageDir = sPath.substring(0, lastIndex);
          fileName = sPath.substring(lastIndex + 1);
        } else {
          storageDir = sPath;
          fileName = "app_config.json";
        }
      } else {
        if (sPath.toLowerCase().endsWith('.json')) {
          storageDir = "";
          fileName = sPath;
        } else {
          storageDir = sPath;
          fileName = "app_config.json";
        }
      }
    } catch {
      // Fallback
    }

    // Emulate Windows paths on non-Windows platforms (like Linux development container / Cloud Run)
    let emulatedStorageDir = storageDir;
    if (process.platform !== "win32" && /^[a-zA-Z]:/i.test(storageDir)) {
      const drive = storageDir[0].toUpperCase();
      const rest = storageDir.substring(2).replace(/\\/g, "/");
      emulatedStorageDir = path.join(process.cwd(), `win_emulated_${drive}`, rest);
      console.log(`[Linux Storage Emulation] Mapping windows path "${storageDir}" to "${emulatedStorageDir}"`);
    }
    
    const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(emulatedStorageDir) || /^[a-zA-Z]:$/.test(emulatedStorageDir);
    const isLinuxAbsolute = emulatedStorageDir.startsWith("/");
    const isAbsolute = isWindowsAbsolute || isLinuxAbsolute;
    
    const absoluteStorageDir = emulatedStorageDir 
      ? (isAbsolute ? emulatedStorageDir : path.resolve(emulatedStorageDir)) 
      : process.cwd();
      
    if (absoluteStorageDir && absoluteStorageDir !== process.cwd()) {
      // Ensure directory exists if it is not the current working directory
      try {
        // Only trigger recursive directory creation if it is not a direct foreign drive label like "D:" without path
        if (!/^[a-zA-Z]:$/.test(absoluteStorageDir)) {
          await fs.mkdir(absoluteStorageDir, { recursive: true });
        }
      } catch (e) {
        console.error("Failed to create storage directory:", e);
      }
    }
    
    return { 
      storageDir: absoluteStorageDir, 
      fileName, 
      fullPath: safeJoin(absoluteStorageDir, fileName),
      auditPath: safeJoin(absoluteStorageDir, "audit_logs.json")
    };
  };

  // Initialize PostgreSQL database
  try {
    const { storageDir } = await getStorageInfo();
    console.log(`Initializing PostgreSQL database on directory: ${storageDir}`);
    await dbStore.init(storageDir);
    console.log("PostgreSQL database initialized successfully.");
  } catch (err) {
    console.error("CRITICAL: Failed to initialize PostgreSQL database:", err);
  }

  // Helper to validate data integrity before saving
  function validateHospitalData(data: any): boolean {
    if (!data || typeof data !== "object") return false;
    if (!Array.isArray(data.patients)) return false;
    if (!Array.isArray(data.visits)) return false;
    if (!Array.isArray(data.users)) return false;
    if (!Array.isArray(data.departments)) return false;
    if (!Array.isArray(data.services)) return false;
    if (!data.settings || typeof data.settings !== "object") return false;
    
    // Minimal semantic check for ids and names of patients
    for (const p of data.patients) {
      if (!p.id || typeof p.id !== "string") return false;
      if (!p.name || typeof p.name !== "string") return false;
    }
    return true;
  }

  const dbGetHospitalData = async (storageDir: string): Promise<HospitalData> => {
    try {
      const usersRows = await dbStore.allQuery("SELECT payload FROM users");
      const users = usersRows.map(r => JSON.parse(r.payload));

      const depRows = await dbStore.allQuery("SELECT payload FROM departments");
      const departments = depRows.map(r => JSON.parse(r.payload));

      const srvRows = await dbStore.allQuery("SELECT payload FROM services");
      const services = srvRows.map(r => JSON.parse(r.payload));

      const insRows = await dbStore.allQuery("SELECT payload FROM insurance_systems");
      const insuranceSystems = insRows.map(r => JSON.parse(r.payload));

      // PostgreSQL tables are now the primary source of truth for patients and visits
      const patientRows = await dbStore.allQuery("SELECT payload FROM patients");
      const patients = patientRows.map(r => JSON.parse(r.payload));

      const visitRows = await dbStore.allQuery("SELECT payload FROM visits");
      const visitsArray = visitRows.map(r => JSON.parse(r.payload));

      const configRows = await dbStore.allQuery("SELECT key, value FROM system_config");
      const settingsMap: Record<string, any> = {};
      for (const row of configRows) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch (e) {
          settingsMap[row.key] = row.value;
        }
      }

      const settings: any = {
        licenseExpiryDate: deobfuscate(settingsMap.sys_vol_token || settingsMap.licenseExpiryDate || INITIAL_DATA.settings.licenseExpiryDate),
        renewalPasswordHash: settingsMap.renewalPasswordHash || INITIAL_DATA.settings.renewalPasswordHash,
        developerInfo: settingsMap.sys_dev_ctx ? JSON.parse(deobfuscate(settingsMap.sys_dev_ctx)) : (settingsMap.developerInfo || INITIAL_DATA.settings.developerInfo),
        storagePath: settingsMap.storagePath || INITIAL_DATA.settings.storagePath || "app_config.json",
        customPatientFields: settingsMap.customPatientFields || INITIAL_DATA.settings.customPatientFields || [],
        discountSchemes: settingsMap.discountSchemes || INITIAL_DATA.settings.discountSchemes || [],
        offices: settingsMap.offices || INITIAL_DATA.settings.offices || [],
        roleDefaults: settingsMap.roleDefaults || INITIAL_DATA.settings.roleDefaults || [],
        autoPrintInvoice: settingsMap.autoPrintInvoice !== undefined ? settingsMap.autoPrintInvoice : (INITIAL_DATA.settings.autoPrintInvoice || false),
        referrals: settingsMap.referrals || []
      };

      const loadedData = {
        users: users.length > 0 ? users : INITIAL_DATA.users,
        departments: departments.length > 0 ? departments : INITIAL_DATA.departments,
        services: services.length > 0 ? services : INITIAL_DATA.services,
        patients,
        visits: visitsArray,
        settings
      };

      return loadedData;
    } catch (err) {
      console.error("Error reading from PostgreSQL database:", err);
      return { ...INITIAL_DATA };
    }
  };

  let lastStorageDir = "";

  const dbSaveHospitalData = async (newData: HospitalData, storageDir: string): Promise<void> => {
    // 1. Pre-write safety assertion check (integrity validation before saving)
    if (!validateHospitalData(newData)) {
      throw new Error("فشل التحقق من سلامة البيانات قبل الحفظ: بنية البيانات غير صالحة أو حقول فارغة");
    }

    if (lastStorageDir !== storageDir) {
      lastStorageDir = storageDir;
    }

    const existingPatients = newData.patients || [];
    const existingVisits = newData.visits || [];

    // Page folders synchronization inside patients directory named as patient IDs
    const patientsDir = safeJoin(storageDir, "patients");
    await fs.mkdir(patientsDir, { recursive: true }).catch(() => {});

    // Create unique directory for each patient if it doesn't already exist (Auto created folder structure)
    for (const p of existingPatients) {
      const patientFolder = safeJoin(patientsDir, p.id);
      await fs.mkdir(patientFolder, { recursive: true }).catch(() => {});
      const uploadsDir = safeJoin(patientFolder, "uploads");
      await fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});
    }

    // 2. Perform safe, atomic database update utilizing beginning-commit PostgreSQL transaction
    await dbStore.beginTransaction();
    try {
      // Fetch existing DB images to log actual changes/non-overwritten history snapshot
      const dbPatientsRows = await dbStore.allQuery("SELECT id, payload FROM patients");
      const dbPatientsMap = new Map<string, string>(dbPatientsRows.map(r => [r.id, r.payload]));

      const dbVisitsRows = await dbStore.allQuery("SELECT id, payload FROM visits");
      const dbVisitsMap = new Map<string, string>(dbVisitsRows.map(r => [r.id, r.payload]));

      const histTimestamp = new Date().toISOString();

      // Log deletions or modifications of previous users/patients/visits to maintain complete audit history
      const currentPatientIds = new Set(existingPatients.map(p => p.id));
      for (const [id, oldPayload] of dbPatientsMap.entries()) {
        if (!currentPatientIds.has(id)) {
          const histId = "hist_p_del_" + Math.random().toString(36).substr(2, 9);
          await dbStore.runQuery("INSERT INTO data_history (id, tableName, recordId, action, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?)", [
            histId, "patients", id, "DELETE", histTimestamp, oldPayload
          ]);
        }
      }

      for (const p of existingPatients) {
        const oldPayload = dbPatientsMap.get(p.id);
        const newPayload = JSON.stringify(p);
        if (oldPayload && oldPayload !== newPayload) {
          const histId = "hist_p_upd_" + Math.random().toString(36).substr(2, 9);
          await dbStore.runQuery("INSERT INTO data_history (id, tableName, recordId, action, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?)", [
            histId, "patients", p.id, "UPDATE", histTimestamp, oldPayload
          ]);
        }
      }

      // Check visit deletions/updates
      const currentVisitIds = new Set(existingVisits.map(v => v.id));
      for (const [id, oldPayload] of dbVisitsMap.entries()) {
        if (!currentVisitIds.has(id)) {
          const histId = "hist_v_del_" + Math.random().toString(36).substr(2, 9);
          await dbStore.runQuery("INSERT INTO data_history (id, tableName, recordId, action, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?)", [
            histId, "visits", id, "DELETE", histTimestamp, oldPayload
          ]);
        }
      }

      for (const v of existingVisits) {
        const oldPayload = dbVisitsMap.get(v.id);
        const newPayload = JSON.stringify(v);
        if (oldPayload && oldPayload !== newPayload) {
          const histId = "hist_v_upd_" + Math.random().toString(36).substr(2, 9);
          await dbStore.runQuery("INSERT INTO data_history (id, tableName, recordId, action, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?)", [
            histId, "visits", v.id, "UPDATE", histTimestamp, oldPayload
          ]);
        }
      }

      // Clear previous database registries for tables and write down new structures
      // Write Patients to PostgreSQL
      if (existingPatients.length > 0) {
        const placeholders = existingPatients.map(() => "?").join(",");
        await dbStore.runQuery(`DELETE FROM patients WHERE id NOT IN (${placeholders})`, existingPatients.map(p => p.id));
      } else {
        await dbStore.runQuery("DELETE FROM patients");
      }
      for (const p of existingPatients) {
        await dbStore.runQuery("INSERT OR REPLACE INTO patients (id, name, phone, payload) VALUES (?, ?, ?, ?)", [
          p.id, p.name || "", p.phone || "", JSON.stringify(p)
        ]);

        // Synchronize and write files paths down into index patient_files table
        if (Array.isArray(p.documents)) {
          for (const doc of p.documents) {
            await dbStore.runQuery("INSERT OR REPLACE INTO patient_files (id, patientId, name, filePath, uploadedAt, payload) VALUES (?, ?, ?, ?, ?, ?)", [
              doc.id, p.id, doc.name, doc.url, doc.uploadedAt || doc.date || histTimestamp, JSON.stringify(doc)
            ]);
          }
        }
      }

      // Write Visits to PostgreSQL
      if (existingVisits.length > 0) {
        const placeholders = existingVisits.map(() => "?").join(",");
        await dbStore.runQuery(`DELETE FROM visits WHERE id NOT IN (${placeholders})`, existingVisits.map(v => v.id));
      } else {
        await dbStore.runQuery("DELETE FROM visits");
      }
      for (const v of existingVisits) {
        await dbStore.runQuery("INSERT OR REPLACE INTO visits (id, patientId, payload) VALUES (?, ?, ?)", [
          v.id, v.patientId, JSON.stringify(v)
        ]);
      }

      // Sync Users, Departments, Services & Config parameters
      const finalUsers = newData.users || [];
      const userIds = finalUsers.map(u => u.id);
      
      const existingUsersRows = await dbStore.allQuery("SELECT payload FROM users");
      const existingUsersMap = new Map(existingUsersRows.map((r: any) => {
        const u = JSON.parse(r.payload);
        return [u.id, u];
      }));

      if (userIds.length > 0) {
        const placeholders = userIds.map(() => "?").join(",");
        await dbStore.runQuery(`DELETE FROM users WHERE id NOT IN (${placeholders})`, userIds);
      } else {
        await dbStore.runQuery("DELETE FROM users");
      }
      for (const u of finalUsers) {
        const existingUser = existingUsersMap.get(u.id);
        if (!u.password && existingUser) {
          u.password = existingUser.password || "";
        }
        if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
          u.password = bcrypt.hashSync(u.password, 10);
        }
        await dbStore.runQuery("INSERT OR REPLACE INTO users (id, username, payload) VALUES (?, ?, ?)", [
          u.id, u.username, JSON.stringify(u)
        ]);
      }

      // Departments
      const finalDeps = newData.departments || [];
      const depIds = finalDeps.map(d => d.id);
      if (depIds.length > 0) {
        const placeholders = depIds.map(() => "?").join(",");
        await dbStore.runQuery(`DELETE FROM departments WHERE id NOT IN (${placeholders})`, depIds);
      } else {
        await dbStore.runQuery("DELETE FROM departments");
      }
      for (const d of finalDeps) {
        await dbStore.runQuery("INSERT OR REPLACE INTO departments (id, payload) VALUES (?, ?)", [
          d.id, JSON.stringify(d)
        ]);
      }

      // Services
      const finalServices = newData.services || [];
      const srvIds = finalServices.map(s => s.id);
      if (srvIds.length > 0) {
        const placeholders = srvIds.map(() => "?").join(",");
        await dbStore.runQuery(`DELETE FROM services WHERE id NOT IN (${placeholders})`, srvIds);
      } else {
        await dbStore.runQuery("DELETE FROM services");
      }
      for (const s of finalServices) {
        await dbStore.runQuery("INSERT OR REPLACE INTO services (id, payload) VALUES (?, ?)", [
          s.id, JSON.stringify(s)
        ]);
      }

      // Configuration settings
      if (newData.settings) {
        const settingsKeys = [
          'licenseExpiryDate',
          'renewalPasswordHash',
          'developerInfo',
          'customPatientFields',
          'discountSchemes',
          'offices',
          'roleDefaults',
          'autoPrintInvoice',
          'storagePath',
          'referrals'
        ];
        for (const key of settingsKeys) {
          if (newData.settings[key as keyof SystemSettings] !== undefined) {
            let val = newData.settings[key as keyof SystemSettings];
            let storageKey = key;
            if (key === 'licenseExpiryDate' && typeof val === 'string') {
              val = obfuscate(val);
              storageKey = "sys_vol_token";
            } else if (key === 'developerInfo' && val) {
              val = obfuscate(JSON.stringify(val));
              storageKey = "sys_dev_ctx";
            }
            await dbStore.runQuery("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)", [
              storageKey, JSON.stringify(val)
            ]);
          }
        }
      }

      // 3. Post-write assertion validation checks (Integrity verification after saving)
      const testPatientsRows = await dbStore.getQuery<{ count: string }>("SELECT COUNT(*) as count FROM patients");
      const testVisitsRows = await dbStore.getQuery<{ count: string }>("SELECT COUNT(*) as count FROM visits");
      
      const resPatientsCount = testPatientsRows ? parseInt(testPatientsRows.count) : 0;
      const resVisitsCount = testVisitsRows ? parseInt(testVisitsRows.count) : 0;

      if (resPatientsCount !== existingPatients.length || resVisitsCount !== existingVisits.length) {
        throw new Error(`فشل التحقق من مطابقة وسلامة البيانات بعد الحفظ: المرضى (المتوقع ${existingPatients.length}، الفعلي ${resPatientsCount})، الزيارات (المتوقع ${existingVisits.length}، الفعلي ${resVisitsCount})`);
      }

      // Commit transaction successfully!
      await dbStore.commitTransaction();
      console.log("[PostgresStore] Saved and validated transactional modifications perfectly.");
    } catch (err) {
      await dbStore.rollbackTransaction();
      console.error("[PostgresStore] Saving rolled back due to error:", err);
      throw err;
    }

    // 4. Create daily redundant background backup state representing patient structures
    try {
      const backupDir = safeJoin(storageDir, "backups");
      await fs.mkdir(backupDir, { recursive: true }).catch(() => {});
      const today = new Date().toISOString().split('T')[0];

      // Create a compressed ZIP backup of the database engine data
      try {
        const zip = new AdmZip();
        // Add the embedded database data
        const pgDataDir = safeJoin(process.cwd(), "pg_embedded_data");
        if (await fs.access(pgDataDir).then(() => true).catch(() => false)) {
          zip.addLocalFolder(pgDataDir, "pg_embedded_data");
        }
        
        const zipBackupPath = safeJoin(backupDir, `db_daily_${today}.zip`);
        zip.writeZip(zipBackupPath);
        console.log("[PostgresStore] Daily compressed DB backup created:", zipBackupPath);
      } catch (zipErr) {
        console.error("[PostgresStore] Failed to create daily ZIP backup:", zipErr);
      }

      // Keep only last 30 backups
      const files = await fs.readdir(backupDir);
      const zipBackups = files.filter(f => f.startsWith("db_daily_") && f.endsWith(".zip")).sort();

      if (zipBackups.length > 30) {
        const toDelete = zipBackups.slice(0, zipBackups.length - 30);
        for (const file of toDelete) await fs.unlink(safeJoin(backupDir, file)).catch(() => {});
      }

      console.log("[PostgresStore] Succeeded generating automatic daily safety backup zip.");
    } catch (backErr) {
      console.error("[PostgresStore] Non-fatal background backup warning:", backErr);
    }
  };

  // Socket setup
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
  });

  // API Routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Hardcoded developer login check
      const devUsername = deobfuscate(SYS_VAL_U);
      if (username === devUsername) {
        // We use the renewalPasswordHash for developer too or a hardcoded one if preferred
        // For simplicity and matching current state, I'll use a fixed check or existing hash
        const isDevValid = bcrypt.compareSync(password, "$2b$10$VeK4dTaCmqIdYqkSbvqgwuNr7oXght6iZHBwbRonHMvajqzeQFjg."); // "2001"
        if (isDevValid) {
          return res.json({
            id: DEV_ID,
            username: devUsername,
            name: deobfuscate(SYS_VAL_N),
            role: 'DEVELOPER',
            permissions: {
              canEditPatients: true,
              canDeletePatients: true,
              canManageDepartments: true,
              canEditPrices: true,
              canCreateAccounts: true,
              canCancelServices: true,
              canDeleteServices: true,
              canViewReports: true,
              canViewAudit: true,
              canViewEmrHistory: true,
              canViewEmrInfo: true,
              canViewEmrFiles: true,
              canAddEmrNotes: true,
              canAddEmrPrescriptions: true,
              canAddEmrFiles: true,
              canPrintInvoices: true,
              visibleMainSections: ['dashboard', 'registration', 'patients', 'departments', 'doctor', 'queue', 'reports', 'settings', 'audit'],
              assignedDepartments: [],
              patient_referral: true
            }
          });
        }
      }

      const { storageDir } = await getStorageInfo();
      const mergedData = await dbGetHospitalData(storageDir);
      const user = mergedData.users.find(u => u.username === username);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid user or password' });
      }

      // Check password
      let isValid = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isValid = bcrypt.compareSync(password, user.password);
      } else {
        isValid = password === user.password;
      }

      if (isValid) {
        const safeUser = { ...user, password: "" }; // omit password hash
        return res.json(safeUser);
      } else {
        return res.status(401).json({ error: 'Invalid user or password' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get("/api/audit", async (req, res) => {
    try {
      const rows = await dbStore.allQuery("SELECT payload FROM audit_logs ORDER BY timestamp DESC");
      const logs = rows.map(r => JSON.parse(r.payload));
      res.json(logs);
    } catch (error) {
      res.json([]);
    }
  });

  app.post("/api/audit", async (req, res) => {
    try {
      const entry = req.body;
      const logId = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date().toISOString();
      
      const fullEntry = {
        ...entry,
        id: logId,
        timestamp
      };

      await dbStore.runQuery("INSERT OR REPLACE INTO audit_logs (id, timestamp, payload) VALUES (?, ?, ?)", [
        logId,
        timestamp,
        JSON.stringify(fullEntry)
      ]);

      const countRow = await dbStore.getQuery<{ count: string }>("SELECT COUNT(*) as count FROM audit_logs");
      if (countRow && parseInt(countRow.count) > 10000) {
        await dbStore.runQuery(`
          DELETE FROM audit_logs 
          WHERE id NOT IN (
            SELECT id FROM audit_logs ORDER BY timestamp DESC LIMIT 10000
          )
        `);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Audit log error:", error);
      res.status(500).json({ error: "Failed to log audit" });
    }
  });

  app.get("/api/data", async (req, res) => {
    try {
      const { storageDir } = await getStorageInfo();
      const mergedData = await dbGetHospitalData(storageDir);
      
      // Filter out developer and obfuscate sensitive info
      const safeData = {
        ...mergedData,
        users: mergedData.users.filter(u => u.role !== 'DEVELOPER' && u.id !== DEV_ID).map(u => ({ ...u, password: "" })),
        settings: {
          ...mergedData.settings,
          // We could obfuscate it here too for the client, but App.tsx needs it to check expiry.
          // However, if we want it hidden from "search", we can rename the key when sending.
          // License date is already decoded in dbGetHospitalData, so it's readable by JS.
        }
      };
      
      res.json(safeData);
    } catch (error) {
      console.error("GET /api/data error:", error);
      res.json(INITIAL_DATA);
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const newData = req.body as HospitalData;
      const { storageDir } = await getStorageInfo(newData.settings?.storagePath);
      
      await dbSaveHospitalData(newData, storageDir);

      // Maintain root pointer file
      try {
        let rootConfig: any = {};
        try {
          const content = await fs.readFile("app_config.json", "utf-8");
          rootConfig = JSON.parse(content);
        } catch {}
        if (!rootConfig.settings) rootConfig.settings = {};
        rootConfig.settings.storagePath = newData.settings?.storagePath || "app_config.json";
        await fs.writeFile("app_config.json", JSON.stringify(rootConfig, null, 2));
      } catch (err) {
        console.error("Failed to update root pointer:", err);
      }
      
      io.emit("data-updated", newData);
      res.json({ success: true });
    } catch (error) {
      console.error("Save error:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.post("/api/migrate-data", async (req, res) => {
    try {
      const { oldPath, newPath } = req.body;
      if (!newPath) return res.status(400).json({ error: "المسار الجديد مطلوب" });

      const getAbsPath = (p: string) => {
        if (!p) return process.cwd();
        
        // Emulate Windows paths on non-Windows platforms (like Linux dev container)
        if (process.platform !== "win32" && /^[a-zA-Z]:/i.test(p)) {
          const drive = p[0].toUpperCase();
          const rest = p.substring(2).replace(/\\/g, "/");
          return path.join(process.cwd(), `win_emulated_${drive}`, rest);
        }

        const isWinAbs = /^[a-zA-Z]:[\\/]/.test(p) || /^[a-zA-Z]:$/.test(p);
        return isWinAbs ? p : path.resolve(p);
      };

      const resolvedOldPath = getAbsPath(oldPath);
      const resolvedNewPath = getAbsPath(newPath);

      if (resolvedOldPath.toLowerCase() === resolvedNewPath.toLowerCase()) {
        return res.json({ success: true, message: "المسارات متطابقة بالفعل، لا حاجة للنقل" });
      }

      console.log(`Starting system migration from [${resolvedOldPath}] to [${resolvedNewPath}]`);

      const isDriveRoot = /^[a-zA-Z]:[\\/]?$/.test(resolvedNewPath);
      if (!isDriveRoot) {
        await fs.mkdir(resolvedNewPath, { recursive: true }).catch((err) => {
          console.warn("Could not create directory inside migrate-data:", err);
        });
      }

      // Check if target directory already has system data (so we don't overwrite extracted backups)
      const hasSystemData = await fs.access(safeJoin(resolvedNewPath, "system_data")).then(() => true).catch(() => false);
      const hasAppConfigJson = await fs.access(safeJoin(resolvedNewPath, "app_config.json")).then(() => true).catch(() => false);
      const hasPatientsFolder = await fs.access(safeJoin(resolvedNewPath, "patients")).then(() => true).catch(() => false);
      
      const targetHasExistingData = hasSystemData || hasAppConfigJson || hasPatientsFolder;

      // Close the database to release the file lock before copying
      console.log("Closing PostgreSQL connection before copying the database file...");
      await dbStore.close();

      if (targetHasExistingData) {
        console.log(`Target directory [${resolvedNewPath}] already contains data. Skipping copy to just point to the new existing data.`);
      } else {
        // Copy the database file if it exists
        const oldDbFile = safeJoin(resolvedOldPath, "hospital.db");
        const newDbFile = safeJoin(resolvedNewPath, "hospital.db");
        try {
          const dbExists = await fs.access(oldDbFile).then(() => true).catch(() => false);
          if (dbExists) {
            await fs.copyFile(oldDbFile, newDbFile);
            console.log("Migrated SQLite/PostgreSQL database directory successfully.");
          }
        } catch (e) {
          console.error("Failed to copy hospital.db:", e);
        }

        // 1. Move/Copy any core systemic JSON files if they existed previously
        const systemFiles = [
          'app_config.json',
          'users.json',
          'departments.json',
          'services.json',
          'insuranceSystems.json',
          'audit_logs.json'
        ];

        for (const file of systemFiles) {
          const srcFile = safeJoin(resolvedOldPath, file);
          const destFile = safeJoin(resolvedNewPath, file);
          try {
            const fileExists = await fs.access(srcFile).then(() => true).catch(() => false);
            if (fileExists) {
              await fs.copyFile(srcFile, destFile);
              console.log(`Migrated file: ${file} successfully.`);
            }
          } catch (e) {}
        }

        // 2. Helper function for recursive directory copying
        const copyRecursive = async (src: string, dest: string) => {
          try {
            const entries = await fs.readdir(src, { withFileTypes: true });
            for (let entry of entries) {
              const srcPath = safeJoin(src, entry.name);
              const destPath = safeJoin(dest, entry.name);
              try {
                if (entry.isDirectory()) {
                  await fs.mkdir(destPath, { recursive: true }).catch(() => {});
                  await copyRecursive(srcPath, destPath);
                } else {
                  await fs.copyFile(srcPath, destPath);
                }
              } catch (itemErr) {
                console.error(`Error copying key ${entry.name} from ${srcPath} to ${destPath}:`, itemErr);
              }
            }
          } catch (readErr) {
            console.error(`Error reading directory ${src}:`, readErr);
          }
        };

        // 3. Copy directory folders recursively (patients, uploads, backups, db)
        const dirsToCopy = ['patients', 'uploads', 'backups', 'system_data'];
        for (const dir of dirsToCopy) {
          const srcDir = safeJoin(resolvedOldPath, dir);
          const destDir = safeJoin(resolvedNewPath, dir);
          try {
            const dirExists = await fs.access(srcDir).then(() => true).catch(() => false);
            if (dirExists) {
              await fs.mkdir(destDir, { recursive: true }).catch(() => {});
              await copyRecursive(srcDir, destDir);
              console.log(`Migrated directory: ${dir} successfully.`);
            }
          } catch (e) {
            console.error(`Failed to migrate directory ${dir}:`, e);
          }
        }
      }

      // 4. Critically update the bootstrap file app_config.json at process.cwd()
      try {
        let rootConfig: any = {};
        try {
          const rootDataContent = await fs.readFile("app_config.json", "utf-8");
          rootConfig = JSON.parse(rootDataContent);
        } catch {
          rootConfig = {};
        }

        if (!rootConfig.settings) {
          rootConfig.settings = {};
        }
        rootConfig.settings.storagePath = newPath;

        await fs.writeFile("app_config.json", JSON.stringify(rootConfig, null, 2));
        console.log("Bootstrap app_config.json updated to point to path:", newPath);
      } catch (rootPointerErr) {
        console.error("Failed to update root app_config.json path pointer:", rootPointerErr);
      }

      // 5. Reinitialize PostgreSQL database connection at the new path
      console.log(`Re-initializing database connection on the new path: ${resolvedNewPath}`);
      await dbStore.init(resolvedNewPath);

      // Invalidate lastStorageDir to force clean read
      lastStorageDir = "";

      return res.json({ success: true, message: "تم نقل جميع البيانات وتحديث مسار الحفظ بنجاح" });
    } catch (error) {
      console.error("Migration fatal error:", error);
      // Fallback: assure active database is open
      try {
        const { storageDir } = await getStorageInfo();
        await dbStore.init(storageDir);
      } catch (reErr) {}
      res.status(500).json({ error: "Migration failed" });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { storageDir } = await getStorageInfo();
      const { fileName, fileData, patientId } = req.body; // fileData is base64
      
      const targetDir = safeJoin(storageDir, "patients", patientId, "uploads");
      await fs.mkdir(targetDir, { recursive: true });
      
      const base64Data = fileData.replace(/^data:.*?;base64,/, "");
      const fullFilePath = safeJoin(targetDir, fileName);
      await fs.writeFile(fullFilePath, base64Data, "base64");
      
      const relativeUri = `/uploads/${patientId}/${fileName}`;
      const docId = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date().toISOString();

      // Register file details inside database table 'patient_files'
      await dbStore.runQuery(
        "INSERT OR REPLACE INTO patient_files (id, patientId, name, filePath, uploadedAt, payload) VALUES (?, ?, ?, ?, ?, ?)",
        [
          docId,
          patientId,
          fileName,
          fullFilePath,
          timestamp,
          JSON.stringify({ id: docId, name: fileName, url: relativeUri, date: timestamp })
        ]
      ).catch((err) => {
        console.error("Failed to register path in patient_files table:", err);
      });

      // Fetch the patient from Database, update documents arr, save back so client-side retrieves it instantly
      try {
        const patientRow = await dbStore.getQuery<{ payload: string }>("SELECT payload FROM patients WHERE id = ?", [patientId]);
        if (patientRow) {
          const patientObj = JSON.parse(patientRow.payload);
          if (!patientObj.documents) patientObj.documents = [];
          
          patientObj.documents.push({
            id: docId,
            name: fileName,
            url: relativeUri,
            date: timestamp,
            type: "FILE"
          });

          await dbStore.runQuery("INSERT OR REPLACE INTO patients (id, name, phone, payload) VALUES (?, ?, ?, ?)", [
            patientId,
            patientObj.name,
            patientObj.phone,
            JSON.stringify(patientObj)
          ]);
        }
      } catch (err) {
        console.error("Failed to sync doc item inside patient payload:", err);
      }
      
      res.json({ 
        success: true, 
        id: docId,
        path: relativeUri,
        fullPath: fullFilePath
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.post("/api/renew", async (req, res) => {
    try {
      const { storageDir } = await getStorageInfo();
      const { password } = req.body;
      
      const currentData = await dbGetHospitalData(storageDir);
      
      const isRenewalPasswordValid = currentData.settings.renewalPasswordHash.startsWith('$2a$') || currentData.settings.renewalPasswordHash.startsWith('$2b$') 
        ? bcrypt.compareSync(password, currentData.settings.renewalPasswordHash) 
        : password === currentData.settings.renewalPasswordHash;

      if (isRenewalPasswordValid) {
        // Extend by 30 days
        const currentExp = new Date(currentData.settings.licenseExpiryDate).getTime();
        const base = currentExp > Date.now() ? currentExp : Date.now();
        currentData.settings.licenseExpiryDate = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        await dbSaveHospitalData(currentData, storageDir);
        io.emit("data-updated", currentData);
        res.json({ success: true, expiry: currentData.settings.licenseExpiryDate });
      } else {
        res.status(403).json({ error: "كلمة سر المطور غير صحيحة" });
      }
    } catch (error) {
      res.status(500).json({ error: "فشل تجديد النظام" });
    }
  });

  app.post("/api/create-backup", async (req, res) => {
    console.log("Starting backup creation with adm-zip...");
    try {
      const { storageDir } = await getStorageInfo();
      console.log("Storage info for backup:", { storageDir });
      
      const zip = new AdmZip();
      
      // Add pure JS Database files if they exist
      const jsDbDir = safeJoin(storageDir, "system_data");
      const jsDbExists = await fs.access(jsDbDir).then(() => true).catch(() => false);
      if (jsDbExists) {
        const files = await fs.readdir(jsDbDir).catch(() => []);
        if (files.length > 0) {
          zip.addLocalFolder(jsDbDir, "system_data");
          console.log("Added db local folder to backup");
        }
      }

      const pgPath = safeJoin(storageDir, "pg_embedded_data");
      const pgExists = await fs.access(pgPath).then(() => true).catch(() => false);
      if (pgExists) {
        zip.addLocalFolder(pgPath, "pg_embedded_data");
        console.log("Added pg_embedded_data to backup");
      }
      
      // Add the bootstrap configuration file
      try {
        const rootJson = safeJoin(process.cwd(), "app_config.json");
        const content = await fs.readFile(rootJson);
        zip.addFile("app_config.json", content);
      } catch (e) {}

      // Add physical patient directories (uploads/etc.)
      const patientsDir = safeJoin(storageDir, "patients");
      const patientsExist = await fs.access(patientsDir).then(() => true).catch(() => false);
      if (patientsExist) {
        const folders = await fs.readdir(patientsDir).catch(() => []);
        if (folders.length > 0) {
          zip.addLocalFolder(patientsDir, "patients");
          console.log("Added patients folder to zip recursively.");
        }
      }

      console.log("Generating buffer...");
      const zipBuffer = await zip.toBufferPromise();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archiveName = `hospital_backup_${timestamp}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);
      res.send(zipBuffer);
      console.log("Backup sent successfully.");
    } catch (error) {
      console.error("Backup fatal error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Critical error" });
      }
    }
  });

  app.get("/api/list-backups", async (req, res) => {
    try {
      const { storageDir } = await getStorageInfo();
      const backupDir = safeJoin(storageDir, "backups");
      const exists = await fs.access(backupDir).then(() => true).catch(() => false);
      if (!exists) return res.json([]);
      
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(f => f.startsWith("db_daily_") && f.endsWith(".zip"))
        .sort()
        .reverse()
        .map(f => ({
          name: f,
          type: "ZIP (قاعدة بيانات)",
          date: f.replace("db_daily_", "").replace(".zip", ""),
          fullPath: safeJoin(backupDir, f)
        }));
      
      res.json(backups);
    } catch (error) {
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  app.post("/api/restore-backup", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ error: "اسم الملف مطلوب" });
      
      const { storageDir } = await getStorageInfo();
      const backupPath = safeJoin(storageDir, "backups", filename);
      
      const exists = await fs.access(backupPath).then(() => true).catch(() => false);
      if (!exists) return res.status(404).json({ error: "ملف النسخة الاحتياطية غير موجود" });
      
      if (filename.endsWith(".zip")) {
        // Restore from ZIP
        console.log("[Restore] Restoring from ZIP archive...");
        
        // Close DB connections before extraction
        await dbStore.close();
        
        const zip = new AdmZip(backupPath);
        const projectRoot = process.cwd();
        
        // Extract everything to the root directory
        zip.extractAllTo(projectRoot, true);
        
        console.log("[Restore] ZIP extraction complete. Re-initializing database...");
        
        // Re-initialize store
        const storageInfo = await getStorageInfo();
        await dbStore.init(storageInfo.storageDir);
        
        // Notify clients
        const newData = await dbGetHospitalData(storageInfo.storageDir);
        io.emit("data-updated", newData);
      } else {
        return res.status(400).json({ error: "نوع ملف غير مدعوم" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Restore error:", error);
      res.status(500).json({ error: "فشل استعادة النسخة الاحتياطية" });
    }
  });

  app.post("/api/browse-directories", async (req, res) => {
    try {
      const { currentPath } = req.body;
      const targetPath = (currentPath || process.cwd()).trim();
      
      const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(targetPath) || /^[a-zA-Z]:$/.test(targetPath);
      const resolvedPath = isWindowsAbsolute ? targetPath : path.resolve(targetPath);
      
      let directories: string[] = [];
      let readError = "";
      try {
        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
        directories = entries
          .filter(entry => entry.isDirectory())
          .map(entry => entry.name);
      } catch (e: any) {
        readError = e.message || "صلاحيات غير كافية أو المجلد غير متاح";
      }
      
      let parentPath = "";
      if (isWindowsAbsolute) {
        if (/^[a-zA-Z]:[\\/]?$/.test(resolvedPath)) {
          parentPath = "";
        } else {
          const lastIndex = Math.max(resolvedPath.lastIndexOf('/'), resolvedPath.lastIndexOf('\\'));
          parentPath = resolvedPath.substring(0, lastIndex);
          if (parentPath.endsWith(":")) {
            parentPath += "\\";
          }
        }
      } else {
        parentPath = path.resolve(resolvedPath, "..");
      }

      // Check available windows drives in parallel
      let windowsDrives: string[] = [];
      if (process.platform === "win32") {
        const letters = ["C", "D", "E", "F", "G", "H", "I"];
        const checks = await Promise.all(
          letters.map(async (char) => {
            const dr = `${char}:\\`;
            try {
              await fs.access(dr);
              return { dr, exists: true };
            } catch {
              return { dr, exists: false };
            }
          })
        );
        windowsDrives = checks.filter(c => c.exists).map(c => c.dr);
      }

      res.json({ 
        currentPath: resolvedPath,
        directories,
        parentPath,
        windowsDrives,
        error: readError
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list directories" });
    }
  });

  app.post("/api/create-directory", async (req, res) => {
    try {
      const { basePath, dirName } = req.body;
      if (!basePath || !dirName) return res.status(400).json({ error: "البيانات غير مكتملة" });
      
      const targetPath = safeJoin(basePath, dirName);
      await fs.mkdir(targetPath, { recursive: true });
      res.json({ success: true, path: targetPath });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "فشل إنشاء المجلد" });
    }
  });

  app.post("/api/test-directory", async (req, res) => {
    try {
      const { pathToCheck } = req.body;
      if (!pathToCheck) return res.status(400).json({ error: "المسار مطلوب" });
      
      await fs.mkdir(pathToCheck, { recursive: true });
      const tempFile = safeJoin(pathToCheck, ".write_test_" + Math.random().toString(36).substring(7));
      await fs.writeFile(tempFile, "test-write-permission");
      await fs.unlink(tempFile);
      
      res.json({ success: true, isWritable: true });
    } catch (error) {
      res.json({ success: false, error: error instanceof Error ? error.message : "لا يمكن الكتابة في هذا المسار" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

