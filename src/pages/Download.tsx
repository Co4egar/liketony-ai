import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/download-html`;

export default function Download() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Готовим ваш файл…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (!session) {
      setStatus("error");
      setMessage("Ссылка недействительна");
      return;
    }

    (async () => {
      try {
        const resp = await fetch(`${FUNCTIONS_URL}?session=${encodeURIComponent(session)}`);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Ошибка ${resp.status}`);
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
        setMessage("Готово! Файл скачан. Можно закрыть эту вкладку.");
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Не удалось скачать файл");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        {status === "loading" && (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        )}
        <h1 className="text-2xl font-display">{status === "error" ? "Ошибка" : "Скачивание"}</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
