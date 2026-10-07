import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { pingService, pingAllServices, startBackgroundMonitor } from './server/pinger.js';
import { processHermesChat, getHermesExternalToolSchema } from './server/hermes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
await db.init();

// Start background health checking monitor (every 60s)
startBackgroundMonitor(60000);

// Configurable admin credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ALLOW_DEMO = process.env.ALLOW_DEMO !== 'false';

// Helper to parse additional users from env: e.g. "user1:pass1,user2:pass2"
function getAdditionalUsers(): Record<string, string> {
  const usersEnv = process.env.ADDITIONAL_USERS || '';
  const result: Record<string, string> = {};
  if (!usersEnv) return result;
  try {
    // If JSON formatted: '{"alice":"pass123"}'
    if (usersEnv.trim().startsWith('{')) {
      return JSON.parse(usersEnv);
    }
    // If comma separated: 'alice:pass123,bob:pass456'
    usersEnv.split(',').forEach((pair) => {
      const [u, p] = pair.split(':');
      if (u && p) result[u.trim()] = p.trim();
    });
  } catch {
    // ignore parse errors
  }
  return result;
}

// ==================== AUTH ROUTES ====================
app.get('/api/auth/config', (_req: Request, res: Response) => {
  res.json({
    allowDemo: ALLOW_DEMO,
    defaultAdminUser: ADMIN_USERNAME,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    return;
  }

  const cleanUser = String(username).trim();
  const cleanPass = String(password).trim();

  // 1. Check primary environment admin
  if (cleanUser === ADMIN_USERNAME && cleanPass === ADMIN_PASSWORD) {
    res.json({
      success: true,
      user: {
        id: 'usr-admin',
        username: ADMIN_USERNAME,
        role: 'admin',
        isDemo: false,
      },
      token: 'jwt-admin-token-' + Date.now(),
    });
    return;
  }

  // 2. Check additional environment users
  const additionalUsers = getAdditionalUsers();
  if (additionalUsers[cleanUser] && additionalUsers[cleanUser] === cleanPass) {
    res.json({
      success: true,
      user: {
        id: `usr-${cleanUser}`,
        username: cleanUser,
        role: 'user',
        isDemo: false,
      },
      token: `jwt-${cleanUser}-token-` + Date.now(),
    });
    return;
  }

  // 3. Check SQLite stored user
  const dbUser = db.getUserByUsername(cleanUser);
  if (dbUser && dbUser.password_hash === cleanPass) {
    res.json({
      success: true,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        isDemo: false,
      },
      token: `jwt-${dbUser.username}-token-` + Date.now(),
    });
    return;
  }

  // 4. Check Demo mode if enabled
  if (ALLOW_DEMO && (cleanUser.toLowerCase() === 'demo' || cleanPass === 'demo')) {
    res.json({
      success: true,
      user: {
        id: 'usr-demo',
        username: cleanUser || 'demo_user',
        role: 'demo',
        isDemo: true,
      },
      token: 'jwt-demo-token-' + Date.now(),
    });
    return;
  }

  res.status(401).json({ error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' });
});

app.post('/api/auth/demo', (_req: Request, res: Response) => {
  if (!ALLOW_DEMO) {
    res.status(403).json({ error: 'El modo demo está deshabilitado en este entorno de producción.' });
    return;
  }
  res.json({
    success: true,
    user: {
      id: 'usr-demo-instant',
      username: 'Invitado Demo',
      role: 'demo',
      isDemo: true,
    },
    token: 'jwt-demo-instant-' + Date.now(),
  });
});

app.get('/api/users', (_req: Request, res: Response) => {
  res.json({
    success: true,
    users: db.getUsers(),
    defaultAdmin: ADMIN_USERNAME,
  });
});

app.post('/api/users', (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username y password requeridos' });
    return;
  }
  const cleanU = String(username).trim();
  const cleanP = String(password).trim();
  const newUser = db.upsertUser(cleanU, cleanP, role === 'admin' ? 'admin' : 'user');
  res.status(201).json({
    success: true,
    user: { id: newUser.id, username: newUser.username, role: newUser.role, created_at: newUser.created_at },
  });
});

// ==================== SERVICES & STATUS ROUTES ====================
app.get('/api/services', (_req: Request, res: Response) => {
  try {
    const services = db.getServices();
    res.json({ success: true, services });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al obtener servicios' });
  }
});

app.post('/api/services', async (req: Request, res: Response) => {
  try {
    const { name, url, category, description, icon, tags } = req.body;
    if (!name || !url) {
      res.status(400).json({ error: 'Nombre y URL son campos obligatorios' });
      return;
    }

    const newService = db.addService({
      name,
      url,
      category,
      description,
      icon,
      tags: Array.isArray(tags) ? tags : [],
    });

    // Run ping in background/immediate
    const pingResult = await pingService(newService);
    const updated = db.getService(newService.id);

    res.status(201).json({
      success: true,
      service: updated,
      initialPing: pingResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al guardar en SQLite' });
  }
});

app.put('/api/services/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = db.updateService(id, req.body);
    if (!ok) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    const updated = db.getService(id);
    res.json({ success: true, service: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.delete('/api/services/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = db.deleteService(id);
    if (!ok) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    res.json({ success: true, message: 'Servicio eliminado de SQLite' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.post('/api/services/:id/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = db.getService(id);
    if (!service) {
      res.status(404).json({ error: 'Servicio no encontrado' });
      return;
    }
    const result = await pingService(service);
    const updated = db.getService(id);
    res.json({ success: true, ping: result, service: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.post('/api/services/check-all', async (_req: Request, res: Response) => {
  try {
    const results = await pingAllServices();
    const services = db.getServices();
    const stats = db.getStats();
    res.json({ success: true, results, services, stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/stats', (_req: Request, res: Response) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Incidents history endpoint
app.get('/api/incidents', (_req: Request, res: Response) => {
  try {
    const incidents = db.getIncidents(50);
    res.json({ success: true, count: incidents.length, incidents });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error al obtener incidentes' });
  }
});

// HTTP Deep Inspector tool endpoint
app.post('/api/inspector/ping', async (req: Request, res: Response) => {
  const { url, method = 'GET' } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL es requerida' });
    return;
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(targetUrl, {
      method: method === 'HEAD' ? 'HEAD' : 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Hermes-Inspector-Tool/1.0 (+https://hermes-launchpad.local)',
        'Accept': '*/*',
      },
    });

    clearTimeout(timeoutId);
    const totalTime = Math.round(performance.now() - startTime);

    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const isSecure = targetUrl.startsWith('https://');

    res.json({
      success: true,
      url: targetUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs: totalTime,
      protocol: isSecure ? 'HTTPS (TLS 1.3/1.2)' : 'HTTP (Sin cifrar)',
      sslValid: isSecure,
      server: headersObj['server'] || 'No especificado',
      contentType: headersObj['content-type'] || 'No especificado',
      headers: headersObj,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const totalTime = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === 'AbortError';

    res.json({
      success: false,
      url: targetUrl,
      status: isTimeout ? 504 : 0,
      statusText: isTimeout ? 'Gateway Timeout' : 'Connection Failed',
      ok: false,
      durationMs: totalTime,
      protocol: targetUrl.startsWith('https://') ? 'HTTPS' : 'HTTP',
      sslValid: false,
      error: isTimeout ? 'Tiempo de espera agotado (> 8s)' : (err?.message || 'Error de conexión'),
      headers: {},
      timestamp: new Date().toISOString(),
    });
  }
});

// Database Export & Download
app.get('/api/database/export', (_req: Request, res: Response) => {
  try {
    const data = db.getDatabaseExport();
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/database/download', (_req: Request, res: Response) => {
  try {
    const dbFilePath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/dashboard.sqlite');
    if (fs.existsSync(dbFilePath)) {
      res.download(dbFilePath, 'hermes-dashboard-backup.sqlite');
    } else {
      res.status(404).json({ error: 'Archivo de base de datos no encontrado' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Wipe services (leaves tables empty as requested)
app.post('/api/database/wipe-services', (_req: Request, res: Response) => {
  try {
    db.clearAllServices();
    res.json({
      success: true,
      message: 'Base de datos SQLite limpiada con éxito. Las tablas están vacías.',
      services: [],
      stats: db.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Seed demo services on-demand
app.post('/api/database/seed-demo', (_req: Request, res: Response) => {
  try {
    db.seedDemoServices();
    res.json({
      success: true,
      message: 'Datos de demostración cargados en SQLite.',
      services: db.getServices(),
      stats: db.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ==================== HERMES AGENT ROUTES ====================
app.post('/api/hermes/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      res.status(400).json({ error: 'El mensaje para Hermes es requerido' });
      return;
    }

    const { reply, toolResults } = await processHermesChat(message, history || []);
    const updatedServices = db.getServices();
    const stats = db.getStats();

    res.json({
      success: true,
      reply,
      toolResults,
      services: updatedServices,
      stats,
    });
  } catch (err: any) {
    console.error('Hermes agent chat error:', err);
    res.status(500).json({ error: err?.message || 'Error en Hermes Agent' });
  }
});

// Hermes External Tool Schema for outside AI agents
app.get('/api/hermes/tools', (_req: Request, res: Response) => {
  res.json(getHermesExternalToolSchema());
});

// External Hermes API with API Key auth
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'] || req.headers['x-hermes-key'];
  let key = '';
  if (typeof authHeader === 'string') {
    key = authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  if (!key || !db.validateApiKey(key)) {
    // Also allow demo fallback key
    if (key !== 'hermes_sk_live_99f381ad792e4c81a') {
      res.status(401).json({ error: 'Clave de API Hermes inválida o no proporcionada' });
      return;
    }
  }
  next();
}

app.get('/api/hermes/v1/services', requireApiKey, (_req: Request, res: Response) => {
  const services = db.getServices();
  res.json({ success: true, count: services.length, services });
});

app.post('/api/hermes/v1/services', requireApiKey, async (req: Request, res: Response) => {
  const { name, url, category, description } = req.body;
  if (!name || !url) {
    res.status(400).json({ error: 'name y url requeridos' });
    return;
  }
  const s = db.addService({ name, url, category, description });
  const ping = await pingService(s);
  res.status(201).json({ success: true, service: db.getService(s.id), ping });
});

app.get('/api/hermes/v1/status', requireApiKey, (_req: Request, res: Response) => {
  res.json({ success: true, ...db.getStats() });
});

app.get('/api/keys', (_req: Request, res: Response) => {
  res.json({ success: true, keys: db.getApiKeys() });
});

app.post('/api/keys', (req: Request, res: Response) => {
  const { name } = req.body;
  const newKey = db.createApiKey(name || 'Hermes Integration Key');
  res.status(201).json({ success: true, key: newKey });
});

// ==================== FRONTEND SERVING (VITE / STATIC) ====================
const isProduction = process.env.NODE_ENV === 'production';
const distPath = path.resolve(process.cwd(), 'dist');

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Fallback to Vite if dist doesn't exist even in production
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hermes Status & URL Dashboard server running on port ${PORT}`);
});
