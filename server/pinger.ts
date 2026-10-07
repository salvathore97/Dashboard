import { db, ServiceRecord } from './db.js';

export interface PingResult {
  serviceId: string;
  status: 'online' | 'offline' | 'degraded';
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
  timestamp: string;
}

export async function pingService(service: ServiceRecord): Promise<PingResult> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  let targetUrl = service.url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Hermes-Status-Monitor/1.0 (+https://hermes-launchpad.local)',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);
    const statusCode = response.status;

    let status: 'online' | 'offline' | 'degraded' = 'online';
    if (statusCode >= 200 && statusCode < 400) {
      status = duration > 1400 ? 'degraded' : 'online';
    } else if (statusCode >= 400 && statusCode < 500) {
      // 401, 403, 404 still mean the server is up and reachable
      status = 'degraded';
    } else {
      // 500, 502, 503, 504
      status = 'offline';
    }

    const result: PingResult = {
      serviceId: service.id,
      status,
      statusCode,
      responseTimeMs: duration,
      timestamp,
    };

    db.recordCheckResult(service.id, {
      status: result.status,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
    });

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === 'AbortError';

    const result: PingResult = {
      serviceId: service.id,
      status: 'offline',
      statusCode: isTimeout ? 504 : 0,
      responseTimeMs: isTimeout ? 6000 : duration,
      errorMessage: isTimeout ? 'Tiempo de espera agotado (Timeout > 6s)' : (err?.message || 'Error de conexión / Red inalcanzable'),
      timestamp,
    };

    db.recordCheckResult(service.id, {
      status: 'offline',
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
    });

    return result;
  }
}

export async function pingAllServices(): Promise<PingResult[]> {
  const services = db.getServices();
  // Run with reasonable concurrency
  const results = await Promise.all(services.map((s) => pingService(s)));
  return results;
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startBackgroundMonitor(intervalMs = 60000) {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(async () => {
    try {
      await pingAllServices();
    } catch (e) {
      console.error('Background monitor check error:', e);
    }
  }, intervalMs);
}
