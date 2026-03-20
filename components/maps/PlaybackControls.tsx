"use client";

export default function PlaybackControls({
  isPlaying,
  progress,
  onPlay,
  onPause,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number; // 0..1
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
}) {
  return (
    <div
      style={{ display: "flex", gap: 12, alignItems: "center", padding: 12 }}
    >
      {!isPlaying ? (
        <button onClick={onPlay} style={{ padding: "6px 12px" }}>
          Play
        </button>
      ) : (
        <button onClick={onPause} style={{ padding: "6px 12px" }}>
          Pause
        </button>
      )}

      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        style={{ flex: 1 }}
      />

      <div style={{ width: 60, textAlign: "right" }}>
        {Math.round(progress * 100)}%
      </div>
    </div>
  );
}
