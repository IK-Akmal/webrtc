import { useEffect, useRef, useState } from 'react';

// Ideal constraints for desktop/modern mobile; fall back to basic if rejected
const PREFERRED: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

const FALLBACK: MediaStreamConstraints = { video: true, audio: true };

function describeError(err: unknown): string {
  if (!(err instanceof DOMException)) return 'Could not access camera or microphone.';
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera/microphone permission denied. Please allow access and reload.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera or microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Camera does not support the required video constraints.';
    default:
      return `Media error: ${err.message}`;
  }
}

export function useMediaDevices() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // navigator.mediaDevices is only available in secure contexts (HTTPS or localhost).
    // Accessing via http://<IP> on a local network exposes this as undefined.
    if (!navigator.mediaDevices) {
      setError(
        'Camera access requires a secure connection (HTTPS). ' +
        'Open the app via https:// and accept the self-signed certificate warning.',
      );
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia(PREFERRED)
      // On mobile some devices reject the ideal constraints → retry with defaults
      .catch(() => navigator.mediaDevices.getUserMedia(FALLBACK))
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        setStream(s);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(describeError(err));
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function toggleAudio(enabled: boolean) {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  function toggleVideo(enabled: boolean) {
    streamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  return { stream, error, toggleAudio, toggleVideo };
}
