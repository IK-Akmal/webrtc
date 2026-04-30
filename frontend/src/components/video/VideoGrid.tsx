import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client';
import { VideoTile } from './VideoTile';

interface Props {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  activeSpeakerSids: Set<string>;
}

type ParticipantEntry = { participant: LocalParticipant | RemoteParticipant; isLocal: boolean };

function hasScreenShare(p: LocalParticipant | RemoteParticipant): boolean {
  const pub = p.getTrackPublication(Track.Source.ScreenShare);
  return !!(pub?.videoTrack);
}

export function VideoGrid({ localParticipant, remoteParticipants, activeSpeakerSids }: Props) {
  const all: ParticipantEntry[] = [];
  if (localParticipant) all.push({ participant: localParticipant, isLocal: true });
  for (const p of remoteParticipants) all.push({ participant: p, isLocal: false });

  // Collect screen-share tiles first (local screen share takes priority)
  const screenSharers = all.filter(({ participant }) => hasScreenShare(participant));
  const hasAnyScreenShare = screenSharers.length > 0;

  return (
    <div className={`video-grid${hasAnyScreenShare ? ' video-grid--spotlight' : ''}`}>
      {/* Screen share tiles — displayed as spotlight at top */}
      {screenSharers.map(({ participant, isLocal }) => (
        <VideoTile
          key={`${participant.sid}-screen`}
          participant={participant}
          trackSource={Track.Source.ScreenShare}
          isLocal={isLocal}
          isSpeaking={activeSpeakerSids.has(participant.sid)}
        />
      ))}

      {/* Camera tiles */}
      {all.map(({ participant, isLocal }) => (
        <VideoTile
          key={participant.sid}
          participant={participant}
          trackSource={Track.Source.Camera}
          isLocal={isLocal}
          isSpeaking={activeSpeakerSids.has(participant.sid)}
        />
      ))}
    </div>
  );
}
