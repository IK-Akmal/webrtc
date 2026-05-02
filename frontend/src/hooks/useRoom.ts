import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Participant,
  ConnectionState,
  Track,
} from 'livekit-client';
import axios from 'axios';
import { roomsApi } from '../api/rooms.api';

function describeMediaError(err: Error): string {
  const name = (err as DOMException).name ?? err.message;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || err.message.includes('Permission denied'))
    return 'Camera/microphone permission denied. You can still view others, but you won\'t be visible or audible.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'No camera or microphone found on this device.';
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'Camera or microphone is already in use by another application.';
  return `Media error: ${err.message}`;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  ts: number;
  fromSelf: boolean;
}

const CHAT_TOPIC = 'chat';

export function useRoom(roomId: string, password?: string) {
  const roomRef = useRef<Room | null>(null);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeSpeakerSids, setActiveSpeakerSids] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const syncParticipants = () => {
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
      setLocalParticipant(room.localParticipant);
      const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      setIsScreenSharing(!!screenPub?.track);
    };

    room
      .on(RoomEvent.Connected, syncParticipants)
      .on(RoomEvent.Disconnected, syncParticipants)
      .on(RoomEvent.Reconnected, syncParticipants)
      .on(RoomEvent.ParticipantConnected, syncParticipants)
      .on(RoomEvent.ParticipantDisconnected, syncParticipants)
      .on(RoomEvent.TrackSubscribed, syncParticipants)
      .on(RoomEvent.TrackUnsubscribed, syncParticipants)
      .on(RoomEvent.LocalTrackPublished, syncParticipants)
      .on(RoomEvent.LocalTrackUnpublished, syncParticipants)
      .on(RoomEvent.ConnectionStateChanged, (state) => setConnectionState(state))
      .on(RoomEvent.MediaDevicesError, (err: Error) => setMediaError(describeMediaError(err)))
      .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        setActiveSpeakerSids(new Set(speakers.map((s) => s.sid)));
      })
      .on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
        if (topic !== CHAT_TOPIC) return;
        try {
          const { text, ts } = JSON.parse(new TextDecoder().decode(payload)) as { text: string; ts: number };
          setChatMessages((prev) => [
            ...prev,
            {
              id: `${ts}-${participant?.sid ?? 'remote'}`,
              text,
              senderName: participant?.name || participant?.identity || 'Unknown',
              senderId: participant?.sid ?? '',
              ts,
              fromSelf: false,
            },
          ]);
        } catch {
          // ignore malformed messages
        }
      });

    const connect = async () => {
      try {
        const { data } = await roomsApi.livekitToken(roomId, password);
        const livekitUrl =
          import.meta.env.VITE_LIVEKIT_URL ||
          `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

        await room.connect(livekitUrl, data.token);
        syncParticipants();
        // Media errors are non-fatal — join without camera/mic if denied
        try {
          await room.localParticipant.enableCameraAndMicrophone();
        } catch (mediaErr) {
          setMediaError(describeMediaError(mediaErr instanceof Error ? mediaErr : new Error(String(mediaErr))));
        }
        syncParticipants();
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        const msg = status === 403
          ? 'Incorrect room password.'
          : err instanceof Error ? err.message : 'Failed to connect to room';
        setError(msg);
      }
    };

    connect();

    return () => {
      room.disconnect();
      roomRef.current = null;
    };
  }, [roomId, password]);

  function toggleAudio(enabled: boolean) {
    roomRef.current?.localParticipant.setMicrophoneEnabled(enabled);
  }

  function toggleVideo(enabled: boolean) {
    roomRef.current?.localParticipant.setCameraEnabled(enabled);
  }

  async function toggleScreenShare(enabled: boolean) {
    try {
      await roomRef.current?.localParticipant.setScreenShareEnabled(enabled, { audio: true });
    } catch {
      // User cancelled the browser screen-share picker — not an error
    }
  }

  function sendChatMessage(text: string) {
    const room = roomRef.current;
    if (!room || !text.trim()) return;

    const ts = Date.now();
    const payload = JSON.stringify({ text: text.trim(), ts });
    room.localParticipant.publishData(new TextEncoder().encode(payload), {
      reliable: true,
      topic: CHAT_TOPIC,
    });

    setChatMessages((prev) => [
      ...prev,
      {
        id: `${ts}-local`,
        text: text.trim(),
        senderName: room.localParticipant.name || room.localParticipant.identity,
        senderId: room.localParticipant.sid,
        ts,
        fromSelf: true,
      },
    ]);
  }

  return {
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
  };
}
