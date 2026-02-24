import { useTaskPolling } from '../../hooks/useTaskPolling';

interface Props {
  videoId: string;
  onComplete: () => void;
}

export default function ProcessingStatus({ videoId, onComplete }: Props) {
  const status = useTaskPolling(videoId);

  if (!status) return null;

  if (status.status === 'completed') {
    onComplete();
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
        <span>
          {status.status === 'failed'
            ? `Failed: ${status.error || 'Unknown error'}`
            : 'Processing...'}
        </span>
        <span>{Math.round(status.progress_pct)}%</span>
      </div>
      <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status.status === 'failed' ? 'bg-red-500' : 'bg-brand-500'
          }`}
          style={{ width: `${status.progress_pct}%` }}
        />
      </div>
    </div>
  );
}
