import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Jan", revenue: 4000, projected: 4200 },
  { name: "Feb", revenue: 5200, projected: 5000 },
  { name: "Mar", revenue: 4800, projected: 5500 },
  { name: "Apr", revenue: 7100, projected: 6000 },
  { name: "May", revenue: 8500, projected: 7000 },
  { name: "Jun", revenue: 9200, projected: 8500 },
  { name: "Jul", revenue: 11000, projected: 10000 },
];

export function RevenueChart() {
  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(43 74% 49%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(43 74% 49%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(222 30% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(222 30% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 20%)" />
            <XAxis
              dataKey="name"
              stroke="hsl(220 15% 55%)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(220 15% 55%)"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 47% 9%)",
                border: "1px solid hsl(222 30% 18%)",
                borderRadius: "8px",
                color: "hsl(45 20% 95%)",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="hsl(222 30% 50%)"
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorProjected)"
              name="Projected"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(43 74% 49%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
