import { Workflow, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Pipelines() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-500">Manage your ML pipelines</p>
        </div>
        <Button disabled><Plus className="w-4 h-4 mr-2" />Create Pipeline</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
        <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No pipelines yet</h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">
          Pipelines automate your ML workflow. Coming soon in future updates.
        </p>
        <Button disabled><Plus className="w-4 h-4 mr-2" />Coming Soon</Button>
      </div>
    </div>
  )
}
