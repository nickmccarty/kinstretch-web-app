import { useMemo, useCallback, useState } from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from '../../stores/appStore';
import { JOINT_NAMES } from '../../constants/skeleton';
import {
  landmarkToVec3,
  calcAngleBetweenSegments,
  getOuterEndpoints,
  buildBodyFrame,
  getPlaneAngles,
} from '../../three/helpers';

interface FrameSample {
  t: number;
  frameIndex: number;
  angle: number;
  sagittal: number;
  frontal: number;
  transverse: number;
  jx: number;
  jy: number;
}

const CHART_H = 240;

const DARK_BASE = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'rgba(15,23,42,0.55)',
  font: { color: '#94a3b8', family: 'ui-monospace, SFMono-Regular, monospace', size: 11 },
  margin: { t: 38, r: 12, b: 38, l: 42 },
  xaxis: {
    gridcolor: 'rgba(255,255,255,0.055)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
    linecolor: 'rgba(255,255,255,0.07)',
    tickfont: { size: 10 },
  },
  yaxis: {
    gridcolor: 'rgba(255,255,255,0.055)',
    zerolinecolor: 'rgba(255,255,255,0.08)',
    linecolor: 'rgba(255,255,255,0.07)',
    tickfont: { size: 10 },
  },
  legend: {
    bgcolor: 'rgba(0,0,0,0)',
    font: { size: 10, color: '#94a3b8' },
    orientation: 'h' as const,
    yanchor: 'bottom' as const,
    y: 1.02,
    xanchor: 'left' as const,
    x: 0,
  },
  hoverlabel: {
    bgcolor: '#1e293b',
    bordercolor: 'rgba(255,255,255,0.1)',
    font: { color: '#e2e8f0', size: 11 },
  },
};

export default function JointAnalysisPanel() {
  const frames = useAppStore((s) => s.frames);
  const selectedEdges = useAppStore((s) => s.selectedEdges);
  const measuredAngle = useAppStore((s) => s.measuredAngle);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const setCurrentFrameIndex = useAppStore((s) => s.setCurrentFrameIndex);
  const [collapsed, setCollapsed] = useState(false);

  // ── Per-frame series computation ──────────────────────────────────
  // Only recalculates when the edges / joint change, not on every scrub.
  const series = useMemo((): FrameSample[] | null => {
    if (selectedEdges.length !== 2 || !measuredAngle) return null;
    const [edgeA, edgeB] = selectedEdges;
    const jointIdx = measuredAngle.jointIndex;
    const [outerAIdx, outerBIdx] = getOuterEndpoints(edgeA, edgeB, jointIdx);

    const samples: FrameSample[] = [];
    for (const frame of frames) {
      const lms = frame.landmarks;
      if (!lms[jointIdx] || !lms[outerAIdx] || !lms[outerBIdx]) continue;

      const jVec = landmarkToVec3(lms[jointIdx]);
      const aVec = landmarkToVec3(lms[outerAIdx]);
      const bVec = landmarkToVec3(lms[outerBIdx]);

      const angle = calcAngleBetweenSegments(jVec, aVec, bVec);
      const bodyFrame = buildBodyFrame(lms);
      const pa = bodyFrame ? getPlaneAngles(jVec, aVec, bVec, bodyFrame) : null;

      samples.push({
        t: frame.timestamp_ms / 1000,
        frameIndex: frame.frame_index,
        angle,
        sagittal:   pa?.sagittal   ?? 0,
        frontal:    pa?.frontal    ?? 0,
        transverse: pa?.transverse ?? 0,
        jx: lms[jointIdx].x,
        jy: lms[jointIdx].y,
      });
    }
    return samples.length > 0 ? samples : null;
  }, [frames, selectedEdges, measuredAngle?.jointIndex]);

  // Clicking the angle chart seeks to that frame
  const handleAngleClick = useCallback(
    (event: any) => {
      if (!series || !event?.points?.length) return;
      const sample = series[event.points[0].pointIndex];
      if (sample) setCurrentFrameIndex(sample.frameIndex);
    },
    [series, setCurrentFrameIndex],
  );

  if (!measuredAngle || !series) return null;

  const jointName = JOINT_NAMES[measuredAngle.jointIndex] ?? `Joint ${measuredAngle.jointIndex}`;
  const currentT  = (frames[currentFrameIndex]?.timestamp_ms ?? 0) / 1000;

  // Nearest sample to the current frame (for the trajectory dot)
  const currentSample =
    series.find((s) => s.frameIndex === currentFrameIndex) ??
    series.reduce((best, s) =>
      Math.abs(s.frameIndex - currentFrameIndex) < Math.abs(best.frameIndex - currentFrameIndex)
        ? s
        : best,
    );

  // ── Angle Over Time chart ─────────────────────────────────────────
  const times = series.map((s) => s.t);
  const angleData = [
    {
      x: times, y: series.map((s) => s.angle),
      name: '3D', type: 'scatter', mode: 'lines',
      line: { color: 'rgba(148,163,184,0.55)', width: 1.5 },
      hovertemplate: '%{y:.1f}°<extra>3D</extra>',
    },
    {
      x: times, y: series.map((s) => s.sagittal),
      name: 'Sagittal', type: 'scatter', mode: 'lines',
      line: { color: '#f59e0b', width: 2 },
      hovertemplate: '%{y:.1f}°<extra>Sagittal</extra>',
    },
    {
      x: times, y: series.map((s) => s.frontal),
      name: 'Frontal', type: 'scatter', mode: 'lines',
      line: { color: '#38bdf8', width: 2 },
      hovertemplate: '%{y:.1f}°<extra>Frontal</extra>',
    },
    {
      x: times, y: series.map((s) => s.transverse),
      name: 'Transverse', type: 'scatter', mode: 'lines',
      line: { color: '#4ade80', width: 2 },
      hovertemplate: '%{y:.1f}°<extra>Transverse</extra>',
    },
  ];

  const angleLayout = {
    ...DARK_BASE,
    title: { text: `${jointName} · Angle over Time`, font: { size: 12, color: '#e2e8f0' }, x: 0.01, xanchor: 'left' },
    xaxis: {
      ...DARK_BASE.xaxis,
      title: { text: 'Time (s)', font: { size: 10 }, standoff: 4 },
    },
    yaxis: {
      ...DARK_BASE.yaxis,
      title: { text: 'Angle (°)', font: { size: 10 }, standoff: 4 },
      range: [0, 180], dtick: 45,
    },
    // Playhead — updates reactively with currentFrameIndex
    shapes: [{
      type: 'line', xref: 'x', yref: 'paper',
      x0: currentT, x1: currentT, y0: 0, y1: 1,
      line: { color: 'rgba(255,255,255,0.3)', width: 1.5, dash: 'dot' },
    }],
    // Current frame annotation
    annotations: [{
      xref: 'x', yref: 'paper',
      x: currentT, y: 1,
      text: `${currentT.toFixed(1)}s`,
      showarrow: false,
      font: { size: 10, color: 'rgba(255,255,255,0.45)' },
      xanchor: 'left', yanchor: 'bottom',
      xshift: 4,
    }],
  };

  // ── Spatial Trajectory chart ──────────────────────────────────────
  const n = series.length;
  const colorVals = series.map((_, i) => i / Math.max(n - 1, 1));

  const trajData = [
    // Path — colour-coded by time: dark blue (early) → sky (mid) → amber (late)
    {
      x: series.map((s) => s.jx),
      y: series.map((s) => 1 - s.jy), // invert Y so up = up
      type: 'scatter', mode: 'lines+markers',
      marker: {
        size: 5, color: colorVals,
        colorscale: [[0, 'rgba(15,23,42,0.9)'], [0.45, '#0ea5e9'], [1, '#f59e0b']],
        showscale: false, line: { width: 0 },
      },
      line: { color: 'rgba(14,165,233,0.18)', width: 1 },
      name: 'Path', showlegend: false,
      hovertemplate: '(%{x:.3f}, %{y:.3f})<extra></extra>',
    },
    // Current position
    {
      x: [currentSample.jx],
      y: [1 - currentSample.jy],
      type: 'scatter', mode: 'markers',
      marker: {
        size: 11, color: '#f59e0b', symbol: 'circle',
        line: { color: 'rgba(245,158,11,0.35)', width: 4 },
      },
      name: 'Now', showlegend: false,
      hovertemplate: '(%{x:.3f}, %{y:.3f})<extra>Now</extra>',
    },
  ];

  const trajLayout = {
    ...DARK_BASE,
    margin: { ...DARK_BASE.margin, l: 34 },
    title: { text: `${jointName} · Spatial Trajectory`, font: { size: 12, color: '#e2e8f0' }, x: 0.01, xanchor: 'left' },
    xaxis: { ...DARK_BASE.xaxis, title: { text: 'X', font: { size: 10 }, standoff: 4 }, range: [0, 1], dtick: 0.25 },
    yaxis: { ...DARK_BASE.yaxis, title: { text: 'Y', font: { size: 10 }, standoff: 4 }, range: [0, 1], dtick: 0.25, scaleanchor: 'x', scaleratio: 1 },
  };

  const cfg = { displayModeBar: false, responsive: true };

  return (
    <div className="bg-surface-light border-t border-surface-lighter">
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Joint Analysis</span>
          <span className="text-xs text-gray-600">{jointName}</span>
        </div>
        <span className="text-gray-600 text-xs">{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 grid grid-cols-5 gap-3">
          {/* Angle over Time — 3 of 5 cols */}
          <div className="col-span-3">
            <Plot
              data={angleData as any}
              layout={angleLayout as any}
              config={cfg}
              style={{ width: '100%', height: CHART_H }}
              onClick={handleAngleClick}
              useResizeHandler
            />
          </div>
          {/* Spatial Trajectory — 2 of 5 cols */}
          <div className="col-span-2">
            <Plot
              data={trajData as any}
              layout={trajLayout as any}
              config={cfg}
              style={{ width: '100%', height: CHART_H }}
              useResizeHandler
            />
          </div>
        </div>
      )}
    </div>
  );
}
