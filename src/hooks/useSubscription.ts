import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setSubscribed(false);
        setEmail(null);
        return;
      }
      setEmail(session.user.email);
      const { data } = await supabase.functions.invoke("check-subscription");
      setSubscribed(!!data?.subscribed);
    } catch {
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { loading, subscribed, email, refresh };
}
