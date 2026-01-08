import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/klaaro-logo.png';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Sparkles, label: 'New Project', href: '/dashboard/new-project', badge: 'Start' },
  { icon: Database, label: 'Datasets', href: '/dashboard/datasets' },
  { icon: Brain, label: 'Models', href: '/dashboard/models' },
  { icon: FlaskConical, label: 'Experiments', href: '/dashboard/experiments' },
  { icon: Workflow, label: 'Pipelines', href: '/dashboard/pipelines' },
  { icon: LineChart, label: 'Monitoring', href: '/dashboard/monitoring' },
];

const bottomNavItems: NavItem[] = [
  { icon: FolderOpen, label: 'Projects', href: '/dashboard/projects' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent group',
          isActive && 'bg-sidebar-accent text-sidebar-primary',
          !isActive && 'text-sidebar-foreground/70'
        )}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-colors',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
        )} />
        {!collapsed && (
          <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge && (
              <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={logo} alt="Klaaro" className="w-10 h-10 rounded-lg object-cover" />
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground">Klaaro</h1>
              <p className="text-xs text-sidebar-foreground/50">AutoML Platform</p>
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
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        
        {/* Logout Button */}
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
            'hover:bg-destructive/10 text-sidebar-foreground/70 hover:text-destructive group'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
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
  );
};

export default Sidebar;
