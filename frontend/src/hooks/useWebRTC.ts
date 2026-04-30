import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export interface PeerStream {
  socketId: string;
  stream: MediaStream;
  displayName: string;
}

interface PeerEntry {
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  displayName: string;
}

interface RoomJoinedPayload {
  roomId: string;
  peers: Array<{ socketId: string; userId: string; displayName: string }>;
}
interface UserJoinedPayload { socketId: string; userId: string; displayName: string }
interface UserLeftPayload { socketId: string }
interface OfferPayload { fromSocketId: string; offer: RTCSessionDescriptionInit }
interface AnswerPayload { fromSocketId: string; answer: RTCSessionDescriptionInit }
interface IcePayload { fromSocketId: string; candidate: RTCIceCandidateInit }

// Passed to createOffer/createAnswer on older mobile browsers that require
// explicit receive direction flags (pre-Unified-Plan implementations).
const OFFER_OPTIONS: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

export function useWebRTC(
  socket: Socket | null,
  localStream: MediaStream | null,
  iceServers: RTCIceServer[],
  roomId: string,
) {
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);

  const peers = useRef<Map<string, PeerEntry>>(new Map());
  const mySocketId = useRef<string>('');
  const remoteDescSet = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const updatePeerStreams = useCallback(() => {
    const next: PeerStream[] = [];
    peers.current.forEach((entry, socketId) => {
      if (entry.stream) next.push({ socketId, stream: entry.stream, displayName: entry.displayName });
    });
    setPeerStreams([...next]);
  }, []);

  const closePeer = useCallback((socketId: string) => {
    peers.current.get(socketId)?.connection.close();
    peers.current.delete(socketId);
    remoteDescSet.current.delete(socketId);
    iceCandidateQueue.current.delete(socketId);
    updatePeerStreams();
  }, [updatePeerStreams]);

  const createPeerConnection = useCallback(
    (remoteSocketId: string, displayName: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'all' });

      pc.onicecandidate = (e) => {
        if (e.candidate && socket) {
          socket.emit('ice-candidate', { targetSocketId: remoteSocketId, candidate: e.candidate });
        }
      };

      pc.ontrack = (e) => {
        const entry = peers.current.get(remoteSocketId);
        if (!entry) return;
        // iOS Safari may deliver tracks without a pre-populated stream in e.streams
        if (e.streams[0]) {
          entry.stream = e.streams[0];
        } else {
          if (!entry.stream) entry.stream = new MediaStream();
          entry.stream.addTrack(e.track);
        }
        updatePeerStreams();
      };

      // Primary connection-state handler (Chrome, Firefox, modern browsers)
      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          closePeer(remoteSocketId);
        }
      };

      // Backup ICE-state handler for iOS Safari which doesn't reliably fire
      // onconnectionstatechange but does fire oniceconnectionstatechange.
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          closePeer(remoteSocketId);
        }
      };

      peers.current.set(remoteSocketId, { connection: pc, stream: null, displayName });
      return pc;
    },
    [iceServers, socket, updatePeerStreams, closePeer],
  );

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }, [localStream]);

  const drainIceQueue = useCallback(async (socketId: string) => {
    remoteDescSet.current.add(socketId);
    const queued = iceCandidateQueue.current.get(socketId) ?? [];
    const pc = peers.current.get(socketId)?.connection;
    if (pc) {
      for (const c of queued) {
        await pc.addIceCandidate(c).catch(() => undefined);
      }
    }
    iceCandidateQueue.current.delete(socketId);
  }, []);

  useEffect(() => {
    if (!socket || !localStream) return;

    mySocketId.current = socket.id ?? '';

    async function onRoomJoined(payload: RoomJoinedPayload) {
      mySocketId.current = socket!.id ?? '';
      for (const peer of payload.peers) {
        const pc = createPeerConnection(peer.socketId, peer.displayName);
        addLocalTracks(pc);
        if (mySocketId.current < peer.socketId) {
          try {
            const offer = await pc.createOffer(OFFER_OPTIONS);
            await pc.setLocalDescription(offer);
            socket!.emit('webrtc-offer', { targetSocketId: peer.socketId, offer });
          } catch {
            closePeer(peer.socketId);
          }
        }
      }
    }

    async function onUserJoined(payload: UserJoinedPayload) {
      const pc = createPeerConnection(payload.socketId, payload.displayName);
      addLocalTracks(pc);
      if (mySocketId.current < payload.socketId) {
        try {
          const offer = await pc.createOffer(OFFER_OPTIONS);
          await pc.setLocalDescription(offer);
          socket!.emit('webrtc-offer', { targetSocketId: payload.socketId, offer });
        } catch {
          closePeer(payload.socketId);
        }
      }
    }

    function onUserLeft(payload: UserLeftPayload) {
      closePeer(payload.socketId);
    }

    async function onOffer(payload: OfferPayload) {
      try {
        let pc = peers.current.get(payload.fromSocketId)?.connection;
        if (!pc) {
          const entry = peers.current.get(payload.fromSocketId);
          pc = createPeerConnection(payload.fromSocketId, entry?.displayName ?? '');
          addLocalTracks(pc);
        }
        await pc.setRemoteDescription(payload.offer);
        await drainIceQueue(payload.fromSocketId);
        const answer = await pc.createAnswer(OFFER_OPTIONS);
        await pc.setLocalDescription(answer);
        socket!.emit('webrtc-answer', { targetSocketId: payload.fromSocketId, answer });
      } catch {
        closePeer(payload.fromSocketId);
      }
    }

    async function onAnswer(payload: AnswerPayload) {
      try {
        const pc = peers.current.get(payload.fromSocketId)?.connection;
        if (pc) {
          await pc.setRemoteDescription(payload.answer);
          await drainIceQueue(payload.fromSocketId);
        }
      } catch {
        closePeer(payload.fromSocketId);
      }
    }

    async function onIce(payload: IcePayload) {
      const { fromSocketId, candidate } = payload;
      if (remoteDescSet.current.has(fromSocketId)) {
        const pc = peers.current.get(fromSocketId)?.connection;
        if (pc) await pc.addIceCandidate(candidate).catch(() => undefined);
      } else {
        const q = iceCandidateQueue.current.get(fromSocketId) ?? [];
        q.push(candidate);
        iceCandidateQueue.current.set(fromSocketId, q);
      }
    }

    socket.on('room-joined', onRoomJoined);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('ice-candidate', onIce);

    socket.emit('join-room', { roomId });

    return () => {
      socket.off('room-joined', onRoomJoined);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('ice-candidate', onIce);

      peers.current.forEach((_, id) => closePeer(id));
      socket.emit('leave-room', { roomId });
    };
  }, [socket, localStream, roomId, createPeerConnection, addLocalTracks, closePeer, drainIceQueue]);

  return { peerStreams };
}
