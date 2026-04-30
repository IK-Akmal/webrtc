import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onToggleAudio: (enabled: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onToggleScreenShare: (enabled: boolean) => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  isScreenSharing: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  unreadCount: number;
}

export function ControlBar({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  isScreenSharing,
  chatOpen,
  participantsOpen,
  unreadCount,
}: Props) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const navigate = useNavigate();

  function toggleAudio() {
    const next = !audioEnabled;
    setAudioEnabled(next);
    onToggleAudio(next);
  }

  function toggleVideo() {
    const next = !videoEnabled;
    setVideoEnabled(next);
    onToggleVideo(next);
  }

  function toggleScreenShare() {
    onToggleScreenShare(!isScreenSharing);
  }

  return (
    <div className="control-bar">
      <button
        className={`control-btn ${audioEnabled ? '' : 'control-btn--off'}`}
        onClick={toggleAudio}
        title={audioEnabled ? 'Mute mic' : 'Unmute mic'}
      >
        <span className="ctrl-icon">{audioEnabled ? '🎤' : '🔇'}</span>
        <span className="ctrl-label">{audioEnabled ? 'Mic' : 'Muted'}</span>
      </button>

      <button
        className={`control-btn ${videoEnabled ? '' : 'control-btn--off'}`}
        onClick={toggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        <span className="ctrl-icon">{videoEnabled ? '📷' : '🚫'}</span>
        <span className="ctrl-label">{videoEnabled ? 'Camera' : 'Cam off'}</span>
      </button>

      <button
        className={`control-btn ${isScreenSharing ? 'control-btn--active' : ''}`}
        onClick={toggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      >
        <span className="ctrl-icon">🖥</span>
        <span className="ctrl-label">{isScreenSharing ? 'Stop' : 'Share'}</span>
      </button>

      <button
        className={`control-btn ${participantsOpen ? 'control-btn--active' : ''}`}
        onClick={onToggleParticipants}
        title="Participants"
      >
        <span className="ctrl-icon">👥</span>
        <span className="ctrl-label">People</span>
      </button>

      <button
        className={`control-btn ${chatOpen ? 'control-btn--active' : ''} ctrl-chat`}
        onClick={onToggleChat}
        title="Chat"
      >
        <span className="ctrl-icon">💬</span>
        {unreadCount > 0 && <span className="ctrl-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        <span className="ctrl-label">Chat</span>
      </button>

      <button className="control-btn control-btn--leave" onClick={() => navigate('/rooms')} title="Leave room">
        <span className="ctrl-icon">📞</span>
        <span className="ctrl-label">Leave</span>
      </button>
    </div>
  );
}
