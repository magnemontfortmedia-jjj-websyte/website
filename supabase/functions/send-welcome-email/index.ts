// Magne Montfort — Waitlist Welcome Email (Resend)
// Supabase Edge Function

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();

    // Validate required fields
    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const firstName = name.split(" ")[0];

    // Branded HTML email matching Magne Montfort's luxury aesthetic
    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Magne Montfort</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          
          <!-- Top Border Accent -->
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, #c9a96e, transparent);"></td>
          </tr>
          
          <!-- Spacer -->
          <tr><td style="height: 48px;"></td></tr>
          
          <!-- Brand Name -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase; color: #c9a96e;">
                Magne Montfort
              </h1>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td align="center" style="padding: 24px 0;">
              <div style="width: 40px; height: 1px; background-color: #c9a96e; opacity: 0.5;"></div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <p style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: #8a8a8a;">
                Welcome
              </p>
              <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 300; font-style: italic; color: #f0ece4; line-height: 1.3;">
                Dear ${firstName},
              </h2>
            </td>
          </tr>
          
          <!-- Spacer -->
          <tr><td style="height: 32px;"></td></tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding: 0 50px;">
              <p style="margin: 0 0 20px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.8; color: #b0a99a;">
                Thank you for joining the Magne Montfort waitlist. You are now among a select group who will receive early access to our collections — one hour before they are revealed to the world.
              </p>
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.8; color: #b0a99a;">
                Every piece in our atelier is handcrafted with over 40 hours of devoted artisanship, using the world's finest natural fibres. We look forward to sharing this with you.
              </p>
            </td>
          </tr>
          
          <!-- Spacer -->
          <tr><td style="height: 36px;"></td></tr>
          
          <!-- Highlight Box -->
          <tr>
            <td align="center" style="padding: 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border: 1px solid rgba(201, 169, 110, 0.2); padding: 28px 32px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #c9a96e;">
                      Your Status
                    </p>
                    <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 300; color: #f0ece4; letter-spacing: 1px;">
                      Waitlist Confirmed
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Spacer -->
          <tr><td style="height: 36px;"></td></tr>
          
          <!-- Closing -->
          <tr>
            <td align="center" style="padding: 0 50px;">
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-style: italic; line-height: 1.7; color: #8a8a8a;">
                "Where heritage meets the art of modern elegance."
              </p>
            </td>
          </tr>
          
          <!-- Spacer -->
          <tr><td style="height: 40px;"></td></tr>
          
          <!-- Bottom Divider -->
          <tr>
            <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.3), transparent);"></td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 28px 40px;">
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #555; letter-spacing: 1px;">
                &copy; 2026 Magne Montfort. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #444;">
                This email was sent because you joined our waitlist.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Magne Montfort <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to Magne Montfort — You're on the List",
        html: htmlEmail,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        {
          status: resendResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
