import { useState } from 'react';
import type { FormEvent } from 'react';
import { roomsApi } from '../../api/rooms.api';
import { useRoomStore } from '../../store/roomStore';
import { useToast } from '../../contexts/ToastContext';
import { isGloballyHandled } from '../../api/axios';

interface Props {
  onClose: () => void;
}

export function CreateRoomModal({ onClose }: Props) {
  const addRoom = useRoomStore((s) => s.addRoom);
  const toast = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError('');

    if (name.trim().length < 2) {
      setNameError('Room name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await roomsApi.create(name.trim(), description.trim() || undefined, maxParticipants);
      addRoom(data);
      toast.success(`Room "${data.name}" created.`);
      onClose();
    } catch (err) {
      if (!isGloballyHandled(err)) {
        toast.error('Failed to create room. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create Room</h2>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          <div className="field-group">
            <input
              type="text"
              placeholder="Room name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              className={nameError ? 'input-error' : undefined}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'err-room-name' : undefined}
              autoFocus
            />
            {nameError && (
              <span id="err-room-name" className="field-error" role="alert">
                {nameError}
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label>
            Max participants
            <input
              type="number"
              min={2}
              max={20}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
