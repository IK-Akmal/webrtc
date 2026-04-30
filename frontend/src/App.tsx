import { useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomsPage } from './pages/RoomsPage';
import { RoomPage } from './pages/RoomPage';
import { useAuthStore } from './store/authStore';

export default function App() {
  // Gate rendering until we've confirmed or restored the session.
  // Avoids the login-page flash on F5 when a valid refresh cookie exists.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { accessToken, user, setAccessToken, setIceServers, logout } =
      useAuthStore.getState();

    // Already authenticated, or not logged in at all → no refresh needed
    if (accessToken || !user) {
      setReady(true);
      return;
    }

    // Persisted user but no access token → silently restore via httpOnly cookie
    axios
      .post<{ accessToken: string }>('/api/auth/refresh', {}, { withCredentials: true })
      .then(async (r) => {
        setAccessToken(r.data.accessToken);
        // Re-fetch ICE config so TURN credentials are fresh
        try {
          const ice = await axios.get<{ iceServers: RTCIceServer[] }>(
            '/api/rooms/ice-config',
            {
              withCredentials: true,
              headers: { Authorization: `Bearer ${r.data.accessToken}` },
            },
          );
          setIceServers(ice.data.iceServers);
        } catch {
          // Non-fatal — keep persisted iceServers
        }
      })
      .catch(() => logout())
      .finally(() => setReady(true));
  // Intentionally empty deps: run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div className="room-loading">Loading…</div>;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/rooms"
            element={<ProtectedRoute><RoomsPage /></ProtectedRoute>}
          />
          <Route
            path="/room/:id"
            element={<ProtectedRoute><RoomPage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/rooms" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
