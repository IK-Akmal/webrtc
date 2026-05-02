import api from './axios';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number;
  status: 'waiting' | 'active' | 'closed';
  ownerId: string;
  activeParticipantCount?: number;
  isPasswordProtected?: boolean;
  createdAt: string;
}

export interface IceConfig {
  iceServers: RTCIceServer[];
}

export const roomsApi = {
  list: () => api.get<Room[]>('/rooms'),
  create: (name: string, description?: string, maxParticipants?: number, password?: string) =>
    api.post<Room>('/rooms', { name, description, maxParticipants, password }),
  get: (id: string) => api.get<Room>(`/rooms/${id}`),
  update: (id: string, patch: { name?: string; description?: string; maxParticipants?: number }) =>
    api.patch<Room>(`/rooms/${id}`, patch),
  delete: (id: string) => api.delete(`/rooms/${id}`),
  iceConfig: () => api.get<IceConfig>('/rooms/ice-config'),
  livekitToken: (id: string, password?: string) =>
    api.get<{ token: string }>(`/rooms/${id}/livekit-token`, { params: password ? { password } : {} }),
};
