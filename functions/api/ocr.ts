const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = ["https://doc.hotro.online"];
  
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ocr-Provider",
    };
  }
  return {
    "Access-Control-Allow-Origin": "https://doc.hotro.online",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ocr-Provider",
  };
};

export const onRequest = async (context: { request: Request; env: { OCR_SPACE_API_KEY: string; OCR_SPACE_API_KEY_1: string } }) => {
  const corsHeaders = getCorsHeaders(context.request);
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  const primary = context.env.OCR_SPACE_API_KEY || "";
  const backup = context.env.OCR_SPACE_API_KEY_1 || "";
  
  return new Response(JSON.stringify({ primary, backup }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
};