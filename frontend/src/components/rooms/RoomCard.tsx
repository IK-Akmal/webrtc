import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Room } from '../../api/rooms.api';
import { roomsApi } from '../../api/rooms.api';

interface Props { room: Room }

export function RoomCard({ room }: Props) {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
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
      setLoading(false);
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
      </div>

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
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Checking…' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
