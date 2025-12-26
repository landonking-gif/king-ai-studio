import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TaskDistributionChart } from "@/components/dashboard/TaskDistributionChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Target,
  Clock,
} from "lucide-react";

const taskVelocityData = [
  { day: "Mon", completed: 12, created: 15 },
  { day: "Tue", completed: 18, created: 14 },
  { day: "Wed", completed: 15, created: 20 },
  { day: "Thu", completed: 22, created: 18 },
  { day: "Fri", completed: 19, created: 16 },
  { day: "Sat", completed: 8, created: 5 },
  { day: "Sun", completed: 6, created: 4 },
];

const modelUsageData = [
  { name: "Gemini 1.5 Pro", requests: 1245, cost: 45.20 },
  { name: "Ollama (Local)", requests: 3420, cost: 0 },
  { name: "OpenAI GPT-4", requests: 89, cost: 12.50 },
  { name: "Anthropic Claude", requests: 156, cost: 8.30 },
];

const customerGrowthData = [
  { month: "Jul", customers: 120 },
  { month: "Aug", customers: 180 },
  { month: "Sep", customers: 245 },
  { month: "Oct", customers: 320 },
  { month: "Nov", customers: 410 },
  { month: "Dec", customers: 487 },
];

const AnalyticsPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold gold-text">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep insights into your empire's performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue (MTD)"
            value="$22,847"
            change={18.5}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Customers"
            value="487"
            change={24.2}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Task Success Rate"
            value="94.2%"
            change={2.1}
            icon={<Target className="w-5 h-5" />}
          />
          <MetricCard
            title="Avg. Task Duration"
            value="4.2m"
            change={-15}
            changeLabel="faster"
            icon={<Clock className="w-5 h-5" />}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart />
          
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-4">Customer Growth</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 20%)" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(220 15% 55%)"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(220 15% 55%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 9%)",
                      border: "1px solid hsl(222 30% 18%)",
                      borderRadius: "8px",
                      color: "hsl(45 20% 95%)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="customers"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(142 71% 45%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-4">Task Velocity</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskVelocityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 20%)" />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(220 15% 55%)"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(220 15% 55%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222 47% 9%)",
                      border: "1px solid hsl(222 30% 18%)",
                      borderRadius: "8px",
                      color: "hsl(45 20% 95%)",
                    }}
                  />
                  <Bar dataKey="created" fill="hsl(222 30% 40%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="hsl(43 74% 49%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <TaskDistributionChart />

          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold mb-4">AI Model Usage</h3>
            <div className="space-y-4">
              {modelUsageData.map((model) => (
                <div key={model.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{model.name}</span>
                    <span className="text-muted-foreground">
                      {model.requests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${(model.requests / 3420) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    Cost: ${model.cost.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            AI Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <h4 className="font-medium text-success mb-2">Strengths</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• SEO optimization achieving 23% better rankings</li>
                <li>• Content generation 40% faster than baseline</li>
                <li>• Customer support automation at 94% accuracy</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <h4 className="font-medium text-warning mb-2">Areas for Improvement</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Database migrations need more testing</li>
                <li>• Payment integration requires manual review</li>
                <li>• Complex legal documents need human oversight</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <h4 className="font-medium text-primary mb-2">Recommendations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Enable Ollama for 40% cost reduction</li>
                <li>• Consider adding Claude for legal analysis</li>
                <li>• Batch similar tasks for efficiency gains</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
