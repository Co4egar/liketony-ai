import { useState } from "react";
import { Mail, Loader2, Download as DownloadIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  publicId: string;
  className?: string;
  buttonClassName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DownloadEmailGate({ publicId, className, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-download-link", {
        body: { publicId, email },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSent(email);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className={cn("rounded-xl border border-primary/40 bg-primary/10 p-3 flex items-start gap-2.5", className)}>
        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm leading-snug">
          <div className="font-medium text-foreground">Sent! Check your inbox.</div>
          <div className="text-muted-foreground">
            Download link emailed to <span className="text-foreground">{sent}</span>.
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("w-full justify-start gap-2", buttonClassName)}
      >
        <DownloadIcon className="w-4 h-4" />
        Download HTML
        <span className="ml-auto text-[10px] uppercase tracking-wider opacity-80">Free</span>
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className={cn("space-y-2", className)}>
      <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Mail className="w-3 h-3" /> Where do we send it?
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 min-w-0 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button type="submit" disabled={sending} size="sm" className="shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Free. We'll email the download link.</p>
    </form>
  );
}
