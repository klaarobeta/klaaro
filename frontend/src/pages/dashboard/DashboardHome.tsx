import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sparkles,
  Database,
  Brain,
  ArrowRight,
  Clock,
  TrendingUp,
  Zap,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const quickActions = [
  {
    icon: Sparkles,
    title: 'New AutoML Project',
    description: 'Start a new project with AI-assisted model building',
    href: '/dashboard/new-project',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    icon: Database,
    title: 'Upload Dataset',
    description: 'Upload and manage your training data',
    href: '/dashboard/datasets',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Brain,
    title: 'View Models',
    description: 'Manage your trained models',
    href: '/dashboard/models',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
]

const stats = [
  { label: 'Datasets', value: '0', icon: Database, change: 'Upload your first dataset' },
  { label: 'Models Trained', value: '0', icon: Brain, change: 'Start training' },
  { label: 'Experiments', value: '0', icon: Target, change: 'Create experiment' },
  { label: 'Avg. Accuracy', value: '--%', icon: TrendingUp, change: 'Train a model' },
]

export default function DashboardHome() {
  const { accessCode } = useAuth()

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Klaaro</h1>
        <p className="text-gray-500">
          Your AI-powered AutoML platform. Build production-ready models in minutes.
        </p>
        {accessCode && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Zap className="w-4 h-4 text-blue-500" />
            <span>Early Access Active</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 p-6 h-full">
                <div className={`w-12 h-12 rounded-lg ${action.bgColor} flex items-center justify-center mb-4`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{action.description}</p>
                <Button variant="ghost" className="p-0 h-auto text-blue-600 hover:text-blue-700">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Get Started with AutoML</h3>
        </div>
        <p className="text-gray-600 text-sm mb-6">Follow these steps to build your first AI model</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Describe Your Goal', desc: 'Tell us what you want to predict' },
            { step: 2, title: 'Upload Data', desc: 'Provide your training dataset' },
            { step: 3, title: 'Auto Analysis', desc: 'We analyze and prepare your data' },
            { step: 4, title: 'Train & Deploy', desc: 'Get a production-ready model' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <Link to="/dashboard/new-project">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Start New Project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
