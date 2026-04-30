import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${import.meta.env.VITE_SOCKET_URL ?? ''}/signaling`, {
      path: '/socket.io',
      auth: { token },
      // Allow polling as fallback for mobile networks / corporate proxies that
      // block raw WebSocket upgrades. Socket.IO will upgrade to WS when possible.
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });

    socketRef.current = socket;

    // Re-connect after the page returns from background (mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef;
}
