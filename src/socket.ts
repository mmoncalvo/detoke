// The app's single Socket.IO connection. It authenticates with the current session token.
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/realtime';
import { BASE, getToken } from '@/api';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  socket ??= io(BASE || undefined, {
    autoConnect: false,
    // Read on every (re)connection, so it always carries the current session.
    auth: (cb) => cb(getToken() ? { token: getToken() } : {}),
  });
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
}

// Coming back with Back (for example from WhatsApp) restores the page from the browser cache with the
// connection closed: reconnect, and the hooks join their rooms again and refetch what changed meanwhile.
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (event) => {
    // The socket may not have noticed the closed connection yet, so start over.
    if (event.persisted && socket) socket.disconnect().connect();
  });
}

/** After signing in or out: reconnect with the new token (rooms are joined again by the hooks). */
export function refreshSocketAuth() {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}
