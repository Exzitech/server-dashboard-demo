import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewPoint } from '../lib/aggregate';
import { formatHour, formatLatency } from '../lib/format';
import ChartTooltip from './ChartTooltip';

interface Props {
  data: OverviewPoint[];
}

const AXIS = { fill: '#5C6675', fontSize: 10 };

/** Latence p95 pondérée sur 24 h. Aplat, pas de dégradé. */
export default function LatencyChart({ data }: Props) {
  return (
    <section className="rounded border border-line bg-surface p-3">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-faint">
        p95 latency · 24h
      </h2>
      <div className="mt-2 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
          >
            <CartesianGrid stroke="#232A36" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              scale="time"
              tickFormatter={formatHour}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: '#232A36' }}
              minTickGap={48}
            />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => `${Math.round(v)} ms`}
            />
            <Tooltip
              content={<ChartTooltip format={formatLatency} />}
              cursor={{ stroke: '#2E3746' }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              name="p95 latency"
              stroke="#58A6FF"
              strokeWidth={1.5}
              fill="#58A6FF"
              fillOpacity={0.1}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
