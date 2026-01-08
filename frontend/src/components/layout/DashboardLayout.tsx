import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Database,
  Brain,
  Sparkles,
  FlaskConical,
  LineChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Workflow,
} from 'lucide-react'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Sparkles, label: 'New Project', href: '/dashboard/new-project', badge: 'Start' },
  { icon: Database, label: 'Datasets', href: '/dashboard/datasets' },
  { icon: Brain, label: 'Models', href: '/dashboard/models' },
  { icon: FlaskConical, label: 'Experiments', href: '/dashboard/experiments' },
  { icon: Workflow, label: 'Pipelines', href: '/dashboard/pipelines' },
  { icon: LineChart, label: 'Monitoring', href: '/dashboard/monitoring' },
]

const bottomNavItems: NavItem[] = [
  { icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { logout } = useAuth()

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href
    const Icon = item.icon

    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-gray-100 group',
          isActive && 'bg-blue-50 text-blue-600',
          !isActive && 'text-gray-600'
        )}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-colors',
          isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
        )} />
        {!collapsed && (
          <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-gray-900">Klaaro</h1>
                <p className="text-xs text-gray-500">AutoML Platform</p>
              </div>
            )}
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-3 border-t border-gray-200 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-red-50 text-gray-600 hover:text-red-600 group'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>

        {/* Collapse Button */}
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
