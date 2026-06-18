export const onRequestPost = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);
  
  // Construct the secure destination URL hidden from the user's browser
  const targetUrl = new URL("https://gemini-ocr-backend.ruabien1504.workers.dev/");
  targetUrl.searchParams.set("cb", url.searchParams.get("cb") || Date.now().toString());
  targetUrl.searchParams.set("apiKey", "AIzaSyBrofj8f0dLg0SpZg24Qexck4JQMCJyZHc"); // Injected safely in the dark
  
  // Clone headers and forward the pure raw request downstream
  const newRequest = new Request(targetUrl.toString(), {
    method: "POST",
    headers: request.headers,
    body: request.body
  });
  
  return fetch(newRequest);
};