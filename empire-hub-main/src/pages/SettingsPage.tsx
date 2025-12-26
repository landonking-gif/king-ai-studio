import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Key,
  Bell,
  Shield,
  Cpu,
  Globe,
  Save,
} from "lucide-react";

const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold gold-text">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your empire's autonomous operations
          </p>
        </div>

        {/* API Configuration */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">API Configuration</h2>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Gemini API Key</Label>
              <div className="flex gap-3">
                <Input
                  type="password"
                  defaultValue="AIza************************"
                  className="bg-secondary/50 border-border/50"
                />
                <Button variant="outline">Update</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>OpenAI API Key (Optional)</Label>
              <div className="flex gap-3">
                <Input
                  type="password"
                  placeholder="sk-..."
                  className="bg-secondary/50 border-border/50"
                />
                <Button variant="outline">Add</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Model Configuration</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Primary Model</p>
                <p className="text-sm text-muted-foreground">
                  Main reasoning engine for complex tasks
                </p>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                Gemini 1.5 Pro
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Local Fallback (Ollama)</p>
                <p className="text-sm text-muted-foreground">
                  Free local processing for batch operations
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Auto-Failover</p>
                <p className="text-sm text-muted-foreground">
                  Automatically switch models on failure
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Governance Settings */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Governance & Safety</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Legal Approval Required</p>
                <p className="text-sm text-muted-foreground">
                  Pause for approval on legal decisions
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Financial Threshold</p>
                <p className="text-sm text-muted-foreground">
                  Require approval for spending above
                </p>
              </div>
              <Input
                type="number"
                defaultValue="100"
                className="w-24 bg-secondary/50 text-right"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Self-Critique Loop</p>
                <p className="text-sm text-muted-foreground">
                  Enable recursive evaluation before execution
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for critical events
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
              <div>
                <p className="font-medium">Daily Summary</p>
                <p className="text-sm text-muted-foreground">
                  Morning briefing on empire status
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Server Info */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Server Information</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-muted-foreground">Instance</p>
              <p className="font-mono">m7i.4xlarge</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-muted-foreground">Region</p>
              <p className="font-mono">us-east-2</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-muted-foreground">Dashboard Port</p>
              <p className="font-mono">3847</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30">
              <p className="text-muted-foreground">Status</p>
              <Badge className="bg-success/20 text-success">Online</Badge>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button className="gap-2 bg-primary text-primary-foreground">
          <Save className="w-4 h-4" />
          Save All Settings
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
