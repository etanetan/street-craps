interface DataPoint {
  t: number; // unix ms
  v: number; // cumulative net chips (cents)
}

interface Props {
  data: DataPoint[];
}

const W = 560;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function formatChipsShort(cents: number): string {
  const abs = Math.abs(cents);
  const sign = cents < 0 ? '-' : cents > 0 ? '+' : '';
  if (abs >= 100_000) return `${sign}$${(abs / 100_000).toFixed(0)}k`;
  if (abs >= 1_000) return `${sign}$${(abs / 100).toFixed(0)}`;
  return `${sign}$${(abs / 100).toFixed(0)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChipChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
        Play more games to see your chart
      </div>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minV = Math.min(0, ...data.map(d => d.v));
  const maxV = Math.max(0, ...data.map(d => d.v));
  const rangeV = maxV - minV || 1;

  const minT = data[0].t;
  const maxT = data[data.length - 1].t;
  const rangeT = maxT - minT || 1;

  const toX = (t: number) => PAD.left + ((t - minT) / rangeT) * innerW;
  const toY = (v: number) => PAD.top + ((maxV - v) / rangeV) * innerH;

  const points = data.map(d => `${toX(d.t)},${toY(d.v)}`).join(' ');
  const zeroY = toY(0);

  // Build fill path: go along line, then down to zero, back
  const fillPath = `M ${toX(data[0].t)},${zeroY} ` +
    data.map(d => `L ${toX(d.t)},${toY(d.v)}`).join(' ') +
    ` L ${toX(data[data.length - 1].t)},${zeroY} Z`;

  // Determine overall color by final value
  const finalV = data[data.length - 1].v;
  const lineColor = finalV >= 0 ? '#4ade80' : '#f87171';
  const fillColor = finalV >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';

  // Y axis labels (3 ticks: min, 0, max)
  const yTicks = Array.from(new Set([minV, 0, maxV]));
  // X axis: show first, last, and maybe middle date
  const xTicks = data.length > 1
    ? [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
    : [data[0]];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Zero line */}
      <line
        x1={PAD.left} y1={zeroY}
        x2={W - PAD.right} y2={zeroY}
        stroke="#374151" strokeWidth={1} strokeDasharray="4 3"
      />

      {/* Fill area */}
      <path d={fillPath} fill={fillColor} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots for each data point */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(d.t)} cy={toY(d.v)} r={3} fill={lineColor} />
      ))}

      {/* Y axis labels */}
      {yTicks.map((v, i) => (
        <text
          key={i}
          x={PAD.left - 6}
          y={toY(v) + 4}
          textAnchor="end"
          fontSize={10}
          fill={v === 0 ? '#6b7280' : v > 0 ? '#4ade80' : '#f87171'}
        >
          {formatChipsShort(v)}
        </text>
      ))}

      {/* X axis labels */}
      {xTicks.map((d, i) => (
        <text
          key={i}
          x={toX(d.t)}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          fontSize={10}
          fill="#6b7280"
        >
          {formatDate(d.t)}
        </text>
      ))}
    </svg>
  );
}
