import { verifyFirebaseIdToken, savePaymentRecord, getRecentPendingPayments, updatePaymentStatus } from "../utils/firebaseAdmin";
import { createPayOSPaymentLink } from "../utils/payos";

// orderCode generator ensuring: unique, fits in int64/int32, easy to debug (YYMMDDHHmmssXX)
function generateOrderCode(): number {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10); // 10 to 99
  return parseInt(`${yy}${mm}${dd}${hh}${min}${ss}${rand}`, 10);
}

export const onRequestPost = async (context: { request: Request; env: any }) => {
  const { request, env } = context;

  try {
    // 1. Get and verify Authorization token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const idToken = authHeader.split("Bearer ")[1];
    const projectId = env.VITE_FIREBASE_PROJECT_ID || "lexocr-ec982"; // Fallback to known project id
    
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken, projectId);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: `Unauthorized: ${err.message}` }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { uid, email } = decodedToken;

    // 2. Parse request body
    const body = (await request.json()) as any;
    const { planType } = body;

    if (planType !== "month" && planType !== "year") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid planType. Must be 'month' or 'year'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Determine Amount
    const amount = planType === "month" ? 50000 : 500000;
    const description = `LexOCR PRO ${planType === "month" ? "1M" : "1Y"}`;

    // 4. Check for active pending payments
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const pendingPayments = await getRecentPendingPayments(serviceAccountJson, uid);
    
    if (pendingPayments && pendingPayments.length > 0) {
      const latestPending = pendingPayments[0];
      const now = new Date();
      const expiredAt = latestPending.expiredAt ? new Date(latestPending.expiredAt) : new Date(latestPending.createdAt.getTime() + 15 * 60 * 1000);
      
      if (now.getTime() < expiredAt.getTime()) {
        // Reuse existing pending payment
        return new Response(
          JSON.stringify({
            success: true,
            orderCode: latestPending.orderCode,
            amount: latestPending.amount,
            paymentLink: latestPending.checkoutUrl,
            checkoutUrl: latestPending.checkoutUrl,
            qrCode: latestPending.qrCode,
            expiredAt: expiredAt.toISOString(),
            isReuseOrder: true
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else {
        // Update expired payments to EXPIRED
        for (const payment of pendingPayments) {
          const pExpiredAt = payment.expiredAt ? new Date(payment.expiredAt) : new Date(payment.createdAt.getTime() + 15 * 60 * 1000);
          if (now.getTime() >= pExpiredAt.getTime()) {
            await updatePaymentStatus(serviceAccountJson, String(payment.orderCode), "EXPIRED");
          }
        }
      }
    }

    // 5. Generate unique orderCode
    const orderCode = generateOrderCode();

    // 6. Call PayOS to create payment link
    const origin = new URL(request.url).origin;
    const returnUrl = `${origin}/?payment_success=true&orderCode=${orderCode}`;
    const cancelUrl = `${origin}/?payment_cancel=true`;

    let payosResponse;
    try {
      payosResponse = await createPayOSPaymentLink(
        {
          clientId: env.PAYOS_CLIENT_ID,
          apiKey: env.PAYOS_API_KEY,
          checksumKey: env.PAYOS_CHECKSUM_KEY
        },
        {
          orderCode,
          amount,
          description,
          returnUrl,
          cancelUrl
        }
      );
    } catch (payosErr: any) {
      return new Response(
        JSON.stringify({ success: false, error: payosErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (payosResponse.code !== "00" || !payosResponse.data) {
      return new Response(
        JSON.stringify({ success: false, error: `PayOS Error: ${payosResponse.desc}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = payosResponse.data.checkoutUrl;
    const qrCode = payosResponse.data.qrCode;
    const createdAt = new Date();
    const expiredAt = new Date(createdAt.getTime() + 15 * 60 * 1000);

    // 7. Save pending record to Firestore
    const paymentRecord = {
      uid,
      email: email || "",
      planType,
      amount,
      status: "PENDING",
      orderCode,
      createdAt,
      expiredAt,
      checkoutUrl,
      qrCode
    };

    try {
      await savePaymentRecord(
        env.FIREBASE_SERVICE_ACCOUNT_JSON,
        String(orderCode),
        paymentRecord
      );
    } catch (firestoreErr: any) {
      return new Response(
        JSON.stringify({ success: false, error: firestoreErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Return required output
    return new Response(
      JSON.stringify({
        success: true,
        orderCode,
        amount,
        paymentLink: checkoutUrl,
        checkoutUrl,
        qrCode,
        expiredAt: expiredAt.toISOString(),
        isReuseOrder: false
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};