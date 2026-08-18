interface Props {
  data: { date: string; views: number }[];
}

const CHART_HEIGHT = 160;
const CHART_WIDTH = 600;
const BAR_GAP = 2;

// Hand-rolled SVG bar chart rather than pulling in a charting library —
// this is the only chart in the app, a fixed-shape 30-point daily
// series, so a real dependency would be a lot of weight for one view.
export default function ViewsTrendChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">No view data yet.</p>;
  }

  const max = Math.max(1, ...data.map((d) => d.views));
  const barWidth = CHART_WIDTH / data.length - BAR_GAP;

  // Label the first, middle, and last day only — 30 daily labels would
  // just overlap into unreadable noise at this width.
  const labelIndexes = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const formatLabel = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 20}`} className="w-full" role="img" aria-label="Catalog views over the last 30 days">
        {data.map((d, i) => {
          const barHeight = (d.views / max) * CHART_HEIGHT;
          const x = i * (barWidth + BAR_GAP);
          const y = CHART_HEIGHT - barHeight;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, d.views > 0 ? 2 : 0)}
                rx={1.5}
                className="fill-primary-600"
              >
                <title>{`${d.date}: ${d.views} view${d.views === 1 ? '' : 's'}`}</title>
              </rect>
              {labelIndexes.has(i) && (
                <text x={x + barWidth / 2} y={CHART_HEIGHT + 16} textAnchor="middle" className="fill-gray-400 text-[10px]">
                  {formatLabel(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
