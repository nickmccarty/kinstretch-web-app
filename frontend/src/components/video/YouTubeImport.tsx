import { useState } from 'react';
import { importYouTube } from '../../services/api';

interface Props {
  sessionId: string;
  onImported: () => void;
}

function parseTime(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN) || parts.length < 2 || parts.length > 3) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export default function YouTubeImport({ sessionId, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    const startS = parseTime(startInput) ?? undefined;
    const endS = parseTime(endInput) ?? undefined;
    if (startS !== undefined && endS !== undefined && startS >= endS) {
      setError('Start must be before end');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await importYouTube(sessionId, url.trim(), undefined, startS, endS);
      setUrl('');
      setStartInput('');
      setEndInput('');
      onImported();
    } catch {
      setError('Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          className="flex-1 bg-surface text-gray-100 text-sm px-4 py-2.5 rounded-lg border border-surface-lighter focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="bg-red-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>

      {/* Optional time slice */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            type="text"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            placeholder="Start (e.g. 1:30)"
            className="w-full bg-surface text-gray-400 text-xs px-3 py-1.5 rounded border border-surface-lighter focus:outline-none focus:border-brand-500 focus:text-gray-100 placeholder:text-gray-600"
          />
        </div>
        <div>
          <input
            type="text"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            placeholder="End (e.g. 3:45)"
            className="w-full bg-surface text-gray-400 text-xs px-3 py-1.5 rounded border border-surface-lighter focus:outline-none focus:border-brand-500 focus:text-gray-100 placeholder:text-gray-600"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
