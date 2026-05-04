import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const StripePage = () => {
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();

  useEffect(() => {
    const status = params.get("status");
    if (status === "success") toast({ title: "Платёж выполнен", description: "Спасибо за покупку!" });
    if (status === "cancel") toast({ title: "Платёж отменён", variant: "destructive" });
  }, [params]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать сессию",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pro Access</CardTitle>
          <CardDescription>Единоразовая оплата через Stripe Checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold">$9.99</div>
          <Button onClick={handleCheckout} disabled={loading} className="w-full" size="lg">
            {loading ? "Создаём сессию..." : "Оплатить"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default StripePage;
