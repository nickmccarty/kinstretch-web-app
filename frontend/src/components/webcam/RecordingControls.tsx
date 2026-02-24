interface Props {
  isRecording: boolean;
  framesRecorded: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function RecordingControls({
  isRecording,
  framesRecorded,
  onStartRecording,
  onStopRecording,
}: Props) {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-light rounded-lg border border-surface-lighter">
      {isRecording ? (
        <>
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-400 font-mono">{framesRecorded} frames</span>
          <button
            onClick={onStopRecording}
            className="ml-auto bg-red-600 text-white text-xs px-4 py-2 rounded hover:bg-red-500"
          >
            Stop Recording
          </button>
        </>
      ) : (
        <>
          <div className="w-3 h-3 bg-gray-600 rounded-full" />
          <span className="text-xs text-gray-500">Ready to record</span>
          <button
            onClick={onStartRecording}
            className="ml-auto bg-brand-600 text-white text-xs px-4 py-2 rounded hover:bg-brand-500"
          >
            Start Recording
          </button>
        </>
      )}
    </div>
  );
}
