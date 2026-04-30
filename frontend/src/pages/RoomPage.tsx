import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useSocket } from "../hooks/useSocket";
import { useMediaDevices } from "../hooks/useMediaDevices";
import { useWebRTC } from "../hooks/useWebRTC";
import { VideoGrid } from "../components/video/VideoGrid";
import { ControlBar } from "../components/video/ControlBar";

export function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken, user, iceServers } = useAuthStore();
  const socketRef = useSocket(accessToken);
  const {
    stream,
    error: mediaError,
    toggleAudio,
    toggleVideo,
  } = useMediaDevices();

  const socket = socketRef.current;
  const { peerStreams } = useWebRTC(
    stream && socket ? socket : null,
    stream,
    iceServers,
    roomId ?? "",
  );

  if (!roomId) {
    navigate("/rooms");
    return null;
  }

  if (mediaError) {
    return (
      <div className="room-error">
        <div className="error-banner">
          <strong>Media access required</strong>
          <p>{mediaError}</p>
        </div>
        <button className="btn" onClick={() => navigate("/rooms")}>
          Back to Rooms
        </button>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="room-loading">
        Requesting camera and microphone access…
      </div>
    );
  }

  function emitState(state: string) {
    socket?.emit("participant-state-changed", { state });
  }

  return (
    <div className="room-page">
      <div className="room-page-header">
        <h2>Room</h2>
        <span className="participant-count">
          {peerStreams.length + 1} participant
          {peerStreams.length + 1 !== 1 ? "s" : ""}
        </span>
      </div>

      <VideoGrid
        localStream={stream}
        localDisplayName={user?.displayName ?? "You"}
        peerStreams={peerStreams}
      />

      <ControlBar
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onEmitState={emitState}
      />
    </div>
  );
}
