import { Settings as SettingsIcon, User, Bell, Key, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'

export default function Settings() {
  const { logout } = useAuth()

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Profile</h3>
            <p className="text-sm text-gray-500">Your account information</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input placeholder="your@email.com" />
          </div>
        </div>
        <Button>Save Changes</Button>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">Configure how you receive updates</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Training completed', desc: 'Get notified when model training finishes' },
            { label: 'Weekly reports', desc: 'Receive weekly usage summaries' },
            { label: 'System alerts', desc: 'Important updates about the platform' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <Switch />
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-900">API Keys</h3>
            <p className="text-sm text-gray-500">Manage your API access keys</p>
          </div>
        </div>
        <p className="text-gray-500 mb-4">
          API keys will be available when you deploy models.
        </p>
        <Button variant="outline" disabled>Generate API Key</Button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">Irreversible actions</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Log out</p>
            <p className="text-sm text-gray-500">End your current session</p>
          </div>
          <Button variant="destructive" onClick={logout}>Log Out</Button>
        </div>
      </div>
    </div>
  )
}
