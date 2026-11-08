import { useEffect, useRef } from 'react';
import type { ServerToClientEvents } from '@shared/realtime';
import { getSocket } from '@/socket';

// Several components can follow the same room (the header watcher and the order page, for example):
// the room is left only when the last one unmounts.
const followers = new Map<string, number>();

/**
 * Joins a room while the component is mounted, and again after every reconnection.
 * `onResync` runs after a reconnection, to fetch what may have happened meanwhile.
 */
export function useRoom(kind: 'business' | 'order', id: string | null | undefined, onResync?: () => void) {
  const resync = useRef(onResync);
  resync.current = onResync;

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    const join = () => socket.emit(kind === 'business' ? 'business:join' : 'order:join', id, () => undefined);
    let connectedBefore = socket.connected;
    const onConnect = () => {
      join();
      if (connectedBefore) resync.current?.();
      connectedBefore = true;
    };
    const room = `${kind}:${id}`;
    followers.set(room, (followers.get(room) ?? 0) + 1);
    if (socket.connected) join();
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      const left = (followers.get(room) ?? 1) - 1;
      if (left > 0) followers.set(room, left);
      else {
        followers.delete(room);
        if (kind === 'order') socket.emit('order:leave', id);
      }
    };
  }, [kind, id]);
}

/** Listens to a server event; the latest handler is always used and the listener is removed on unmount. */
export function useSocketEvent<E extends keyof ServerToClientEvents>(event: E, handler: ServerToClientEvents[E]) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const listener = ((...args: Parameters<ServerToClientEvents[E]>) => (latest.current as (...a: unknown[]) => void)(...args)) as never;
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
