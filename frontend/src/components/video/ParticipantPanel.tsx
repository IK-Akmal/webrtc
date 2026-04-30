import { LocalParticipant, RemoteParticipant, Track, ConnectionQuality } from 'livekit-client';

interface Props {
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  activeSpeakerSids: Set<string>;
}

function qualityDots(q: ConnectionQuality) {
  if (q === ConnectionQuality.Excellent) return <span className="q-dots q-excellent">●●●</span>;
  if (q === ConnectionQuality.Good)      return <span className="q-dots q-good">●●○</span>;
  if (q === ConnectionQuality.Poor)      return <span className="q-dots q-poor">●○○</span>;
  if (q === ConnectionQuality.Lost)      return <span className="q-dots q-lost">✕</span>;
  return null;
}

function ParticipantRow({
  participant,
  isLocal,
  isSpeaking,
}: {
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  isSpeaking: boolean;
}) {
  const name = participant.name || participant.identity;
  const micOn = participant.isMicrophoneEnabled;
  const camOn = participant.isCameraEnabled;
  const screenOn = !!(participant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack);

  return (
    <div className={`participant-item ${isSpeaking ? 'participant-item--speaking' : ''}`}>
      <div className="participant-avatar">{name.charAt(0).toUpperCase()}</div>
      <div className="participant-info">
        <span className="participant-name">
          {name}
          {isLocal && <span className="you-tag"> (You)</span>}
        </span>
        <span className="participant-status">
          {isSpeaking && <span className="speaking-dot" title="Speaking">●</span>}
          {screenOn && <span title="Sharing screen">🖥</span>}
        </span>
      </div>
      <div className="participant-icons">
        <span title={micOn ? 'Mic on' : 'Muted'} className={micOn ? '' : 'icon-muted'}>{micOn ? '🎤' : '🔇'}</span>
        <span title={camOn ? 'Camera on' : 'Camera off'} className={camOn ? '' : 'icon-muted'}>{camOn ? '📷' : '🚫'}</span>
        {qualityDots(participant.connectionQuality)}
      </div>
    </div>
  );
}

export function ParticipantPanel({ localParticipant, remoteParticipants, activeSpeakerSids }: Props) {
  const total = remoteParticipants.length + (localParticipant ? 1 : 0);

  return (
    <div className="side-panel participant-panel">
      <div className="side-panel-header">
        <span>Participants ({total})</span>
      </div>

      <div className="participant-list">
        {localParticipant && (
          <ParticipantRow
            participant={localParticipant}
            isLocal
            isSpeaking={activeSpeakerSids.has(localParticipant.sid)}
          />
        )}
        {remoteParticipants.map((p) => (
          <ParticipantRow
            key={p.sid}
            participant={p}
            isLocal={false}
            isSpeaking={activeSpeakerSids.has(p.sid)}
          />
        ))}
      </div>
    </div>
  );
}
