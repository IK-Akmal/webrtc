import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Room } from '../../api/rooms.api';
import { roomsApi } from '../../api/rooms.api';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { useToast } from '../../contexts/ToastContext';
import { isGloballyHandled } from '../../api/axios';
import { EditRoomModal } from './EditRoomModal';

interface Props { room: Room }

export function RoomCard({ room }: Props) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const removeRoom = useRoomStore((s) => s.removeRoom);
  const toast = useToast();

  const [showPrompt, setShowPrompt] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUser?.id === room.ownerId;

  function handleClick() {
    if (room.isPasswordProtected) {
      setShowPrompt(true);
    } else {
      navigate(`/room/${room.id}`);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) { setError('Enter password'); return; }
    setJoining(true);
    setError('');
    try {
      await roomsApi.livekitToken(room.id, password.trim());
      setShowPrompt(false);
      navigate(`/room/${room.id}`, { state: { password: password.trim() } });
      setPassword('');
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(status === 403 ? 'Incorrect password' : 'Failed to join room');
    } finally {
      setJoining(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete room "${room.name}"?`)) return;
    setDeleting(true);
    try {
      await roomsApi.delete(room.id);
      removeRoom(room.id);
      toast.success(`Room "${room.name}" deleted.`);
    } catch (err) {
      if (!isGloballyHandled(err)) toast.error('Failed to delete room.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="room-card" onClick={handleClick}>
        <div className="room-card-header">
          <h3>
            {room.isPasswordProtected && <span className="room-lock" title="Password protected">🔒 </span>}
            {room.name}
          </h3>
          <span className={`status-badge status-${room.status}`}>{room.status}</span>
        </div>
        {room.description && <p className="room-description">{room.description}</p>}
        <div className="room-card-footer">
          <span>👥 {room.activeParticipantCount ?? 0} / {room.maxParticipants}</span>
          <span>{new Date(room.createdAt).toLocaleDateString()}</span>
        </div>
        {isOwner && (
          <div className="room-card-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="room-action-btn"
              title="Edit"
              onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
            >
              ✏️
            </button>
            <button
              className="room-action-btn room-action-btn--danger"
              title="Delete"
              disabled={deleting}
              onClick={handleDelete}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {showEdit && <EditRoomModal room={room} onClose={() => setShowEdit(false)} />}

      {showPrompt && (
        <div className="modal-overlay" onClick={() => { setShowPrompt(false); setError(''); setPassword(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔒 {room.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>This room is password protected</p>
            <form onSubmit={handleJoin} className="auth-form" noValidate>
              <div className="field-group">
                <input
                  type="password"
                  placeholder="Room password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={error ? 'input-error' : undefined}
                  autoFocus
                />
                {error && <span className="field-error" role="alert">{error}</span>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => { setShowPrompt(false); setError(''); setPassword(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={joining}>
                  {joining ? 'Checking…' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
