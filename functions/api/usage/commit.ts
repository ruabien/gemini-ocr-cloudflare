import { verifyFirebaseIdToken, getUserProfile, commitDailyUsage, getVNDateString } from "../utils/firebaseAdmin";

interface Env {
  FIREBASE_SERVICE_ACCOUNT_JSON: string;
  FIREBASE_PROJECT_ID: string;
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const idToken = authHeader.substring(7);
    const projectId = env.FIREBASE_PROJECT_ID;
    const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!projectId || !serviceAccountJson) {
      return new Response(
        JSON.stringify({ error: "Firebase config missing on server" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify token
    const decodedToken = await verifyFirebaseIdToken(idToken, projectId);
    const uid = decodedToken.uid;

    // Read body
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_body", message: "Invalid JSON body" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    const successfulPages = body?.successfulPages;

    if (
      typeof successfulPages !== "number" ||
      !Number.isInteger(successfulPages) ||
      successfulPages < 1
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_pages", message: "successfulPages must be an integer >= 1" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Check if user has active PRO subscription
    const profile = await getUserProfile(serviceAccountJson, uid);
    const isPro = !!(
      profile &&
      profile.plan === "pro" &&
      profile.expiredAt &&
      new Date(profile.expiredAt).getTime() > Date.now()
    );

    if (isPro) {
      return new Response(
        JSON.stringify({
          success: true,
          isPro: true,
          date: getVNDateString(),
          committedPages: 0,
          pagesUsed: 0,
          remainingPages: 999999,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!isPro && successfulPages > 20) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_pages", message: "successfulPages must be <= 20 for FREE users" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Commit daily usage transactionally
    const commitResult = await commitDailyUsage(
      serviceAccountJson,
      uid,
      successfulPages,
      false
    );

    if (!commitResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          code: commitResult.error === "quota_exceeded" ? "quota_exceeded" : "transaction_failed",
          pagesUsed: commitResult.pagesUsed,
          remainingPages: commitResult.remainingPages,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        isPro: false,
        date: getVNDateString(),
        committedPages: successfulPages,
        pagesUsed: commitResult.pagesUsed,
        remainingPages: commitResult.remainingPages,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("Error in commit usage API:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error", message: "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
