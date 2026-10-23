import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '@/config';

let socket: Socket | null = null;

/**
 * Connexion Socket.IO authentifiée par le même token que l'API REST.
 * Événements serveur attendus :
 *  - "message:new"  (Message)            nouveau message dans une conversation de l'utilisateur
 *  - "message:read" ({ conversationId })  l'autre participant a lu la conversation
 */
export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
