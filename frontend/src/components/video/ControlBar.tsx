import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  onToggleAudio: (enabled: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onEmitState: (state: string) => void;
}

export function ControlBar({ onToggleAudio, onToggleVideo, onEmitState }: Props) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const navigate = useNavigate();

  function toggleAudio() {
    const next = !audioEnabled;
    setAudioEnabled(next);
    onToggleAudio(next);
    onEmitState(next ? 'connected' : 'muted_audio');
  }

  function toggleVideo() {
    const next = !videoEnabled;
    setVideoEnabled(next);
    onToggleVideo(next);
    onEmitState(next ? 'connected' : 'muted_video');
  }

  function leaveRoom() {
    navigate('/rooms');
  }

  return (
    <div className="control-bar">
      <button
        className={`control-btn ${audioEnabled ? '' : 'control-btn--off'}`}
        onClick={toggleAudio}
        title={audioEnabled ? 'Mute mic' : 'Unmute mic'}
      >
        {audioEnabled ? '🎤' : '🔇'}
      </button>
      <button
        className={`control-btn ${videoEnabled ? '' : 'control-btn--off'}`}
        onClick={toggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? '📷' : '🚫'}
      </button>
      <button className="control-btn control-btn--leave" onClick={leaveRoom} title="Leave room">
        📞 Leave
      </button>
    </div>
  );
}
