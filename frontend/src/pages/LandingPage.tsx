import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  Check,
  Zap,
  Brain,
  Cpu,
  KeyRound,
  Unlock,
  Loader2,
  Database,
  Sparkles
} from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      })
      return
    }
    setIsSubmitted(true)
    toast({
      title: "You're on the list!",
      description: "We'll notify you when Klaaro launches.",
    })
    setEmail('')
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      toast({
        title: 'Enter a code',
        description: 'Please enter your early access code.',
        variant: 'destructive',
      })
      return
    }

    setIsVerifying(true)
    await new Promise(resolve => setTimeout(resolve, 800))

    const success = login(code)
    if (success) {
      toast({
        title: 'Access Granted!',
        description: 'Welcome to Klaaro. Redirecting to dashboard...',
      })
      setTimeout(() => navigate('/dashboard'), 1000)
    } else {
      toast({
        title: 'Wrong Code',
        description: 'The code you entered is invalid. Please try again.',
        variant: 'destructive',
      })
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 container mx-auto px-6 py-20 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Database className="w-12 h-12 md:w-16 md:h-16 text-white" />
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-4">
            Klaaro
          </h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-gray-400 mb-6 tracking-wide uppercase">
            Turn thoughts into reality
          </p>

          {/* Main headline */}
          <div className="max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Build <span className="text-blue-500">AI Models</span> in Minutes
            </h2>
            <p className="text-lg md:text-xl text-gray-400 mt-6 leading-relaxed">
              No-code AI platform that transforms your ideas into production-ready machine learning models.
              Deploy, scale, and iterate faster than ever.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {[
              { icon: Zap, text: 'Lightning Fast' },
              { icon: Brain, text: 'Zero ML Knowledge' },
              { icon: Cpu, text: 'Auto-Deploy' },
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full">
                <feature.icon className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-white">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Waitlist Form */}
          <div className="max-w-lg mx-auto">
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 p-2 bg-gray-800/50 border border-gray-700 rounded-xl backdrop-blur-sm">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 bg-gray-900/50 border-0 text-white placeholder:text-gray-500"
                disabled={isSubmitted}
              />
              <Button
                type="submit"
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitted}
              >
                {isSubmitted ? (
                  <><Check className="w-4 h-4 mr-2" /> Joined</>
                ) : (
                  <>Join Waitlist <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
            <p className="text-sm text-gray-500 mt-4">
              Be the first to build the future. No spam, ever.
            </p>
          </div>
        </div>
      </section>

      {/* Early Access Section */}
      <section className="py-24 bg-gray-800/50 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        
        <div className="container mx-auto px-6">
          <div className="max-w-xl mx-auto text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
              {isAuthenticated ? (
                <Unlock className="w-8 h-8 text-blue-500" />
              ) : (
                <KeyRound className="w-8 h-8 text-blue-500" />
              )}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Early Access
            </h2>
            
            <p className="text-gray-400 mb-8">
              {isAuthenticated 
                ? "You have early access! Go to the dashboard to start building."
                : "Have an access code? Enter it below to unlock Klaaro early."
              }
            </p>

            {!isAuthenticated ? (
              <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <Input
                  type="text"
                  placeholder="ENTER-CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isVerifying}
                  className="flex-1 h-12 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-center tracking-[0.3em] uppercase font-mono"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isVerifying}
                  className="h-12 px-6"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-white font-semibold text-lg">You're in!</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Start building AI models with our AutoML platform.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {!isAuthenticated && (
              <p className="text-sm text-gray-500 mt-6">
                Don't have a code? <a href="#" className="text-blue-500 hover:underline">Join the waitlist above</a>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-500" />
              <span className="font-semibold text-white">Klaaro</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 Klaaro. Building the future of AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
