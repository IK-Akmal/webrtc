import { useEffect, useState } from 'react';
import { roomsApi } from '../api/rooms.api';
import { useRoomStore } from '../store/roomStore';
import { Navbar } from '../components/layout/Navbar';
import { RoomCard } from '../components/rooms/RoomCard';
import { CreateRoomModal } from '../components/rooms/CreateRoomModal';
import { useToast } from '../contexts/ToastContext';
import { isGloballyHandled } from '../api/axios';

export function RoomsPage() {
  const { rooms, setRooms } = useRoomStore();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    roomsApi
      .list()
      .then((r) => setRooms(r.data))
      .catch((err) => {
        if (!isGloballyHandled(err)) {
          toast.error('Failed to load rooms. Please refresh.');
        }
      })
      .finally(() => setLoading(false));
  // toast is stable (memoised in context) — safe dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRooms]);

  return (
    <>
      <Navbar />
      <main className="rooms-page">
        <div className="rooms-header">
          <h1>Rooms</h1>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Room
          </button>
        </div>

        {loading && <p className="loading">Loading rooms…</p>}

        <div className="rooms-grid">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>

        {!loading && rooms.length === 0 && (
          <p className="empty-state">No rooms yet. Create one to get started!</p>
        )}
      </main>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
