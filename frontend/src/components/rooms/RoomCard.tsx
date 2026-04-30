import { useNavigate } from 'react-router-dom';
import type { Room } from '../../api/rooms.api';

interface Props { room: Room }

export function RoomCard({ room }: Props) {
  const navigate = useNavigate();

  return (
    <div className="room-card" onClick={() => navigate(`/room/${room.id}`)}>
      <div className="room-card-header">
        <h3>{room.name}</h3>
        <span className={`status-badge status-${room.status}`}>{room.status}</span>
      </div>
      {room.description && <p className="room-description">{room.description}</p>}
      <div className="room-card-footer">
        <span>👥 {room.activeParticipantCount ?? 0} / {room.maxParticipants}</span>
        <span>{new Date(room.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
