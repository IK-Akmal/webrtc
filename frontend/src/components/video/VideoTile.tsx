import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  displayName: string;
  muted?: boolean;
  isLocal?: boolean;
}

export function VideoTile({
  stream,
  displayName,
  muted = false,
  isLocal = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    // Explicit play() call is required on iOS Safari — autoPlay attribute alone
    // is not enough for remote (unmuted) streams without a prior user gesture.
    video.play().catch((error) => {
      console.error(error);
      // Autoplay was blocked. The browser will wait for a user interaction.
      // The user can tap the video tile to start playback.
    });
  }, [stream]);

  // Allow the user to manually resume playback after a blocked autoplay
  function handleClick() {
    videoRef.current?.play().catch((error) => console.error(error));
  }

  return (
    <div
      className={`video-tile${isLocal ? " video-tile--local" : ""}`}
      onClick={handleClick}
    >
      <video ref={videoRef} autoPlay playsInline muted={muted || isLocal} />
      <div className="video-tile-label">
        {displayName}
        {isLocal ? " (You)" : ""}
      </div>
    </div>
  );
}
