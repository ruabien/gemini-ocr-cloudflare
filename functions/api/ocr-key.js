const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  return new Response(JSON.stringify({ apiKey: context.env.OCR_SPACE_API_KEY }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// Handler general just in case
export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return onRequestOptions(context);
  }
  return onRequestGet(context);
}
