import api from './axios';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number;
  status: 'waiting' | 'active' | 'closed';
  ownerId: string;
  activeParticipantCount?: number;
  createdAt: string;
}

export interface IceConfig {
  iceServers: RTCIceServer[];
}

export const roomsApi = {
  list: () => api.get<Room[]>('/rooms'),
  create: (name: string, description?: string, maxParticipants?: number) =>
    api.post<Room>('/rooms', { name, description, maxParticipants }),
  get: (id: string) => api.get<Room>(`/rooms/${id}`),
  delete: (id: string) => api.delete(`/rooms/${id}`),
  iceConfig: () => api.get<IceConfig>('/rooms/ice-config'),
};
