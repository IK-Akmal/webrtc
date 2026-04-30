import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../api/auth.api';

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  iceServers: RTCIceServer[];
  setAuth: (token: string, user: UserProfile) => void;
  setAccessToken: (token: string) => void;
  setIceServers: (servers: RTCIceServer[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setIceServers: (iceServers) => set({ iceServers }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'webrtc_auth',
      // Persist user profile and ICE servers; access token lives in memory only
      partialize: ({ user, iceServers }) => ({ user, iceServers }),
    },
  ),
);
