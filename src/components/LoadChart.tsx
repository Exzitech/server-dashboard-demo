import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OverviewPoint } from '../lib/aggregate';
import { formatHour, formatPercent } from '../lib/format';
import ChartTooltip from './ChartTooltip';

interface Props {
  data: OverviewPoint[];
}

const AXIS = { fill: '#5C6675', fontSize: 10 };

/** Charge moyenne des services en ligne sur 24 h : CPU et mémoire. */
export default function LoadChart({ data }: Props) {
  return (
    <section className="rounded border border-line bg-surface p-3">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-faint">
        Average load · 24h
      </h2>
      <div className="mt-2 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              content={<ChartTooltip format={(v) => formatPercent(v, 1)} />}
              cursor={{ stroke: '#2E3746' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={20}
              iconType="plainline"
              iconSize={10}
              wrapperStyle={{ fontSize: 10, color: '#8A94A6' }}
            />
            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#58A6FF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="memory"
              name="Memory"
              stroke="#D29922"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
