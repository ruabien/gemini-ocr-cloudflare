import { verifyFirebaseIdToken, savePaymentRecord } from "../utils/firebaseAdmin";
import { createPayOSPaymentLink } from "../utils/payos";

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

    // 4. Generate unique orderCode (up to 9007199254740991, strictly positive integer)
    // We use a combination of Date.now and random to ensure uniqueness and fit in integer
    const timestampPart = Date.now().toString().slice(-9); 
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const orderCode = parseInt(`${timestampPart}${randomPart}`, 10);

    // 5. Save pending record to Firestore
    const paymentRecord = {
      uid,
      email: email || "",
      planType,
      amount,
      status: "PENDING",
      orderCode,
      createdAt: new Date()
    };

    try {
      await savePaymentRecord(
        env.FIREBASE_SERVICE_ACCOUNT_JSON,
        String(orderCode),
        paymentRecord
      );
    } catch (firestoreErr: any) {
      // Return 500 with clear message so frontend/dev knows env var is missing
      return new Response(
        JSON.stringify({ success: false, error: firestoreErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Call PayOS to create payment link
    const origin = new URL(request.url).origin;
    // We redirect back to the app after payment
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

    // 7. Return required output
    return new Response(
      JSON.stringify({
        success: true,
        orderCode: payosResponse.data.orderCode,
        amount: payosResponse.data.amount,
        planType,
        checkoutUrl: payosResponse.data.checkoutUrl,
        qrCode: payosResponse.data.qrCode
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