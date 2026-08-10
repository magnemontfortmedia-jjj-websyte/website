import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface CartItem {
  productId: string;
  size: string;
  qty: number;
  color?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { items, success_url, cancel_url, previous_session_id } = await req.json();

    // ---------- Expire Previous Session & Release Stock ----------
    if (previous_session_id) {
      try {
        // Fetch the old session to get its reserved items
        const oldSessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${previous_session_id}`, {
          headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
        
        if (oldSessionRes.ok) {
          const oldSession = await oldSessionRes.json();
          
          if (oldSession.status === 'open' && oldSession.metadata?.reserved_items) {
            // Expire it in Stripe
            await fetch(`https://api.stripe.com/v1/checkout/sessions/${previous_session_id}/expire`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
            });
            
            // Release the stock synchronously using our idempotent RPC
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/release_session_stock`, {
              method: "POST",
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                p_session_id: previous_session_id,
                p_items: JSON.parse(oldSession.metadata.reserved_items),
              }),
            });
          }
        }
      } catch (err) {
        console.error("Error expiring previous session:", err);
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "No items provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---------- Atomic Stock Reservation ----------
    // Reserve stock for each item BEFORE creating the Stripe session.
    // If any reservation fails, roll back all previous reservations.
    const reservedItems: CartItem[] = [];

    for (const item of items as CartItem[]) {
      const product = PRODUCTS[item.productId];
      if (!product) {
        // Roll back any already-reserved items
        await rollbackReservations(reservedItems);
        return new Response(
          JSON.stringify({ error: `Unknown product: ${item.productId}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Call the atomic reserve_stock function
      const reserveRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reserve_stock`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_product_id: item.productId,
          p_size: item.size,
          p_color: item.color || null,
          p_qty: item.qty,
        }),
      });

      const rowsAffected = await reserveRes.json();

      if (rowsAffected === 0) {
        // Reservation failed — not enough stock
        await rollbackReservations(reservedItems);

        const colorLabel = item.color
          ? ` in ${item.color.charAt(0).toUpperCase() + item.color.slice(1)}`
          : "";

        return new Response(
          JSON.stringify({
            error: `Sorry, ${product.name} (Size ${item.size}${colorLabel}) is no longer available.`,
            out_of_stock: true,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Track this reservation so we can roll back if a later item fails
      reservedItems.push(item);
    }

    // ---------- Build Stripe Line Items ----------
    const line_items = (items as CartItem[]).map((item) => {
      const product = PRODUCTS[item.productId]!;
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

    // ---------- Create Stripe Checkout Session ----------
    // 30-minute expiry so reserved stock isn't held forever
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        flattenParams({
          mode: "payment",
          expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
          line_items,
          metadata: {
            reserved_items: JSON.stringify(items),
          },
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
      // Roll back stock since Stripe session creation failed
      await rollbackReservations(reservedItems);
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
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Roll back stock reservations for items that were already reserved
 */
async function rollbackReservations(items: CartItem[]) {
  // Use a temporary unique session ID for the rollback so it fits our idempotent RPC
  const tempSessionId = 'rollback_' + crypto.randomUUID();
  
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/release_session_stock`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_session_id: tempSessionId,
        p_items: items,
      }),
    });
  } catch (err) {
    console.error("Failed to rollback stock", err);
  }
}

/**
 * Flatten nested objects into Stripe's URL-encoded format
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
