import { LineChart, Activity, AlertCircle, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Monitoring = () => {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
        <p className="text-muted-foreground">Monitor your models and system performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Models', value: '0', icon: Server },
          { label: 'Predictions Today', value: '0', icon: Activity },
          { label: 'Avg Latency', value: '--ms', icon: LineChart },
          { label: 'Alerts', value: '0', icon: AlertCircle },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No data to display</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Deploy a model to start seeing performance metrics, prediction counts,
            and latency data here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monitoring;
