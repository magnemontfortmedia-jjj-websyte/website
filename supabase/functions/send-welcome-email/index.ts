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
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're on the List - Magne Montfort</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff !important;
    }
    table, td, div {
      background-color: #ffffff !important;
    }
    /* Force Light Mode in Apple/iOS/Webmail Dark Mode */
    @media (prefers-color-scheme: dark) {
      body, table, td, div {
        background-color: #ffffff !important;
        background-image: linear-gradient(#ffffff, #ffffff) !important;
      }
      p, span {
        color: #333333 !important;
        -webkit-text-fill-color: #333333 !important;
      }
    }
    /* Force Light Mode in Outlook.com Dark Mode */
    [data-ogsc] body, [data-ogsc] table, [data-ogsc] td {
      background-color: #ffffff !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; -webkit-font-smoothing: antialiased;" bgcolor="#ffffff">
  
  <!--[if mso]>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
    <tr>
      <td align="center" bgcolor="#ffffff">
  <![endif]-->
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; width: 100%;">
    <tr>
      <td align="center" style="padding: 60px 20px; background-color: #ffffff;" bgcolor="#ffffff">
        
        <!--[if mso]>
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff">
          <tr>
            <td align="center" bgcolor="#ffffff">
        <![endif]-->
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="max-width: 600px; width: 100%; text-align: center; background-color: #ffffff; margin: 0 auto;">
          
          <!-- Brand Logo -->
          <tr>
            <td align="center" style="padding-bottom: 40px; background-color: #ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 4px;">
                <tr>
                  <td align="center" style="background-color: #ffffff; padding: 10px;" bgcolor="#ffffff">
                    <img src="https://magnemontfort.com/assets/images/poo.png" alt="Magne Montfort" width="200" style="display: block; border: 0; max-width: 100%; height: auto; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Thank You Note -->
          <tr>
            <td align="center" style="padding-bottom: 30px; background-color: #ffffff;" bgcolor="#ffffff">
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 16px; color: #333333; font-weight: 400; line-height: 1.5; mso-line-height-rule: exactly;">
                Thank you for joining the waitlist, ${firstName}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #ffffff;" bgcolor="#ffffff">
              <p style="margin: 0; font-family: 'Inter', Helvetica, Arial, sans-serif; font-size: 14px; color: #666666; font-weight: 400; mso-line-height-rule: exactly;">
                Keep an eye on your inbox.
              </p>
            </td>
          </tr>
          
        </table>
        
        <!--[if mso]>
            </td>
          </tr>
        </table>
        <![endif]-->
        
      </td>
    </tr>
  </table>
  
  <!--[if mso]>
      </td>
    </tr>
  </table>
  <![endif]-->
  
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
