import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { db } from './db.js';
import { pingService, pingAllServices } from './pinger.js';

export interface HermesMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
  }>;
}

const toolsDeclarations: FunctionDeclaration[] = [
  {
    name: 'list_services',
    description: 'Obtiene la lista completa de programas y páginas web registradas en el dashboard con su estado actual (online, offline, degraded), latencia y porcentaje de estabilidad.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.STRING,
          description: 'Opcional: filtrar por "online", "offline" o categoría.',
        },
      },
    },
  },
  {
    name: 'add_service',
    description: 'Registra un nuevo programa o URL web en la base de datos SQLite y realiza un chequeo inmediato de salud para verificar si está activo o caído.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nombre del programa, dashboard o servicio (ej: "Mi API de Pagos", "Stripe Dashboard")',
        },
        url: {
          type: Type.STRING,
          description: 'URL completa con https:// o http:// (ej: "https://stripe.com" o "https://mi-app.com")',
        },
        category: {
          type: Type.STRING,
          description: 'Categoría opcional (ej: "Producción", "Dev Tools", "AI / LLM", "Finanzas", "APIs")',
        },
        description: {
          type: Type.STRING,
          description: 'Descripción breve de la aplicación o programa.',
        },
      },
      required: ['name', 'url'],
    },
  },
  {
    name: 'check_service_status',
    description: 'Ejecuta un ping o prueba de conexión en tiempo real a una URL o servicio existente para determinar si está activo (verde) o caído (rojo) y medir su tiempo de respuesta.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name_or_url: {
          type: Type.STRING,
          description: 'Nombre o URL de la página o servicio a verificar.',
        },
      },
      required: ['name_or_url'],
    },
  },
  {
    name: 'delete_service',
    description: 'Elimina un programa o URL de la base de datos SQLite del dashboard.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Nombre exacto o aproximado del programa a eliminar.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_system_status',
    description: 'Obtiene un resumen global del estado del sistema: número total de programas, servicios activos en verde, caídos en rojo y latencia promedio.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

async function executeTool(name: string, args: any) {
  switch (name) {
    case 'list_services': {
      const all = db.getServices();
      const filtered = args.filter
        ? all.filter((s) => s.status === args.filter || s.category.toLowerCase().includes(args.filter.toLowerCase()))
        : all;
      return {
        count: filtered.length,
        services: filtered.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          category: s.category,
          status: s.status,
          latency_ms: s.last_response_time_ms,
          uptime_percent: s.uptime_percentage,
          last_checked: s.last_checked_at,
        })),
      };
    }

    case 'add_service': {
      const added = db.addService({
        name: args.name,
        url: args.url,
        category: args.category || 'General',
        description: args.description || '',
      });
      // Perform immediate ping
      const checkResult = await pingService(added);
      const updated = db.getService(added.id);
      return {
        success: true,
        message: `Servicio "${args.name}" agregado y guardado en SQLite con éxito.`,
        service: updated,
        initialPing: checkResult,
      };
    }

    case 'check_service_status': {
      const query = (args.name_or_url || '').toLowerCase();
      const all = db.getServices();
      const matched = all.find(
        (s) => s.name.toLowerCase().includes(query) || s.url.toLowerCase().includes(query)
      );

      if (!matched) {
        return {
          success: false,
          error: `No se encontró ningún servicio registrado que coincida con "${args.name_or_url}".`,
        };
      }

      const result = await pingService(matched);
      return {
        success: true,
        service: matched.name,
        url: matched.url,
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        errorMessage: result.errorMessage,
        uptime_percent: matched.uptime_percentage,
      };
    }

    case 'delete_service': {
      const query = (args.name || '').toLowerCase();
      const all = db.getServices();
      const matched = all.find((s) => s.name.toLowerCase().includes(query));
      if (!matched) {
        return { success: false, error: `No se encontró servicio con nombre "${args.name}".` };
      }
      db.deleteService(matched.id);
      return { success: true, message: `Servicio "${matched.name}" eliminado correctamente.` };
    }

    case 'get_system_status': {
      const stats = db.getStats();
      const all = db.getServices();
      const offlineNames = all.filter((s) => s.status === 'offline').map((s) => s.name);
      return {
        ...stats,
        offlineServices: offlineNames,
      };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

export async function processHermesChat(
  userMessage: string,
  history: HermesMessage[] = []
): Promise<{ reply: string; toolResults: any[] }> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini key is present, fallback to deterministic parser
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return handleDeterministicHermes(userMessage);
  }

  try {
    const ai = new GoogleGenAI();
    const systemInstruction = `
Eres Hermes Agent, un agente de inteligencia artificial especializado en DevOps y monitoreo de infraestructura web y aplicaciones.
Tu misión es gestionar el dashboard de URLs y servicios del usuario almacenados en una base de datos SQLite.
Capacidades:
- Monitorear páginas web y APIs.
- Mostrar si están activos (anillo verde), caídos (anillo rojo) o degradados (amarillo).
- Agregar nuevas URLs y probarlas de inmediato.
- Consultar estabilidad, uptime y latencia.
- Eliminar servicios cuando el usuario lo solicite.

Instrucciones:
- Responde siempre de forma amigable, profesional y concisa en español.
- Utiliza las herramientas (tools) disponibles para consultar la base de datos o modificar los servicios en SQLite.
- Cuando agregues una página, infórmale al usuario si el primer chequeo fue exitoso y su latencia.
    `.trim();

    // Call Gemini with tools
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...history.slice(-6).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolsDeclarations }],
      },
    });

    const toolCalls = response.functionCalls;
    const executedResults: any[] = [];

    if (toolCalls && toolCalls.length > 0) {
      for (const call of toolCalls) {
        if (!call.name) continue;
        const result = await executeTool(call.name, call.args);
        executedResults.push({
          tool: call.name,
          args: call.args,
          result,
        });
      }

      // Generate follow-up conversational response with the tool results
      const followUp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          ...history.slice(-4).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [{ text: userMessage }],
          },
          {
            role: 'model',
            parts: toolCalls.map((tc) => ({ functionCall: tc })),
          },
          {
            role: 'user',
            parts: executedResults.map((er) => ({
              functionResponse: {
                name: er.tool,
                response: er.result,
              },
            })),
          },
        ],
        config: {
          systemInstruction,
        },
      });

      return {
        reply: followUp.text || 'Operación completada con éxito por Hermes Agent.',
        toolResults: executedResults,
      };
    }

    return {
      reply: response.text || 'Entendido. ¿En qué más puedo ayudarte con tus servicios y URLs?',
      toolResults: [],
    };
  } catch (error: any) {
    console.error('Gemini call failed in Hermes agent, falling back to deterministic parser:', error);
    return handleDeterministicHermes(userMessage);
  }
}

// Fallback pattern parser if API key is not configured or network error occurs
async function handleDeterministicHermes(
  userMessage: string
): Promise<{ reply: string; toolResults: any[] }> {
  const msg = userMessage.toLowerCase().trim();
  const toolResults: any[] = [];

  // Match: "agrega https://..." or "agregar https://..." or "añade ..."
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const urlMatch = userMessage.match(urlRegex);

  if ((msg.includes('agrega') || msg.includes('agregar') || msg.includes('añade') || msg.includes('anade')) && urlMatch) {
    const url = urlMatch[1];
    let name = 'Nueva Página';
    // Try to guess a name
    try {
      const parsedUrl = new URL(url);
      name = parsedUrl.hostname.replace('www.', '').split('.')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      // ignore
    }

    const added: any = await executeTool('add_service', {
      name,
      url,
      category: 'General',
      description: 'Agregado mediante Hermes Agent',
    });
    toolResults.push({ tool: 'add_service', args: { name, url }, result: added });

    const initialStatus = added?.initialPing?.status || 'online';
    const initialLatency = added?.initialPing?.responseTimeMs ?? 100;
    const statusText = initialStatus === 'online' ? 'activo (anillo verde)' : 'con error (anillo rojo)';
    return {
      reply: `Hermes Agent: He agregado "${name}" (${url}) a la base de datos SQLite. El estado inicial es ${statusText} con tiempo de respuesta de ${initialLatency}ms.`,
      toolResults,
    };
  }

  if (msg.includes('status') || msg.includes('estado') || msg.includes('caid') || msg.includes('resumen') || msg.includes('cuantas')) {
    const stats: any = await executeTool('get_system_status', {});
    toolResults.push({ tool: 'get_system_status', args: {}, result: stats });

    const offlineList = stats.offlineServices && stats.offlineServices.length > 0 ? `(${stats.offlineServices.join(', ')})` : '';
    return {
      reply: `Hermes Agent - Resumen de Salud del Sistema:
• Total de programas monitoreados: ${stats.total ?? 0}
• Activos (anillo verde): ${stats.online ?? 0}
• Caídos (anillo rojo): ${stats.offline ?? 0} ${offlineList}
• Latencia promedio: ${stats.avgLatency ?? 0}ms
• Estabilidad global: ${stats.avgUptime ?? 100}%`,
      toolResults,
    };
  }

  if (msg.includes('verificar') || msg.includes('revisa') || msg.includes('ping') || msg.includes('chequea')) {
    const all = db.getServices();
    await pingAllServices();
    const stats = db.getStats();
    return {
      reply: `Hermes Agent: Se ha completado el escaneo de salud de todos los servicios (${stats.total} comprobados). ${stats.online} activos y ${stats.offline} caídos.`,
      toolResults: [{ tool: 'check_all', result: stats }],
    };
  }

  return {
    reply: `Hermes Agent conectado. Puedes pedirme:
1. "Agrega https://mi-sitio.com" para registrar y probar una nueva URL.
2. "¿Cuál es el estado de mis programas?" para ver un resumen de servicios activos y caídos.
3. "Verifica todos los servicios" para lanzar un ping en tiempo real a todas las páginas.`,
    toolResults: [],
  };
}

export function getHermesExternalToolSchema() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Hermes Agent Status & URL Launcher API',
      version: '1.0.0',
      description: 'API externa para que Hermes Agent u otros agentes autónomos interactúen con el dashboard y SQLite.',
    },
    tools: toolsDeclarations,
  };
}
