import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Check, Zap, Brain, Cpu } from "lucide-react";
import logo from "@/assets/klaaro-logo.png";

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);
    toast({
      title: "You're on the list!",
      description: "We'll notify you when Klaaro launches.",
    });
    setEmail("");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated grid background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        {/* Glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-20 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img src={logo} alt="Klaaro" className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full drop-shadow-[0_0_30px_hsl(var(--primary)/0.5)]" />
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground mb-4">
          Klaaro
        </h1>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-muted-foreground mb-6 tracking-wide uppercase">
          Turn thoughts into reality
        </p>

        {/* Main headline */}
        <div className="max-w-3xl mx-auto mb-8">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Build <span className="text-primary">AI Models</span> in Minutes
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mt-6 leading-relaxed">
            No-code AI platform that transforms your ideas into production-ready machine learning models. 
            Deploy, scale, and iterate faster than ever.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Lightning Fast</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Zero ML Knowledge</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Auto-Deploy</span>
          </div>
        </div>

        {/* Waitlist Form */}
        <div className="max-w-lg mx-auto">
          <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-3 p-2 bg-card/50 border border-border rounded-xl backdrop-blur-sm">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 bg-background/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              disabled={isSubmitted}
            />
            <Button
              type="submit"
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-semibold"
              disabled={isSubmitted}
            >
              {isSubmitted ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Joined
                </>
              ) : (
                <>
                  Join Waitlist
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-4">
            Be the first to build the future. No spam, ever.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
