import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Success = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const [status, setStatus] = useState<"loading" | "paid" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Payment confirmed — LikeTony.ai";
    if (!sessionId) {
      setStatus("error");
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId },
      });
      if (error || !data?.paid) {
        setStatus("error");
        return;
      }
      setEmail(data.email ?? null);
      setStatus("paid");
    })();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-b from-background to-card/40">
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-8 sm:p-10 shadow-xl">
        {status === "loading" && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Confirming your payment…</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center text-center gap-4">
            <h1 className="font-display text-2xl font-semibold">We couldn't confirm your payment</h1>
            <p className="text-muted-foreground">
              If you were charged, please contact us at{" "}
              <a className="text-primary underline" href="mailto:hello@liketony.ai">hello@liketony.ai</a> and we'll
              sort it out right away.
            </p>
            <Link to="/">
              <Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back home</Button>
            </Link>
          </div>
        )}

        {status === "paid" && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Congratulations — you're in! 🎉
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Thank you for your purchase. Your rewritten landing is ready.
            </p>

            <div className="w-full rounded-xl border border-border/60 bg-background/40 p-4 text-left flex gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Check your inbox</p>
                <p className="text-muted-foreground">
                  We've just emailed your download link{email ? <> to <span className="text-foreground">{email}</span></> : null}.
                  It may take up to a minute to arrive. Don't forget to peek into spam.
                </p>
              </div>
            </div>

            <div className="w-full rounded-xl border border-border/60 bg-background/40 p-4 text-left flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">New heroes every day</p>
                <p className="text-muted-foreground">
                  We're adding fresh personas constantly — come back soon to rewrite your landing in another voice.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Need help or have feedback? Reach out at{" "}
              <a className="text-primary underline" href="mailto:hello@liketony.ai">hello@liketony.ai</a> — we read
              every message.
            </p>

            <Link to="/" className="mt-2">
              <Button><ArrowLeft className="w-4 h-4 mr-1.5" /> Back to LikeTony.ai</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Success;
