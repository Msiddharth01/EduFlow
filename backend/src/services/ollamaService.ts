/**
 * Ollama AI Service Integration
 * Provides generation and embedding services with timeout and graceful error handling.
 */

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
export const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.2:3b';
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

export interface OllamaStatus {
  available: boolean;
  model: string;
  url: string;
  error?: string;
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return {
        available: true,
        model: OLLAMA_CHAT_MODEL,
        url: OLLAMA_BASE_URL,
      };
    }
    return {
      available: false,
      model: OLLAMA_CHAT_MODEL,
      url: OLLAMA_BASE_URL,
      error: `Ollama returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      available: false,
      model: OLLAMA_CHAT_MODEL,
      url: OLLAMA_BASE_URL,
      error: err.message || 'Ollama daemon unreachable',
    };
  }
}

export async function queryOllama(prompt: string, systemPrompt: string = ''): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data: any = await res.json();
    return data.response ? String(data.response).trim() : null;
  } catch {
    return null;
  }
}

export async function getOllamaEmbedding(text: string): Promise<number[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text.slice(0, 1000),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data: any = await res.json();
    if (Array.isArray(data.embedding) && data.embedding.length > 0) {
      return data.embedding;
    }
    return null;
  } catch {
    return null;
  }
}
