import { useEffect, useRef, useState } from "react";
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

type FunctionInvokeOptions = {
  headers?: Record<string, string>;
  body?: unknown;
};

const invokeWithTimeout = async <T,>(name: string, timeoutMs = 15000, options?: FunctionInvokeOptions) => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      supabase.functions.invoke<T>(name, options),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

export function SubscriptionGate({ open, onOpenChange, onSubscribed }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitingPayment, setWaitingPayment] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const pollRef = useRef<number | null>(null);
  const cooldownRef = useRef<number | null>(null);

  const startCooldown = (sec = 60) => {
    setResendIn(sec);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { if (cooldownRef.current) window.clearInterval(cooldownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const stopPolling = () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    setWaitingPayment(false);
  };

  const reset = () => { stopPolling(); setStep("email"); setEmail(""); setCode(""); };

  useEffect(() => () => stopPolling(), []);

  const sendCode = async (isResend = false) => {
    if (!email.trim()) return;
    if (isResend && resendIn > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Code sent! Check your email (use the LATEST code)");
      setStep("otp");
      setCode("");
      startCooldown(60);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally { setLoading(false); }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    const checkoutWindow = window.open("", "_blank");
    setLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) {
        if (error.message?.toLowerCase().includes("expired") || error.message?.toLowerCase().includes("invalid")) {
          throw new Error("Code expired or invalid. Use the most recent code from your email, or request a new one.");
        }
        throw error;
      }
      const headers = authData.session?.access_token
        ? { Authorization: `Bearer ${authData.session.access_token}` }
        : undefined;
      const { data, error: subscriptionError } = await invokeWithTimeout<{ subscribed?: boolean }>("check-subscription", 15000, { headers });
      if (subscriptionError) throw subscriptionError;
      if (data?.subscribed) {
        checkoutWindow?.close();
        toast.success("Welcome back! Subscription active");
        onSubscribed();
        onOpenChange(false);
        reset();
      } else {
        toast.info("Opening checkout...");
        setStep("paywall");
        await startCheckout(checkoutWindow, headers);
      }
    } catch (e) {
      checkoutWindow?.close();
      toast.error(e instanceof Error ? e.message : "Invalid code");
    } finally { setLoading(false); }
  };

  const startCheckout = async (checkoutWindow?: Window | null, headers?: Record<string, string>) => {
    const { data, error } = await invokeWithTimeout<{ url?: string }>("create-checkout", 15000, { headers });
    if (error) throw error;
    if (!data?.url) throw new Error("Checkout URL was not returned");

    if (checkoutWindow && !checkoutWindow.closed) {
      checkoutWindow.location.href = data.url;
    } else {
      const opened = window.open(data.url, "_blank");
      if (!opened) window.location.href = data.url;
    }

    setWaitingPayment(true);
    pollRef.current = window.setInterval(async () => {
      const { data: sub } = await invokeWithTimeout<{ subscribed?: boolean }>("check-subscription", 10000, { headers });
      if (sub?.subscribed) {
        stopPolling();
        toast.success("Payment confirmed! Downloading...");
        onSubscribed();
        onOpenChange(false);
        reset();
      }
    }, 3000);
  };

  const goCheckout = async () => {
    const checkoutWindow = window.open("", "_blank");
    setLoading(true);
    try {
      await startCheckout(checkoutWindow);
    } catch (e) {
      checkoutWindow?.close();
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
                onKeyDown={(e) => e.key === "Enter" && sendCode(false)} placeholder="you@example.com" />
              <Button onClick={() => sendCode(false)} disabled={loading || !email} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send code"}
              </Button>
            </div>
          </>
        )}
        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle>Enter verification code</DialogTitle>
              <DialogDescription>Sent to {email}. Use the most recent code if you requested several.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="code">Verification code</Label>
              <Input id="code" inputMode="numeric" autoFocus value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()} placeholder="Enter code from email" maxLength={10} />
              <Button onClick={verifyCode} disabled={loading || !code} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
              <button
                onClick={() => sendCode(true)}
                disabled={resendIn > 0 || loading}
                className="text-xs text-muted-foreground hover:underline w-full disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
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
              <Button onClick={goCheckout} disabled={loading || waitingPayment} className="w-full" size="lg">
                {loading || waitingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe with Stripe"}
              </Button>
              {waitingPayment && (
                <p className="text-xs text-center text-muted-foreground">
                  Waiting for payment confirmation... Complete checkout in the new tab.
                </p>
              )}
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
