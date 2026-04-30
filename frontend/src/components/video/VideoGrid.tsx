import { VideoTile } from './VideoTile';
import type { PeerStream } from '../../hooks/useWebRTC';

interface Props {
  localStream: MediaStream | null;
  localDisplayName: string;
  peerStreams: PeerStream[];
}

export function VideoGrid({ localStream, localDisplayName, peerStreams }: Props) {
  return (
    <div className="video-grid">
      <VideoTile stream={localStream} displayName={localDisplayName} isLocal muted />
      {peerStreams.map((p) => (
        <VideoTile key={p.socketId} stream={p.stream} displayName={p.displayName} />
      ))}
    </div>
  );
}
