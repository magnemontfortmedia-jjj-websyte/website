// Magne Montfort — Snipcart Webhook Handler
// Handles order.completed events and sends branded confirmation emails via Resend
// Configure this URL in your Snipcart Dashboard: Settings > Webhooks

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SNIPCART_SECRET_KEY = Deno.env.get("SNIPCART_SECRET_KEY"); // Optional: for webhook verification

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    const eventName = body.eventName;
    console.log("Snipcart webhook event:", eventName);

    // ========== ORDER COMPLETED ==========
    if (eventName === "order.completed") {
      const order = body.content;

      if (!order) {
        console.error("No order content in webhook payload");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const customerEmail = order.email;
      const customerName = order.billingAddressName || order.shippingAddressName || "";
      const firstName = customerName.split(" ")[0] || "there";
      const total = order.finalGrandTotal || order.grandTotal || 0;
      const currency = (order.currency || "AUD").toUpperCase();
      const orderToken = order.token || "";
      const orderRef = orderToken.slice(-8).toUpperCase();

      console.log(`Order completed: ${orderRef} for ${customerEmail}, total: $${total} ${currency}`);

      // Send branded order confirmation email via Resend
      if (RESEND_API_KEY && customerEmail) {
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
                Thank you for your purchase, ${firstName}. Your order of $${total.toFixed(2)} ${currency} has been received.
              </p>
              <p style="margin: 0 0 25px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 14px; color: #555555; font-weight: 400; line-height: 1.6;">
                We are preparing your order and will notify you once it has shipped.
              </p>
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 13px; color: #888888; font-weight: 400;">
                Order reference: ${orderRef}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Magne Montfort <hello@magnemontfort.com>",
              to: [customerEmail],
              subject: "Your Magne Montfort Order is Confirmed",
              html: htmlEmail,
            }),
          });

          if (emailRes.ok) {
            console.log("Confirmation email sent to", customerEmail);
          } else {
            const errData = await emailRes.text();
            console.error("Resend API error:", errData);
          }
        } catch (emailErr) {
          console.error("Failed to send confirmation email:", emailErr);
        }
      }
    }

    // ========== ORDER STATUS CHANGED ==========
    // You can add more event handlers here, e.g.:
    // if (eventName === "order.status.changed") { ... }
    // if (eventName === "order.refund.created") { ... }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Snipcart webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
