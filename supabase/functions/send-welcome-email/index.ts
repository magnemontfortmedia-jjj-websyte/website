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
  <title>You're on the List - Magne Montfort</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 80px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; text-align: center;">
          
          <!-- Brand Logo -->
          <tr>
            <td align="center" style="padding-bottom: 60px;">
              <img src="https://magnemontfort.com/assets/images/poo.png" alt="Magne Montfort" width="300" style="display: block; border: 0; max-width: 100%; height: auto; margin: 0 auto;">
            </td>
          </tr>
          
          <!-- Top Divider -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <div style="width: 50px; height: 1px; background-color: #c1a87d; margin: 0 auto;"></div>
            </td>
          </tr>
          
          <!-- Checkmark Icon -->
          <tr>
            <td align="center" style="padding-bottom: 50px;">
              <div style="width: 64px; height: 64px; border: 1px solid #c1a87d; border-radius: 50%; display: inline-block; text-align: center; line-height: 64px;">
                <span style="color: #c1a87d; font-size: 32px; font-weight: 300; font-family: sans-serif;">&#10003;</span>
              </div>
            </td>
          </tr>
          
          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 42px; font-weight: 300; color: #222222; letter-spacing: 1.5px;">
                You're on the List
              </h1>
            </td>
          </tr>
          
          <!-- Body Text -->
          <tr>
            <td align="center" style="padding-bottom: 60px;">
              <p style="margin: 0 0 12px 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 16px; color: #666666; font-weight: 300;">
                Thank you, <span style="color: #c1a87d;">${firstName}</span>.
              </p>
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 16px; color: #888888; font-weight: 300;">
                You'll receive early access one hour before launch.
              </p>
            </td>
          </tr>
          
          <!-- Bottom Divider -->
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <div style="width: 50px; height: 1px; background-color: #c1a87d; margin: 0 auto;"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center">
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; color: #999999;">
                Keep an eye on your inbox.
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
        from: "Magne Montfort <hello@magnemontfort.com>",
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
