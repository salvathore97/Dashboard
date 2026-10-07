export interface CheckHistory {
  id: string;
  service_id: string;
  status: 'online' | 'offline' | 'degraded';
  status_code: number;
  response_time_ms: number;
  checked_at: string;
  error_message?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  icon: string;
  tags: string; // JSON string
  status: 'online' | 'offline' | 'degraded' | 'checking';
  last_status_code: number;
  last_response_time_ms: number;
  last_checked_at: string;
  uptime_percentage: number;
  total_checks: number;
  successful_checks: number;
  created_at: string;
  user_id: string;
  history?: CheckHistory[];
}

export interface SystemStats {
  total: number;
  online: number;
  offline: number;
  degraded: number;
  checking: number;
  avgLatency: number;
  avgUptime: number;
}

export interface UserSession {
  id: string;
  username: string;
  role: 'admin' | 'demo' | 'user';
  isDemo: boolean;
  token?: string;
}

export interface UserItem {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export interface HermesChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolResults?: Array<{
    tool: string;
    args?: any;
    result?: any;
  }>;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
}

export interface IncidentRecord {
  id: string;
  service_id: string;
  service_name: string;
  service_url: string;
  status: 'offline' | 'degraded';
  status_code: number;
  response_time_ms: number;
  checked_at: string;
  error_message?: string;
}

export interface InspectorResult {
  success: boolean;
  url: string;
  status: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  protocol: string;
  sslValid: boolean;
  server?: string;
  contentType?: string;
  headers: Record<string, string>;
  error?: string;
  timestamp: string;
}

export type SidebarTab =
  | 'launchpad'
  | 'analytics'
  | 'incidents'
  | 'inspector'
  | 'hermes_hub'
  | 'settings';
