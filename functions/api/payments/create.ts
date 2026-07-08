import { verifyFirebaseIdToken, savePaymentRecord, getRecentPendingPayments, updatePaymentStatus, getUserProfile } from "../utils/firebaseAdmin";
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
    const isTestPayment = String(env.TEST_PAYMENT).toLowerCase() === "true";
    const amount = isTestPayment
      ? (planType === "month" ? 2000 : 3000)
      : (planType === "month" ? 50000 : 500000);

    console.log("[PAYMENT CREATE] TEST_PAYMENT:", env.TEST_PAYMENT);
    console.log("[PAYMENT CREATE] planType:", planType);
    console.log("[PAYMENT CREATE] amount:", amount);

    const description = `LexOCR PRO ${planType === "month" ? "1M" : "1Y"}`;

    // 4. Check for active pending payments
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const pendingPayments = await getRecentPendingPayments(serviceAccountJson, uid, planType, amount);
    
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
            isReuseOrder: true,
            // Reused items might not have all payos fields in firestore, passing what is known
            paymentLinkId: latestPending.paymentLinkId || "",
            bin: latestPending.bin || "",
            accountNumber: latestPending.accountNumber || "",
            accountName: latestPending.accountName || "",
            description: latestPending.description || `LexOCR PRO ${latestPending.planType === "month" ? "1M" : "1Y"}`,
            debug: {
              envTestPayment: env.TEST_PAYMENT,
              isTestPayment,
              planType,
              amount
            }
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
    const createdAt = new Date();
    const expiredAt = new Date(createdAt.getTime() + 15 * 60 * 1000);

    // Determine transactionType based on current user profile
    let transactionType: "purchase" | "renewal" | "upgrade" = "purchase";
    try {
      const profile = await getUserProfile(serviceAccountJson, uid);
      if (profile && profile.plan === "pro" && profile.expiredAt) {
        const expiredTime = new Date(profile.expiredAt).getTime();
        const isCurrentlyPro = expiredTime > Date.now();
        if (isCurrentlyPro) {
          if (profile.planType === planType) {
            transactionType = "renewal";
          } else if (profile.planType === "month" && planType === "year") {
            transactionType = "upgrade";
          }
        }
      }
    } catch (profileErr) {
      console.error("Failed to fetch user profile for transactionType:", profileErr);
    }

    // 6. Save initial pending record to Firestore (with empty checkoutUrl/qrCode)
    const initialPaymentRecord = {
      uid,
      email: email || "",
      planType,
      amount,
      status: "PENDING",
      orderCode,
      createdAt,
      expiredAt,
      checkoutUrl: "",
      qrCode: "",
      transactionType
    };

    try {
      await savePaymentRecord(
        env.FIREBASE_SERVICE_ACCOUNT_JSON,
        String(orderCode),
        initialPaymentRecord
      );
    } catch (firestoreErr: any) {
      console.error("Firestore initial write failed:", firestoreErr);
      return new Response(
        JSON.stringify({ success: false, error: `Database Error: ${firestoreErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Call PayOS to create payment link
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
      console.error("PayOS create link failed:", payosErr);
      try {
        await updatePaymentStatus(env.FIREBASE_SERVICE_ACCOUNT_JSON, String(orderCode), "FAILED");
      } catch (updateErr) {
        console.error("Failed to update status to FAILED after PayOS error:", updateErr);
      }
      return new Response(
        JSON.stringify({ success: false, error: `PayOS Error: ${payosErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (payosResponse.code !== "00" || !payosResponse.data) {
      console.error("PayOS returned non-zero code or empty data:", payosResponse);
      try {
        await updatePaymentStatus(env.FIREBASE_SERVICE_ACCOUNT_JSON, String(orderCode), "FAILED");
      } catch (updateErr) {
        console.error("Failed to update status to FAILED after PayOS failure response:", updateErr);
      }
      return new Response(
        JSON.stringify({ success: false, error: `PayOS Error: ${payosResponse.desc}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log DEV-safe fields from PayOS create payment link response
    console.log("DEV - PayOS Response fields:", {
      checkoutUrl: payosResponse.data.checkoutUrl,
      paymentLinkId: payosResponse.data.paymentLinkId,
      qrCode: payosResponse.data.qrCode,
      bin: payosResponse.data.bin,
      accountNumber: payosResponse.data.accountNumber,
      accountName: payosResponse.data.accountName,
      amount: payosResponse.data.amount,
      description: payosResponse.data.description,
      orderCode: payosResponse.data.orderCode
    });

    const checkoutUrl = payosResponse.data.checkoutUrl;
    const qrCode = payosResponse.data.qrCode;

    // 8. Update checkoutUrl/qrCode into payment in Firestore
    const updatedPaymentRecord = {
      ...initialPaymentRecord,
      checkoutUrl,
      qrCode
    };

    try {
      await savePaymentRecord(
        env.FIREBASE_SERVICE_ACCOUNT_JSON,
        String(orderCode),
        updatedPaymentRecord
      );
    } catch (firestoreUpdateErr: any) {
      console.error("Firestore update write failed:", firestoreUpdateErr);
      return new Response(
        JSON.stringify({ success: false, error: `Database Update Error: ${firestoreUpdateErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 9. Return required output/session to frontend
    return new Response(
      JSON.stringify({
        success: true,
        orderCode,
        amount,
        paymentLink: checkoutUrl,
        checkoutUrl,
        qrCode,
        expiredAt: expiredAt.toISOString(),
        isReuseOrder: false,
        paymentLinkId: payosResponse.data.paymentLinkId,
        bin: payosResponse.data.bin,
        accountNumber: payosResponse.data.accountNumber,
        accountName: payosResponse.data.accountName,
        description: payosResponse.data.description,
        debug: {
          envTestPayment: env.TEST_PAYMENT,
          isTestPayment,
          planType,
          amount
        }
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