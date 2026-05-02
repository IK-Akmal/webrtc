import { create } from 'zustand';
import type { Room } from '../api/rooms.api';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  addRoom: (room: Room) => void;
  removeRoom: (id: string) => void;
  updateRoom: (room: Room) => void;
  updateRoomCount: (id: string, count: number) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms] })),
  removeRoom: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
  updateRoom: (room) => set((s) => ({ rooms: s.rooms.map((r) => (r.id === room.id ? room : r)) })),
  updateRoomCount: (id, count) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, activeParticipantCount: count } : r)),
    })),
}));
