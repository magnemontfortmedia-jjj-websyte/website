import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    console.log("Stripe webhook event:", event.type);

    // ========== CHECKOUT SESSION COMPLETED ==========
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Checkout session completed:", session.id);

      // Stock was already deducted during reservation in create-checkout.
      // Just record the order.

      // Retrieve line items from Stripe
      const lineItemsResponse = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${session.id}/line_items`,
        {
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          },
        }
      );
      const lineItemsData = await lineItemsResponse.json();

      // Build order items array
      const orderItems = (lineItemsData.data || []).map((item: Record<string, unknown>) => ({
        name: (item.description as string) || (item.price as Record<string, unknown>)?.nickname || "Item",
        quantity: item.quantity,
        amount: (item.amount_total as number) / 100,
      }));

      // Build shipping address
      const shipping = session.shipping_details || session.customer_details;
      const shippingAddress = shipping?.address
        ? `${shipping.address.line1 || ""}${shipping.address.line2 ? ", " + shipping.address.line2 : ""}, ${shipping.address.city || ""}, ${shipping.address.state || ""} ${shipping.address.postal_code || ""}, ${shipping.address.country || ""}`
        : "Not provided";

      // Insert order into Supabase
      const orderData = {
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        customer_email: session.customer_details?.email || "",
        customer_name: session.customer_details?.name || "",
        shipping_name: shipping?.name || session.customer_details?.name || "",
        shipping_address: shippingAddress,
        items: orderItems,
        reserved_items: session.metadata?.reserved_items || "[]",
        subtotal: (session.amount_subtotal || 0) / 100,
        shipping_cost: (session.total_details?.amount_shipping || 0) / 100,
        total: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || "AUD",
        status: "paid",
      };

      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(orderData),
      });

      if (!supabaseResponse.ok) {
        const errData = await supabaseResponse.text();
        console.error("Failed to insert order:", errData);
      } else {
        console.log("Order saved successfully");
      }

      // Send order confirmation email via Resend
      if (RESEND_API_KEY && orderData.customer_email) {
        const firstName = orderData.customer_name.split(" ")[0] || "there";

        const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Order Confirmed - Magne Montfort</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; color: #111111; font-family: 'Inter', Helvetica, Arial, sans-serif;" bgcolor="#ffffff">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; width: 100%;">
    <tr>
      <td align="center" style="padding: 60px 20px; background-color: #ffffff;" bgcolor="#ffffff">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width: 600px; width: 100%; text-align: center; background-color: #ffffff; margin: 0 auto;">
          
          <tr>
            <td align="center" style="padding-bottom: 40px; background-color: #ffffff;" bgcolor="#ffffff">
              <img src="https://raw.githubusercontent.com/magnemontfortmedia-jjj-websyte/website/main/assets/images/putinemail.png" alt="Magne Montfort" width="240" style="display: block; border: 0; max-width: 100%; height: auto; margin: 0 auto; background-color: #ffffff;">
            </td>
          </tr>
          
          <tr>
            <td align="center" style="background-color: #ffffff;" bgcolor="#ffffff">
              <p style="margin: 0 0 20px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 20px; color: #111111; font-weight: 400; line-height: 1.5;">
                Order Confirmed
              </p>
              <p style="margin: 0 0 20px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 15px; color: #444444; font-weight: 400; line-height: 1.5;">
                Thank you for your purchase, ${firstName}. Your order of $${orderData.total.toFixed(2)} ${orderData.currency} has been received.
              </p>
              <p style="margin: 0 0 25px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 14px; color: #555555; font-weight: 400; line-height: 1.6;">
                We are preparing your order and will notify you once it has shipped.
              </p>
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; color: #888888; font-weight: 400;">
                Order reference: ${session.id.slice(-8).toUpperCase()}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Magne Montfort <hello@magnemontfort.com>",
            to: [orderData.customer_email],
            subject: "Your Magne Montfort Order is Confirmed",
            html: htmlEmail,
          }),
        });

        console.log("Confirmation email sent to", orderData.customer_email);
      }
    }

    // ========== CHECKOUT SESSION EXPIRED ==========
    // Customer abandoned checkout — release reserved stock
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      console.log("Checkout session expired:", session.id);

      const reservedItemsStr = session.metadata?.reserved_items;
      if (reservedItemsStr) {
        try {
          const reservedItems = JSON.parse(reservedItemsStr);

          for (const item of reservedItems) {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/release_stock`, {
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
          }

          console.log("Released stock for expired session:", session.id);
        } catch (err) {
          console.error("Failed to release stock for expired session:", err);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
