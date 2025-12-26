import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "Completed", value: 45, color: "hsl(142 71% 45%)" },
  { name: "Running", value: 12, color: "hsl(43 74% 49%)" },
  { name: "Pending", value: 8, color: "hsl(38 92% 50%)" },
  { name: "Failed", value: 3, color: "hsl(0 72% 51%)" },
];

export function TaskDistributionChart() {
  return (
    <div className="glass-card p-5">
      <h3 className="text-lg font-semibold mb-4">Task Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 47% 9%)",
                border: "1px solid hsl(222 30% 18%)",
                borderRadius: "8px",
                color: "hsl(45 20% 95%)",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: "hsl(45 20% 90%)" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
