import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "validating" | "ready" | "confirming" | "done" | "invalid";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("validating");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Unsubscribe — LikeTony.ai";
    if (!token) {
      setStatus("invalid");
      setMessage("Missing or invalid unsubscribe link.");
      return;
    }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) {
          setStatus("invalid");
          setMessage("This unsubscribe link is no longer valid.");
          return;
        }
        setStatus("ready");
      } catch {
        setStatus("invalid");
        setMessage("Couldn't verify this link. Please try again later.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setStatus("confirming");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) {
      setStatus("invalid");
      setMessage("Couldn't unsubscribe. Please try again.");
      return;
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/40 p-8 space-y-5">
        {status === "validating" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying your link…</p>
          </>
        )}
        {status === "ready" && (
          <>
            <h1 className="font-display text-2xl">Unsubscribe</h1>
            <p className="text-muted-foreground">
              Confirm to stop receiving emails from LikeTony.ai.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}
        {status === "confirming" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Unsubscribing…</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h1 className="font-display text-2xl">You're unsubscribed</h1>
            <p className="text-muted-foreground">
              You won't receive any more emails from us.
            </p>
            <Link to="/"><Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back home</Button></Link>
          </>
        )}
        {status === "invalid" && (
          <>
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <h1 className="font-display text-2xl">Link not valid</h1>
            <p className="text-muted-foreground">{message}</p>
            <Link to="/"><Button variant="secondary"><ArrowLeft className="w-4 h-4 mr-1.5" /> Back home</Button></Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
