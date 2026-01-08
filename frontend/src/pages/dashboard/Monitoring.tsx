import { LineChart, Activity, AlertCircle, Server } from 'lucide-react'

export default function Monitoring() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-gray-500">Monitor your models and system performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Models', value: '0', icon: Server },
          { label: 'Predictions Today', value: '0', icon: Activity },
          { label: 'Avg Latency', value: '--ms', icon: LineChart },
          { label: 'Alerts', value: '0', icon: AlertCircle },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
        <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data to display</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Deploy a model to start seeing performance metrics.
        </p>
      </div>
    </div>
  )
}
