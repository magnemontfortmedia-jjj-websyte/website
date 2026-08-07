import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Product catalog (server-side source of truth for prices)
const PRODUCTS: Record<string, { name: string; price: number; image: string }> = {
  bomber: {
    name: "Shearling Bomber Jacket",
    price: 50000, // cents
    image: "https://magnemontfort.com/assets/images/bomber.png",
  },
  cable_knit: {
    name: "Cable Knit Sweater",
    price: 30000,
    image: "https://magnemontfort.com/assets/images/cable_knit.png",
  },
  trousers: {
    name: "Tailored Trousers",
    price: 20000,
    image: "https://magnemontfort.com/assets/images/trousers_navy.png",
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { items, success_url, cancel_url } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build Stripe line items from cart
    const line_items = items.map((item: { productId: string; size: string; qty: number; color?: string }) => {
      const product = PRODUCTS[item.productId];
      if (!product) {
        throw new Error(`Unknown product: ${item.productId}`);
      }

      const colorLabel = item.color
        ? ` — ${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`
        : "";

      return {
        price_data: {
          currency: "aud",
          product_data: {
            name: product.name,
            description: `Size: ${item.size}${colorLabel}`,
            images: [product.image],
          },
          unit_amount: product.price,
        },
        quantity: item.qty,
      };
    });

    // Create Stripe Checkout Session
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        flattenParams({
          mode: "payment",
          line_items,
          shipping_address_collection: {
            allowed_countries: ["AU", "US", "GB", "NZ", "CA", "FR", "DE", "IT", "ES", "JP"],
          },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: 0, currency: "aud" },
                display_name: "Complimentary Shipping",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 5 },
                  maximum: { unit: "business_day", value: 7 },
                },
              },
            },
            {
              shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: { amount: 2500, currency: "aud" },
                display_name: "Express Shipping",
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 2 },
                  maximum: { unit: "business_day", value: 3 },
                },
              },
            },
          ],
          success_url: success_url || "https://magnemontfort.com/order-confirmation.html?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: cancel_url || "https://magnemontfort.com/index.html",
        })
      ),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe API error:", session);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session", details: session }),
        {
          status: stripeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error creating checkout:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Flatten nested objects into Stripe's URL-encoded format
 * e.g., { line_items: [{ price_data: { currency: "aud" } }] }
 * becomes "line_items[0][price_data][currency]=aud"
 */
function flattenParams(
  obj: Record<string, unknown>,
  prefix = ""
): [string, string][] {
  const pairs: [string, string][] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          pairs.push(...flattenParams(item as Record<string, unknown>, `${fullKey}[${index}]`));
        } else {
          pairs.push([`${fullKey}[${index}]`, String(item)]);
        }
      });
    } else if (typeof value === "object" && value !== null) {
      pairs.push(...flattenParams(value as Record<string, unknown>, fullKey));
    } else {
      pairs.push([fullKey, String(value)]);
    }
  }

  return pairs;
}
