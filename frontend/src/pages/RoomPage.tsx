import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ConnectionState } from 'livekit-client';
import { useRoom } from '../hooks/useRoom';
import { VideoGrid } from '../components/video/VideoGrid';
import { ControlBar } from '../components/video/ControlBar';
import { ChatPanel } from '../components/video/ChatPanel';
import { ParticipantPanel } from '../components/video/ParticipantPanel';

type PanelType = 'chat' | 'participants' | null;

export function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const password = (location.state as { password?: string } | null)?.password;

  const {
    localParticipant,
    remoteParticipants,
    connectionState,
    error,
    mediaError,
    activeSpeakerSids,
    chatMessages,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
  } = useRoom(roomId ?? '', password);

  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [mediaBannerDismissed, setMediaBannerDismissed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMsgLen = useRef(0);

  // Track unread messages when chat is closed
  useEffect(() => {
    const newCount = chatMessages.length - prevMsgLen.current;
    if (newCount > 0 && activePanel !== 'chat') {
      setUnreadCount((n) => n + newCount);
    }
    prevMsgLen.current = chatMessages.length;
  }, [chatMessages, activePanel]);

  function togglePanel(panel: PanelType) {
    setActivePanel((cur) => (cur === panel ? null : panel));
    if (panel === 'chat') setUnreadCount(0);
  }

  if (!roomId) {
    navigate('/rooms');
    return null;
  }

  if (error) {
    return (
      <div className="room-error">
        <div className="error-banner">
          <strong>Connection error</strong>
          <p>{error}</p>
        </div>
        <button className="btn" onClick={() => navigate('/rooms')}>
          Back to Rooms
        </button>
      </div>
    );
  }

  if (connectionState !== ConnectionState.Connected) {
    return <div className="room-loading">Connecting to room…</div>;
  }

  const totalCount = remoteParticipants.length + 1;

  return (
    <div className="room-page">
      <div className="room-page-header">
        <h2>Room</h2>
        <span className="participant-count">
          {totalCount} participant{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {mediaError && !mediaBannerDismissed && (
        <div className="media-error-banner">
          <span>⚠️ {mediaError}</span>
          <button onClick={() => setMediaBannerDismissed(true)}>✕</button>
        </div>
      )}

      <div className="room-body">
        <VideoGrid
          localParticipant={localParticipant}
          remoteParticipants={remoteParticipants}
          activeSpeakerSids={activeSpeakerSids}
        />

        {activePanel === 'chat' && (
          <ChatPanel messages={chatMessages} onSend={sendChatMessage} onClose={() => togglePanel('chat')} />
        )}
        {activePanel === 'participants' && (
          <ParticipantPanel
            localParticipant={localParticipant}
            remoteParticipants={remoteParticipants}
            activeSpeakerSids={activeSpeakerSids}
            onClose={() => togglePanel('participants')}
          />
        )}
      </div>

      <ControlBar
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => togglePanel('chat')}
        onToggleParticipants={() => togglePanel('participants')}
        isScreenSharing={isScreenSharing}
        chatOpen={activePanel === 'chat'}
        participantsOpen={activePanel === 'participants'}
        unreadCount={unreadCount}
      />
    </div>
  );
}
