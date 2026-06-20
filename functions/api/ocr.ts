export const onRequest = async (context: { env: { OCR_SPACE_API_KEY: string; OCR_SPACE_API_KEY_1: string } }) => {
  const primary = context.env.OCR_SPACE_API_KEY || "";
  const backup = context.env.OCR_SPACE_API_KEY_1 || "";
  
  return new Response(JSON.stringify({ primary, backup }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};