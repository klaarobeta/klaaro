import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Database,
  Brain,
  ArrowRight,
  Clock,
  TrendingUp,
  Zap,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const quickActions = [
  {
    icon: Sparkles,
    title: 'New AutoML Project',
    description: 'Start a new project with AI-assisted model building',
    href: '/dashboard/new-project',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Database,
    title: 'Upload Dataset',
    description: 'Upload and manage your training data',
    href: '/dashboard/datasets',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Brain,
    title: 'View Models',
    description: 'Manage your trained models',
    href: '/dashboard/models',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

const stats = [
  { label: 'Datasets', value: '0', icon: Database, change: 'Upload your first dataset' },
  { label: 'Models Trained', value: '0', icon: Brain, change: 'Start training' },
  { label: 'Experiments', value: '0', icon: Target, change: 'Create experiment' },
  { label: 'Avg. Accuracy', value: '--%', icon: TrendingUp, change: 'Train a model' },
];

const DashboardHome = () => {
  const { accessCode } = useAuth();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome to Klaaro</h1>
        <p className="text-muted-foreground">
          Your AI-powered AutoML platform. Build production-ready models in minutes.
        </p>
        {accessCode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            <span>Early Access Active</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer h-full">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${action.bgColor} flex items-center justify-center mb-2`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80">
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Get Started with AutoML
          </CardTitle>
          <CardDescription>
            Follow these steps to build your first AI model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: 1, title: 'Describe Your Goal', desc: 'Tell us what you want to predict' },
              { step: 2, title: 'Upload Data', desc: 'Provide your training dataset' },
              { step: 3, title: 'Auto Analysis', desc: 'We analyze and prepare your data' },
              { step: 4, title: 'Train & Deploy', desc: 'Get a production-ready model' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/dashboard/new-project">
              <Button className="bg-primary hover:bg-primary/90">
                <Sparkles className="w-4 h-4 mr-2" />
                Start New Project
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
