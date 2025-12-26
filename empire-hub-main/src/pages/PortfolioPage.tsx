import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BusinessCard } from "@/components/portfolio/BusinessCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { _FALLBACK, loadRemote } from "@/data/mockData";
import { useEffect, useState } from "react";
import { Plus, Building2, TrendingUp, DollarSign, Users } from "lucide-react";

const PortfolioPage = () => {
  const [businessesState, setBusinessesState] = useState(_FALLBACK.businesses);

  useEffect(() => {
    let mounted = true;
    loadRemote().then((d) => {
      if (!mounted) return;
      setBusinessesState(d.businesses || _FALLBACK.businesses);
    });
    return () => { mounted = false };
  }, []);

  const totalRevenue = businessesState.reduce((sum, b) => sum + (b.revenue || 0), 0);
  const totalCustomers = businessesState.reduce((sum, b) => sum + (b.customers || 0), 0);
  const activeCount = businessesState.filter((b) => b.status === "active").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text">
              Business Portfolio
            </h1>
            <p className="text-muted-foreground mt-1">
              Your empire's ventures and holdings
            </p>
          </div>
          <Button className="gap-2 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" />
            Launch New Venture
          </Button>
        </div>

        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Ventures"
            value={businesses.length}
            icon={<Building2 className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Businesses"
            value={activeCount}
            change={25}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Combined Revenue"
            value={`$${(totalRevenue / 1000).toFixed(1)}K`}
            change={14}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Total Customers"
            value={totalCustomers}
            change={31}
            icon={<Users className="w-5 h-5" />}
          />
        </div>

        {/* Business Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Ventures</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessesState.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}

            {/* Add New Card */}
            <button className="glass-card border-dashed border-2 border-border hover:border-primary/50 p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Add New Venture</span>
              <span className="text-sm text-center">
                Let King AI research and build your next business
              </span>
            </button>
          </div>
        </div>

        {/* Portfolio Insights */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio Health Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-success">Strong Performers</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                  <span>CloudSync Pro</span>
                  <span className="text-success">+23% MoM</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3 text-warning">Needs Attention</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                  <span>QuickInvoice</span>
                  <span className="text-warning">-12% MoM</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                  <span>DataVault Analytics</span>
                  <span className="text-warning">-5% MoM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PortfolioPage;
