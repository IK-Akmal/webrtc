import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Room } from '../../api/rooms.api';
import { roomsApi } from '../../api/rooms.api';
import { useRoomStore } from '../../store/roomStore';
import { useToast } from '../../contexts/ToastContext';
import { isGloballyHandled } from '../../api/axios';

interface Props {
  room: Room;
  onClose: () => void;
}

export function EditRoomModal({ room, onClose }: Props) {
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const toast = useToast();

  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? '');
  const [maxParticipants, setMaxParticipants] = useState(room.maxParticipants);
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
      const { data } = await roomsApi.update(room.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        maxParticipants,
      });
      updateRoom(data);
      toast.success('Room updated.');
      onClose();
    } catch (err) {
      if (!isGloballyHandled(err)) {
        toast.error('Failed to update room. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Room</h2>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="field-group">
            <input
              type="text"
              placeholder="Room name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className={nameError ? 'input-error' : undefined}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'err-edit-name' : undefined}
              autoFocus
            />
            {nameError && (
              <span id="err-edit-name" className="field-error" role="alert">
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
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
