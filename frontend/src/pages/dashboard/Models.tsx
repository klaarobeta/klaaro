import { Brain, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Models() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Models</h1>
          <p className="text-gray-500">View and manage your trained models</p>
        </div>
        <Link to="/dashboard/new-project">
          <Button><Plus className="w-4 h-4 mr-2" />Train New Model</Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search models..." className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No models yet</h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">
          Train your first model by creating a new AutoML project.
        </p>
        <Link to="/dashboard/new-project">
          <Button><Plus className="w-4 h-4 mr-2" />Train Your First Model</Button>
        </Link>
      </div>
    </div>
  )
}
