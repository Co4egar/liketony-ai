import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-html`;

export default function Download() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Preparing your file…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (!session) {
      setStatus("error");
      setMessage("This link is invalid");
      return;
    }

    (async () => {
      try {
        const resp = await fetch(`${FUNCTIONS_URL}?session=${encodeURIComponent(session)}`);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Error ${resp.status}`);
        }
        const disposition = resp.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match?.[1] || "rewrite.html";
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage("Done! Your file has been downloaded. You can close this tab.");
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to download the file");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        {status === "loading" && (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        )}
        <h1 className="text-2xl font-display">{status === "error" ? "Error" : "Downloading"}</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
