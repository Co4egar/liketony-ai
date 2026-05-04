import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const { publicId, sourceUrl, personaName } = await req.json().catch(() => ({}));
    if (!publicId) throw new Error("publicId required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Stripe Checkout will collect the email on the hosted page automatically.
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1900,
            product_data: {
              name: "LikeTony.ai — HTML download",
              description: sourceUrl
                ? `Rewritten landing for ${sourceUrl}`
                : "One-time access to download your rewritten landing HTML.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        publicId,
        sourceUrl: sourceUrl ?? "",
        personaName: personaName ?? "",
      },
      success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?paid=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
