export const onRequest = async (context: { env: { OCR_SPACE_API_KEY: string; OCR_SPACE_API_KEY_1: string } }) => {
  return new Response(JSON.stringify({ 
    primary: context.env.OCR_SPACE_API_KEY, 
    backup: context.env.OCR_SPACE_API_KEY_1 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
