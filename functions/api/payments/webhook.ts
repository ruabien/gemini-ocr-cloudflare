import { getPaymentRecord, getUserProfile, updateUserProfile, updatePaymentOnSuccess } from "../utils/firebaseAdmin";
import { verifyWebhookData } from "../utils/payos";
import { calculateNewExpiry } from "../../../src/utils/payment";

export const onRequestPost = async (context: { request: Request; env: any }) => {
  const { request, env } = context;

  const timestamp = new Date().toISOString();
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  
  // Requirement: Logging method, full URL, pathname, query string, headers (user-agent, content-type, host), timestamp
  const logInfo = {
    timestamp,
    method,
    fullUrl: request.url,
    pathname,
    queryString: url.search,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      "content-type": request.headers.get("content-type"),
      "host": request.headers.get("host")
    }
  };
  console.log(`[Webhook POST Request Received]`, JSON.stringify(logInfo, null, 2));

  // Read raw body for logging
  let rawBody = "";
  try {
    rawBody = await request.clone().text();
  } catch (e) {
    // ignore parsing error for logging
  }
  const bodyLength = rawBody.length;
  const preview = rawBody.slice(0, 500);

  console.log(`[Webhook Body] length=${bodyLength} preview=${preview}`);

  try {
    // 1. Parse request body
    let body: any;
    try {
      body = await request.clone().json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: true, message: "Webhook endpoint received" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, signature } = body;
    
    // Determine if this is a test or empty webhook
    const isTestWebhook = 
      !data ||
      !signature ||
      typeof data !== "object" ||
      data.orderCode === undefined ||
      data.orderCode === null ||
      data.orderCode === 0 ||
      ["confirm-webhook", "confirm", "demo"].includes(data.description);

    if (isTestWebhook) {
      return new Response(
        JSON.stringify({ success: true, message: "Webhook endpoint received" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Verify signature/checksum using PAYOS_CHECKSUM_KEY
    const checksumKey = env.PAYOS_CHECKSUM_KEY;
    if (!checksumKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: PAYOS_CHECKSUM_KEY is missing" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const isVerified = await verifyWebhookData(data, checksumKey, signature);
    if (!isVerified) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Extract orderCode and find corresponding PaymentRecord in Firestore
    const orderCode = data.orderCode;
    if (orderCode === undefined || orderCode === null) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing orderCode in webhook data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const paymentRecord = await getPaymentRecord(serviceAccountJson, Number(orderCode));

    if (!paymentRecord) {
      return new Response(
        JSON.stringify({ success: false, error: `Payment record not found for orderCode: ${orderCode}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Security validation: Compare amounts and orderCodes
    if (Number(data.amount) !== paymentRecord.amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Amount mismatch. Webhook: ${data.amount}, Record: ${paymentRecord.amount}`
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (Number(data.orderCode) !== paymentRecord.orderCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `OrderCode mismatch. Webhook: ${data.orderCode}, Record: ${paymentRecord.orderCode}`
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Check payment status in Firestore (Idempotency)
    const currentStatus = paymentRecord.status;

    if (currentStatus === "PAID") {
      return new Response(
        JSON.stringify({ success: true, duplicate: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (currentStatus === "EXPIRED" || currentStatus === "CANCELLED") {
      console.warn(`[Webhook Warn] Payment with orderCode ${orderCode} is already in state: ${currentStatus}. Webhook ignored.`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Payment is already in an end state: ${currentStatus}`
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (currentStatus === "PENDING") {
      // 6. Valid payment flow: Activate plan and update status
      const paidAt = new Date();
      const payosTransactionId = data.reference || data.paymentLinkId || null;

      // Update payment record in Firestore
      await updatePaymentOnSuccess(
        serviceAccountJson,
        String(orderCode),
        payosTransactionId,
        paidAt
      );

      // Fetch user profile to calculate expiry
      const uid = paymentRecord.uid;
      const userProfile = await getUserProfile(serviceAccountJson, uid);

      const currentExpiredAtMs = userProfile?.expiredAt
        ? new Date(userProfile.expiredAt).getTime()
        : null;

      const newExpiryMs = calculateNewExpiry(currentExpiredAtMs, paymentRecord.planType);

      // Update user profile in Firestore
      await updateUserProfile(serviceAccountJson, uid, {
        plan: "pro",
        planType: paymentRecord.planType,
        expiredAt: new Date(newExpiryMs),
        updatedAt: new Date()
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Default fallback (unknown state)
    return new Response(
      JSON.stringify({ success: false, error: `Unknown payment status: ${currentStatus}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[Webhook Error] Error processing webhook:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const onRequestGet = async (context: { request: Request; env: any }) => {
  const { request } = context;
  const timestamp = new Date().toISOString();
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Requirement: Logging method, full URL, pathname, query string, headers (user-agent, content-type, host), timestamp
  const logInfo = {
    timestamp,
    method,
    fullUrl: request.url,
    pathname,
    queryString: url.search,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      "content-type": request.headers.get("content-type"),
      "host": request.headers.get("host")
    }
  };
  console.log(`[Webhook GET Request Received]`, JSON.stringify(logInfo, null, 2));

  return new Response(
    JSON.stringify({ success: true, message: "PayOS webhook endpoint ready" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
