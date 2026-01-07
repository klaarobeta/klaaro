import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Unlock, Terminal, Code2 } from "lucide-react";

const VALID_CODE = "lolamlol";

const EarlyAccessSection = () => {
  const [code, setCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter your early access code.",
        variant: "destructive",
      });
      return;
    }

    if (code.toLowerCase() === VALID_CODE) {
      setIsVerified(true);
      toast({
        title: "Access Granted!",
        description: "Please wait for some days. We'll be in touch soon!",
      });
    } else {
      toast({
        title: "Wrong Code",
        description: "The code you entered is invalid. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {/* Code decoration */}
      <div className="absolute top-10 left-10 text-muted-foreground/10 hidden lg:block">
        <Code2 className="w-20 h-20" />
      </div>
      <div className="absolute bottom-10 right-10 text-muted-foreground/10 hidden lg:block">
        <Terminal className="w-20 h-20" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 mb-6">
            {isVerified ? (
              <Unlock className="w-8 h-8 text-primary" />
            ) : (
              <KeyRound className="w-8 h-8 text-primary" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Early Access
          </h2>
          
          <p className="text-muted-foreground mb-8">
            Have an access code? Enter it below to unlock Klaaro early.
          </p>

          {/* Code Form */}
          {!isVerified ? (
            <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <Input
                type="text"
                placeholder="ENTER-CODE"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 h-12 bg-background border-border text-foreground placeholder:text-muted-foreground text-center tracking-[0.3em] uppercase font-mono"
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-12 px-6 bg-secondary text-secondary-foreground hover:bg-muted transition-all duration-300"
              >
                Verify
              </Button>
            </form>
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <p className="text-foreground font-semibold text-lg">
                You're in!
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Please wait for some days. We'll send you an email with further instructions.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            Don't have a code? <a href="#" className="text-primary hover:underline">Join the waitlist above</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default EarlyAccessSection;
