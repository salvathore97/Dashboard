import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import { runMigrations } from './migrations.js';

const DB_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DB_DIR, 'dashboard.sqlite');

export interface ServiceRecord {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  icon: string;
  tags: string; // JSON array string
  status: 'online' | 'offline' | 'degraded' | 'checking';
  last_status_code: number;
  last_response_time_ms: number;
  last_checked_at: string;
  uptime_percentage: number;
  total_checks: number;
  successful_checks: number;
  created_at: string;
  user_id: string;
  history?: CheckHistoryRecord[];
}

export interface CheckHistoryRecord {
  id: string;
  service_id: string;
  status: string;
  status_code: number;
  response_time_ms: number;
  checked_at: string;
  error_message?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
}

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'demo' | 'user';
  created_at: string;
}

class DashboardDatabase {
  private db: SqlDatabase | null = null;
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      try {
        const fileBuffer = fs.readFileSync(DB_PATH);
        this.db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error('Failed to load existing SQLite database, creating new:', err);
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }

    runMigrations(this.db);
    this.seedDefaultData();
    this.persist();
    this.isInitialized = true;
  }

  public persist() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Error persisting SQLite to disk:', err);
    }
  }

  private seedDefaultData() {
    if (!this.db) return;
    const now = new Date().toISOString();

    // 1. Ensure configured admin user exists in users table so login never fails
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    this.upsertUser(adminUser, adminPass, 'admin');

    // Also sync additional users from env if present
    if (process.env.ADDITIONAL_USERS) {
      try {
        const raw = process.env.ADDITIONAL_USERS.trim();
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          for (const [u, p] of Object.entries(parsed)) {
            if (u && p) this.upsertUser(u.trim(), String(p).trim(), 'user' as any);
          }
        } else {
          raw.split(',').forEach((pair) => {
            const [u, p] = pair.split(':');
            if (u && p) this.upsertUser(u.trim(), p.trim(), 'user' as any);
          });
        }
      } catch (err) {
        console.error('[SQLite] Error syncing additional users to SQLite:', err);
      }
    }

    // 2. Ensure Master API key exists
    const keysRes = this.db.exec("SELECT COUNT(*) as count FROM api_keys");
    const keyCount = (keysRes[0]?.values[0]?.[0] as number) || 0;
    if (keyCount === 0) {
      this.db.run(
        `INSERT INTO api_keys (id, name, key, created_at) VALUES (?, ?, ?, ?)`,
        ['key-1', 'Hermes Agent Master Key', 'hermes_sk_live_99f381ad792e4c81a', now]
      );
    }

    // 3. Demo services: ONLY seeded if SEED_DEMO_DATA === 'true'
    // In production / Coolify, this is false by default so the tables remain completely clean and empty!
    const shouldSeedDemo = process.env.SEED_DEMO_DATA === 'true';
    if (shouldSeedDemo) {
      const res = this.db.exec("SELECT COUNT(*) as count FROM services");
      const count = (res[0]?.values[0]?.[0] as number) || 0;
      if (count === 0) {
        this.seedDemoServices(now);
      }
    }
  }

  public clearAllServices(): void {
    if (!this.db) return;
    this.db.run("DELETE FROM check_history");
    this.db.run("DELETE FROM services");
    this.persist();
  }

  public seedDemoServices(now: string = new Date().toISOString()) {
    if (!this.db) return;
    const defaultServices = [
      {
        id: 'srv-1',
        name: 'GitHub API & Repos',
        url: 'https://api.github.com',
        category: 'Dev Tools',
        description: 'Control de versiones, repositorios de código y CI/CD actions.',
        icon: 'git-branch',
        tags: JSON.stringify(['git', 'vcs', 'api']),
        status: 'online',
        last_status_code: 200,
        last_response_time_ms: 120,
        uptime_percentage: 99.9,
        total_checks: 120,
        successful_checks: 120,
      },
      {
        id: 'srv-2',
        name: 'Google AI Studio',
        url: 'https://aistudio.google.com',
        category: 'AI / LLM',
        description: 'Plataforma para prototipado y experimentación con modelos Gemini.',
        icon: 'cpu',
        tags: JSON.stringify(['gemini', 'ia', 'cloud']),
        status: 'online',
        last_status_code: 200,
        last_response_time_ms: 95,
        uptime_percentage: 100.0,
        total_checks: 105,
        successful_checks: 105,
      },
      {
        id: 'srv-3',
        name: 'Hugging Face Hub',
        url: 'https://huggingface.co',
        category: 'AI / LLM',
        description: 'Modelos de código abierto, datasets y Spaces para Hermes Agent.',
        icon: 'bot',
        tags: JSON.stringify(['open-source', 'hermes', 'models']),
        status: 'online',
        last_status_code: 200,
        last_response_time_ms: 180,
        uptime_percentage: 99.7,
        total_checks: 98,
        successful_checks: 97,
      },
      {
        id: 'srv-4',
        name: 'Hermes Agent Gateway (Demo Mock)',
        url: 'https://httpbin.org/status/200',
        category: 'Agentes IA',
        description: 'Endpoint de orquestación y herramientas autónomas de Hermes Agent.',
        icon: 'sparkles',
        tags: JSON.stringify(['hermes', 'agent', 'automation']),
        status: 'online',
        last_status_code: 200,
        last_response_time_ms: 145,
        uptime_percentage: 100.0,
        total_checks: 80,
        successful_checks: 80,
      },
      {
        id: 'srv-5',
        name: 'Servidor Legacy Interno (Simulado Caído)',
        url: 'https://invalid-non-existent-subdomain-demo.org',
        category: 'Infraestructura',
        description: 'Demostración de estado caído (anillo rojo) para pruebas de alerta.',
        icon: 'server',
        tags: JSON.stringify(['legacy', 'internal', 'alerta']),
        status: 'offline',
        last_status_code: 503,
        last_response_time_ms: 0,
        uptime_percentage: 84.5,
        total_checks: 90,
        successful_checks: 76,
      },
      {
        id: 'srv-6',
        name: 'Cloudflare 1.1.1.1 Status',
        url: 'https://one.one.one.one',
        category: 'Red / DNS',
        description: 'Resolver DNS rápido y seguro de Cloudflare.',
        icon: 'shield',
        tags: JSON.stringify(['dns', 'security', 'cdn']),
        status: 'online',
        last_status_code: 200,
        last_response_time_ms: 45,
        uptime_percentage: 100.0,
        total_checks: 150,
        successful_checks: 150,
      }
    ];

    for (const s of defaultServices) {
      this.db.run(
        `INSERT INTO services (
          id, name, url, category, description, icon, tags, status,
          last_status_code, last_response_time_ms, last_checked_at,
          uptime_percentage, total_checks, successful_checks, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.name,
          s.url,
          s.category,
          s.description,
          s.icon,
          s.tags,
          s.status,
          s.last_status_code,
          s.last_response_time_ms,
          now,
          s.uptime_percentage,
          s.total_checks,
          s.successful_checks,
          now,
          'demo'
        ]
      );

      for (let i = 0; i < 10; i++) {
        const isFailed = s.status === 'offline' && i > 6;
        const latency = isFailed ? 0 : Math.max(30, s.last_response_time_ms + Math.floor(Math.random() * 40 - 20));
        const time = new Date(Date.now() - (10 - i) * 60000).toISOString();
        this.db.run(
          `INSERT INTO check_history (
            id, service_id, status, status_code, response_time_ms, checked_at, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            `hist-${s.id}-${i}`,
            s.id,
            isFailed ? 'offline' : 'online',
            isFailed ? 503 : 200,
            latency,
            time,
            isFailed ? 'Connection timeout' : null
          ]
        );
      }
    }
    this.persist();
  }

  public getUserByUsername(username: string): UserRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare("SELECT * FROM users WHERE username = ?");
    stmt.bind([username]);
    let result: UserRecord | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as UserRecord;
    }
    stmt.free();
    return result;
  }

  public upsertUser(username: string, passwordHash: string, role: 'admin' | 'demo' | 'user' = 'admin'): UserRecord {
    if (!this.db) throw new Error('Database not initialized');
    const existing = this.getUserByUsername(username);
    const now = new Date().toISOString();
    if (existing) {
      this.db.run("UPDATE users SET password_hash = ?, role = ? WHERE username = ?", [passwordHash, role, username]);
      this.persist();
      return { ...existing, password_hash: passwordHash, role };
    } else {
      const id = `usr-${Date.now()}`;
      this.db.run(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
        [id, username, passwordHash, role, now]
      );
      this.persist();
      return { id, username, password_hash: passwordHash, role, created_at: now };
    }
  }

  public getUsers(): Omit<UserRecord, 'password_hash'>[] {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at ASC");
    const results: Omit<UserRecord, 'password_hash'>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as Omit<UserRecord, 'password_hash'>);
    }
    stmt.free();
    return results;
  }

  public deleteUser(id: string): boolean {
    if (!this.db) return false;
    this.db.run("DELETE FROM users WHERE id = ?", [id]);
    this.persist();
    return true;
  }

  // Service CRUD operations
  public getServices(): ServiceRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT * FROM services ORDER BY created_at DESC");
    const results: ServiceRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as ServiceRecord);
    }
    stmt.free();

    // Attach last 15 history records to each service
    for (const s of results) {
      s.history = this.getServiceHistory(s.id, 15);
    }

    return results;
  }

  public getService(id: string): ServiceRecord | null {
    if (!this.db) return null;
    const stmt = this.db.prepare("SELECT * FROM services WHERE id = ?");
    stmt.bind([id]);
    let result: ServiceRecord | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as ServiceRecord;
      result.history = this.getServiceHistory(id, 20);
    }
    stmt.free();
    return result;
  }

  public addService(data: {
    name: string;
    url: string;
    category?: string;
    description?: string;
    icon?: string;
    tags?: string[];
    user_id?: string;
  }): ServiceRecord {
    if (!this.db) throw new Error('Database not initialized');
    const id = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const category = data.category || 'General';
    const description = data.description || '';
    const icon = data.icon || 'globe';
    const tags = JSON.stringify(data.tags || []);
    const userId = data.user_id || 'demo';

    this.db.run(
      `INSERT INTO services (
        id, name, url, category, description, icon, tags, status,
        last_status_code, last_response_time_ms, last_checked_at,
        uptime_percentage, total_checks, successful_checks, created_at, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'checking', 0, 0, ?, 100.0, 0, 0, ?, ?)`,
      [id, data.name, data.url, category, description, icon, tags, now, now, userId]
    );
    this.persist();
    return this.getService(id)!;
  }

  public updateService(id: string, updates: Partial<ServiceRecord>): boolean {
    if (!this.db) return false;
    const existing = this.getService(id);
    if (!existing) return false;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
    if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(updates.tags); }

    if (fields.length === 0) return true;

    values.push(id);
    this.db.run(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, values);
    this.persist();
    return true;
  }

  public deleteService(id: string): boolean {
    if (!this.db) return false;
    this.db.run("DELETE FROM check_history WHERE service_id = ?", [id]);
    this.db.run("DELETE FROM services WHERE id = ?", [id]);
    this.persist();
    return true;
  }

  public recordCheckResult(
    serviceId: string,
    result: {
      status: 'online' | 'offline' | 'degraded';
      statusCode: number;
      responseTimeMs: number;
      errorMessage?: string;
    }
  ): void {
    if (!this.db) return;
    const s = this.getService(serviceId);
    if (!s) return;

    const now = new Date().toISOString();
    const historyId = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Insert history
    this.db.run(
      `INSERT INTO check_history (
        id, service_id, status, status_code, response_time_ms, checked_at, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        serviceId,
        result.status,
        result.statusCode,
        result.responseTimeMs,
        now,
        result.errorMessage || null
      ]
    );

    // Keep history trimmed to last 50 per service
    this.db.run(
      `DELETE FROM check_history WHERE id IN (
        SELECT id FROM check_history WHERE service_id = ? ORDER BY checked_at DESC LIMIT -1 OFFSET 50
      )`,
      [serviceId]
    );

    const totalChecks = s.total_checks + 1;
    const successfulChecks = s.successful_checks + (result.status === 'online' || result.status === 'degraded' ? 1 : 0);
    const uptimePercentage = Number(((successfulChecks / totalChecks) * 100).toFixed(1));

    this.db.run(
      `UPDATE services SET
        status = ?,
        last_status_code = ?,
        last_response_time_ms = ?,
        last_checked_at = ?,
        uptime_percentage = ?,
        total_checks = ?,
        successful_checks = ?
      WHERE id = ?`,
      [
        result.status,
        result.statusCode,
        result.responseTimeMs,
        now,
        uptimePercentage,
        totalChecks,
        successfulChecks,
        serviceId
      ]
    );

    this.persist();
  }

  public getServiceHistory(serviceId: string, limit = 15): CheckHistoryRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare(
      "SELECT * FROM check_history WHERE service_id = ? ORDER BY checked_at DESC LIMIT ?"
    );
    stmt.bind([serviceId, limit]);
    const results: CheckHistoryRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as CheckHistoryRecord);
    }
    stmt.free();
    return results.reverse();
  }

  public getApiKeys(): ApiKeyRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare("SELECT * FROM api_keys ORDER BY created_at DESC");
    const results: ApiKeyRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as ApiKeyRecord);
    }
    stmt.free();
    return results;
  }

  public createApiKey(name: string): ApiKeyRecord {
    if (!this.db) throw new Error('Database not initialized');
    const id = `key-${Date.now()}`;
    const key = `hermes_sk_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO api_keys (id, name, key, created_at) VALUES (?, ?, ?, ?)`,
      [id, name, key, now]
    );
    this.persist();
    return { id, name, key, created_at: now };
  }

  public validateApiKey(key: string): boolean {
    if (!this.db) return false;
    const stmt = this.db.prepare("SELECT id FROM api_keys WHERE key = ?");
    stmt.bind([key]);
    const isValid = stmt.step();
    stmt.free();
    if (isValid) {
      this.db.run("UPDATE api_keys SET last_used_at = ? WHERE key = ?", [new Date().toISOString(), key]);
      this.persist();
    }
    return isValid;
  }

  public getStats() {
    const services = this.getServices();
    const total = services.length;
    const online = services.filter((s) => s.status === 'online').length;
    const offline = services.filter((s) => s.status === 'offline').length;
    const degraded = services.filter((s) => s.status === 'degraded').length;
    const checking = services.filter((s) => s.status === 'checking').length;

    const avgLatency =
      total > 0
        ? Math.round(
            services.reduce((acc, s) => acc + (s.last_response_time_ms || 0), 0) /
              Math.max(1, services.filter((s) => s.status !== 'offline').length)
          )
        : 0;

    const avgUptime =
      total > 0
        ? Number((services.reduce((acc, s) => acc + (s.uptime_percentage || 0), 0) / total).toFixed(1))
        : 100;

    return {
      total,
      online,
      offline,
      degraded,
      checking,
      avgLatency,
      avgUptime,
    };
  }

  public getIncidents(limit = 40): Array<{
    id: string;
    service_id: string;
    service_name: string;
    service_url: string;
    status: string;
    status_code: number;
    response_time_ms: number;
    checked_at: string;
    error_message?: string;
  }> {
    if (!this.db) return [];
    const stmt = this.db.prepare(`
      SELECT ch.*, s.name as service_name, s.url as service_url
      FROM check_history ch
      LEFT JOIN services s ON ch.service_id = s.id
      WHERE ch.status = 'offline' OR ch.status = 'degraded'
      ORDER BY ch.checked_at DESC
      LIMIT ?
    `);
    stmt.bind([limit]);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  public getDatabaseExport() {
    const services = this.getServices();
    const apiKeys = this.getApiKeys();
    const stats = this.getStats();
    return {
      timestamp: new Date().toISOString(),
      engine: 'SQLite 3 (sql.js)',
      databaseFile: 'data/dashboard.sqlite',
      stats,
      servicesCount: services.length,
      services,
      apiKeysCount: apiKeys.length,
      apiKeys,
    };
  }
}

export const db = new DashboardDatabase();
