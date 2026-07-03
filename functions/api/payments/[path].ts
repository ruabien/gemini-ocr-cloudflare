export const onRequest = async (context: { request: Request; env: any }) => {
  const { request } = context;

  const timestamp = new Date().toISOString();
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  const basicHeaders = {
    "user-agent": request.headers.get("user-agent"),
    "content-type": request.headers.get("content-type")
  };

  // Log request details
  console.log(`[Catch‑All Webhook Log] ${timestamp} ${method} ${pathname}`);
  console.log(`[Catch‑All Headers]`, basicHeaders);

  // Respond with generic 200 to avoid 404
  return new Response(
    JSON.stringify({ success: true, message: "Webhook endpoint received (catch‑all)" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};