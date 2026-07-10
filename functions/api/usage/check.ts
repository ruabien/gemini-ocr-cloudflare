import { verifyFirebaseIdToken, getOAuth2Token, getVNDateString } from "../utils/firebaseAdmin";

export const onRequestPost = async (context: { request: Request; env: any }) => {
  const { request, env } = context;

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const idToken = authHeader.split("Bearer ")[1];
    const projectId = env.VITE_FIREBASE_PROJECT_ID || "lexocr-ec982";
    
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken, projectId);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: `Unauthorized: ${err.message}` }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { uid } = decodedToken;
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (!serviceAccountJson) {
        throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    let serviceAccount: any;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
        throw new Error("Invalid service account JSON");
    }

    const accessToken = await getOAuth2Token(serviceAccount);
    const projId = serviceAccount.project_id;
    const url = `https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/users/${uid}`;
    
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
        }
    });

    let isPro = false;
    let pagesUsedToday = 0;
    const vnDate = getVNDateString();

    if (response.ok) {
        const item = await response.json() as any;
        if (item && item.fields) {
            const fields = item.fields;
            const plan = fields.plan?.stringValue;
            const expiredAt = fields.expiredAt?.timestampValue ? new Date(fields.expiredAt.timestampValue).getTime() : null;
            
            if (plan === "pro" && expiredAt && expiredAt > Date.now()) {
                isPro = true;
            }

            const dailyUsage = fields.dailyUsage?.mapValue?.fields;
            if (dailyUsage) {
                const date = dailyUsage.date?.stringValue;
                const pages = dailyUsage.pages?.integerValue ? parseInt(dailyUsage.pages.integerValue, 10) : 0;
                if (date === vnDate) {
                    pagesUsedToday = pages;
                }
            }
        }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      isPro, 
      date: vnDate,
      pagesUsed: pagesUsedToday, 
      dailyLimit: 50,
      remainingPages: isPro ? 999999 : Math.max(0, 50 - pagesUsedToday) 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error in check usage API:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error", message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
