import { FolderOpen, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Projects() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage all your AutoML projects</p>
        </div>
        <Link to="/dashboard/new-project">
          <Button><Plus className="w-4 h-4 mr-2" />New Project</Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search projects..." className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">
          Create your first AutoML project to start building AI models.
        </p>
        <Link to="/dashboard/new-project">
          <Button><Plus className="w-4 h-4 mr-2" />Create First Project</Button>
        </Link>
      </div>
    </div>
  )
}
