import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubscribed: () => void;
}

type Step = "email" | "otp" | "paywall";

export function SubscriptionGate({ open, onOpenChange, onSubscribed }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setStep("email"); setEmail(""); setCode(""); };

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Code sent! Check your email");
      setStep("otp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      // Check subscription
      const { data } = await supabase.functions.invoke("check-subscription");
      if (data?.subscribed) {
        toast.success("Welcome back! Subscription active");
        onSubscribed();
        onOpenChange(false);
        reset();
      } else {
        setStep("paywall");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally { setLoading(false); }
  };

  const goCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Sign in to download</DialogTitle>
              <DialogDescription>We'll email you a one-time code to verify.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()} placeholder="you@example.com" />
              <Button onClick={sendCode} disabled={loading || !email} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send code"}
              </Button>
            </div>
          </>
        )}
        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle>Enter verification code</DialogTitle>
              <DialogDescription>Sent to {email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="code">6-digit code</Label>
              <Input id="code" inputMode="numeric" autoFocus value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()} placeholder="123456" maxLength={6} />
              <Button onClick={verifyCode} disabled={loading || !code} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
              <button onClick={() => setStep("email")} className="text-xs text-muted-foreground hover:underline w-full">
                Use a different email
              </button>
            </div>
          </>
        )}
        {step === "paywall" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Pro Subscription</DialogTitle>
              <DialogDescription>Unlimited HTML downloads of rewritten landings.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-card/40 p-4 text-center">
                <div className="text-4xl font-bold">$19.99<span className="text-base font-normal text-muted-foreground">/mo</span></div>
                <div className="text-xs text-muted-foreground mt-1">Cancel anytime</div>
              </div>
              <Button onClick={goCheckout} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe with Stripe"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                After payment, your subscription will be active for {email}.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
