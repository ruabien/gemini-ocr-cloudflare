import { onRequestPost as paymentsPost } from "./api/payments/webhook";

/**
 * Minimal GET handler for PayOS verification.
 * Returns plain text "OK" with required headers.
 */
export const onRequestGet = async (context: { request: Request; env: any }) => {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
};

/**
 * Minimal POST handler for PayOS verification.
 * - Empty body or test payload → respond with "OK".
 * - Real payment webhook → forward to existing payment webhook logic
 *   (which verifies checksum, updates payment and user) and then
 *   respond with plain text "OK".
 *
 * The response is always 200 plain‑text "OK" as required by PayOS.
 */
export const onRequestPost = async (context: { request: Request; env: any }) => {
  const { request, env } = context;

  // Read raw body for inspection
  let rawBody = "";
  try {
    rawBody = await request.clone().text();
  } catch {
    // ignore errors – treat as empty
  }

  const isEmpty = rawBody.trim() === "";

  // Detect test webhook payload (similar logic to the original webhook)
  let isTest = false;
  if (!isEmpty) {
    try {
      const parsed = JSON.parse(rawBody);
      const { data, signature } = parsed;
      if (!data || typeof data !== "object") {
        isTest = true;
      } else if (
        data.orderCode === undefined ||
        data.orderCode === null ||
        data.orderCode === 0 ||
        ["confirm-webhook", "confirm", "demo"].includes(data.description)
      ) {
        isTest = true;
      } else if (!signature) {
        isTest = true;
      }
    } catch {
      // Not valid JSON → treat as test/empty
      isTest = true;
    }
  }

  // If empty or test payload, simply acknowledge
  if (isEmpty || isTest) {
    return new Response("OK", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store",
      },
    });
  }

  // Real webhook payload – forward to existing processing logic.
  // We deliberately ignore the response from the original handler because
  // PayOS expects a minimal plain‑text "OK".
  try {
    await paymentsPost({ request, env });
  } catch {
    // Swallow any errors – the caller will still receive "OK"
  }

  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
};