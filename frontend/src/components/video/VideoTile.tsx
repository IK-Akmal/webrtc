import { useEffect, useRef, useState } from 'react';
import { Participant, Track, ParticipantEvent, ConnectionQuality } from 'livekit-client';

interface Props {
  participant: Participant;
  trackSource?: Track.Source;
  isLocal?: boolean;
  isSpeaking?: boolean;
}

const qualityIcon: Record<string, string> = {
  [ConnectionQuality.Excellent]: '▂▄█',
  [ConnectionQuality.Good]:      '▂▄░',
  [ConnectionQuality.Poor]:      '▂░░',
  [ConnectionQuality.Lost]:      '✕',
  [ConnectionQuality.Unknown]:   '',
};

const qualityClass: Record<string, string> = {
  [ConnectionQuality.Excellent]: 'quality--excellent',
  [ConnectionQuality.Good]:      'quality--good',
  [ConnectionQuality.Poor]:      'quality--poor',
  [ConnectionQuality.Lost]:      'quality--lost',
  [ConnectionQuality.Unknown]:   '',
};

export function VideoTile({ participant, trackSource = Track.Source.Camera, isLocal = false, isSpeaking = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, forceUpdate] = useState(0);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  const isScreenShare = trackSource === Track.Source.ScreenShare;

  // Re-render when participant tracks/state change
  useEffect(() => {
    const refresh = () => forceUpdate((n) => n + 1);
    participant
      .on(ParticipantEvent.TrackPublished, refresh)
      .on(ParticipantEvent.TrackUnpublished, refresh)
      .on(ParticipantEvent.TrackSubscribed, refresh)
      .on(ParticipantEvent.TrackUnsubscribed, refresh)
      .on(ParticipantEvent.IsSpeakingChanged, refresh)
      .on(ParticipantEvent.TrackMuted, refresh)
      .on(ParticipantEvent.TrackUnmuted, refresh)
      .on(ParticipantEvent.ConnectionQualityChanged, (q: ConnectionQuality) => {
        setQuality(q);
        refresh();
      });
    return () => {
      participant
        .off(ParticipantEvent.TrackPublished, refresh)
        .off(ParticipantEvent.TrackUnpublished, refresh)
        .off(ParticipantEvent.TrackSubscribed, refresh)
        .off(ParticipantEvent.TrackUnsubscribed, refresh)
        .off(ParticipantEvent.IsSpeakingChanged, refresh)
        .off(ParticipantEvent.TrackMuted, refresh)
        .off(ParticipantEvent.TrackUnmuted, refresh)
        .off(ParticipantEvent.ConnectionQualityChanged, () => {});
    };
  }, [participant]);

  const track = participant.getTrackPublication(trackSource)?.videoTrack;
  // Camera tiles: play microphone audio; screen share tiles: play screen share audio
  const audioTrack = !isLocal
    ? isScreenShare
      ? participant.getTrackPublication(Track.Source.ScreenShareAudio)?.audioTrack
      : participant.getTrackPublication(Track.Source.Microphone)?.audioTrack
    : undefined;

  useEffect(() => {
    const el = videoRef.current;
    if (!track || !el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);

  useEffect(() => {
    const el = audioRef.current;
    if (!audioTrack || !el) return;
    audioTrack.attach(el);
    return () => { audioTrack.detach(el); };
  }, [audioTrack]);

  const isMicMuted = !participant.isMicrophoneEnabled;
  const isCamOff = !isScreenShare && !participant.isCameraEnabled;
  const displayName = participant.name || participant.identity;

  const classes = [
    'video-tile',
    isLocal && !isScreenShare ? 'video-tile--local' : '',
    isSpeaking ? 'video-tile--speaking' : '',
    isScreenShare ? 'video-tile--screen' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} />
      {audioTrack && <audio ref={audioRef} autoPlay />}

      {isCamOff && (
        <div className="video-tile-no-cam">
          <div className="no-cam-avatar">{displayName.charAt(0).toUpperCase()}</div>
        </div>
      )}

      {qualityIcon[quality] && (
        <div className={`quality-badge ${qualityClass[quality]}`}>
          {qualityIcon[quality]}
        </div>
      )}

      <div className="video-tile-label">
        {isScreenShare && <span className="screen-badge">🖥</span>}
        {displayName}
        {isLocal ? ' (You)' : ''}
        {isMicMuted && !isScreenShare ? ' 🔇' : ''}
      </div>
    </div>
  );
}
