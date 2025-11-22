import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

type StreamClient = {
  id: string;
  res: Response;
};

export type EventStreamPayload =
  | {
      type: 'snapshot';
      events: unknown[];
    }
  | {
      type: 'created' | 'updated';
      event: unknown;
    }
  | {
      type: 'deleted';
      eventId: string;
    }
  | {
      type: 'ping';
      at: number;
    };

const clients: Map<string, StreamClient> = new Map();
let pingInterval: NodeJS.Timeout | null = null;

function broadcast(payload: EventStreamPayload): void {
  const serialized = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(serialized);
    } catch (error) {
      console.error('[eventsStream] Error enviando payload SSE:', error);
    }
  }
}

function ensurePingTimer(): void {
  if (pingInterval !== null || clients.size === 0) {
    return;
  }

  pingInterval = setInterval(() => {
    if (clients.size === 0) {
      if (pingInterval !== null) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      return;
    }
    broadcast({ type: 'ping', at: Date.now() });
  }, 25000);
}

function stopPingTimerIfNeeded(): void {
  if (clients.size === 0 && pingInterval !== null) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

export function registerStreamClient(req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const flushHeaders = (res as Response & { flushHeaders?: () => void }).flushHeaders;
  flushHeaders?.call(res);

  const id = randomUUID();
  clients.set(id, { id, res });
  ensurePingTimer();

  const onClose = () => {
    clients.delete(id);
    stopPingTimerIfNeeded();
  };

  req.on('close', onClose);
  req.on('end', onClose);
}

export function pushEventStreamPayload(payload: EventStreamPayload): void {
  if (clients.size === 0) {
    return;
  }
  broadcast(payload);
}






