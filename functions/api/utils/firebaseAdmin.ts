/**
 * Firebase Admin helper for Cloudflare Workers / Pages Functions.
 * Uses standard Web Crypto and Firestore REST API.
 */

// Helper to decode Base64Url to Uint8Array
function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode Base64Url to string
function base64UrlDecodeString(str: string): string {
  const bytes = base64UrlDecode(str);
  return new TextDecoder().decode(bytes);
}

// Helper to encode Uint8Array to Base64Url
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Verifies a Firebase ID token using Google's JWK public keys.
 * Returns the token payload containing uid, email, etc.
 */
export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<{ uid: string; email?: string; [key: string]: any }> {
  if (!token) {
    throw new Error("ID token is required");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecodeString(headerB64));
    payload = JSON.parse(base64UrlDecodeString(payloadB64));
  } catch (e) {
    throw new Error("Failed to parse token headers or payload");
  }

  // 1. Verify header alg
  if (header.alg !== "RS256") {
    throw new Error("Invalid signing algorithm. Expected RS256");
  }

  // 2. Validate standard claims
  const now = Math.floor(Date.now() / 1000);
  
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }

  if (payload.aud !== projectId) {
    throw new Error(`Invalid audience: ${payload.aud}`);
  }

  if (payload.exp <= now) {
    throw new Error("Token has expired");
  }

  if (payload.iat > now + 300) { // Allow 5 minutes clock drift
    throw new Error("Token issued in the future");
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Subject (uid) claim is missing or empty");
  }

  // 3. Fetch Google public keys and verify signature
  // Fetch Google public JWKs for Firebase token verification.
  // Updated URL per Firebase documentation to avoid Unauthorized errors.
  const res = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!res.ok) {
    // Include status for better diagnostics.
    const errorBody = await res.text();
    console.error("Failed to fetch Google public keys:", res.status, errorBody);
    throw new Error(`Failed to fetch Google public keys: ${res.status}`);
  }

  const { keys } = await res.json() as { keys: any[] };
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) {
    throw new Error(`JWK not found for kid: ${header.kid}`);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["verify"]
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signatureBytes as any,
    data
  );

  if (!isValid) {
    throw new Error("Token signature verification failed");
  }

  return {
    uid: payload.sub,
    email: payload.email,
    ...payload
  };
}

// Convert native types to Firestore REST API typed values
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: Get Asia/Ho_Chi_Minh Date string (YYYY-MM-DD)
export function getVNDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

// Convert flat object to Firestore fields
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

// Generate Google API OAuth2 Access Token using Service Account JWT
export async function getOAuth2Token(serviceAccount: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const dataToSign = `${headerB64}.${payloadB64}`;

  // Clean PEM private key string
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binaryDer = base64UrlDecode(pemContents);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer as any,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(dataToSign)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${dataToSign}.${signatureB64}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get OAuth2 token: ${errorText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Saves a payment pending record to Firestore using the Service Account config.
 */
export async function getRecentPendingPayments(
  serviceAccountJson: string | undefined,
  uid: string,
  planType?: string,
  amount?: number
): Promise<any[]> {
  if (!serviceAccountJson) return [];
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    return [];
  }
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  
  // We query only by uid to avoid Firestore composite index requirements
  const query = {
    structuredQuery: {
      from: [{ collectionId: "payments" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "uid" },
          op: "EQUAL",
          value: { stringValue: uid }
        }
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(query)
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as any[];
  const docs: any[] = [];
  
  for (const item of data) {
    if (item.document && item.document.fields) {
      const docId = item.document.name.split("/").pop();
      const fields = item.document.fields;
      docs.push({
        id: docId,
        uid: fields.uid?.stringValue,
        status: fields.status?.stringValue,
        createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) : null,
        expiredAt: fields.expiredAt?.timestampValue ? new Date(fields.expiredAt.timestampValue) : null,
        orderCode: fields.orderCode?.integerValue ? parseInt(fields.orderCode.integerValue, 10) : null,
        checkoutUrl: fields.checkoutUrl?.stringValue,
        qrCode: fields.qrCode?.stringValue,
        amount: fields.amount?.integerValue ? parseInt(fields.amount.integerValue, 10) : fields.amount?.doubleValue,
        planType: fields.planType?.stringValue,
        transactionType: fields.transactionType?.stringValue
      });
    }
  }
  
  return docs
    .filter(d => {
      if (d.status !== "PENDING") return false;
      if (planType !== undefined && d.planType !== planType) return false;
      if (amount !== undefined && d.amount !== amount) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA; // Descending
    });
}

export async function getPaymentRecord(
  serviceAccountJson: string | undefined,
  orderCode: number
): Promise<any | null> {
  if (!serviceAccountJson) return null;
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    return null;
  }
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payments/${orderCode}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    return null;
  }

  const item = await response.json() as any;
  if (item && item.fields) {
    const fields = item.fields;
    return {
      id: orderCode.toString(),
      uid: fields.uid?.stringValue,
      email: fields.email?.stringValue,
      status: fields.status?.stringValue,
      createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) : null,
      expiredAt: fields.expiredAt?.timestampValue ? new Date(fields.expiredAt.timestampValue) : null,
      orderCode: fields.orderCode?.integerValue ? parseInt(fields.orderCode.integerValue, 10) : null,
      checkoutUrl: fields.checkoutUrl?.stringValue,
      qrCode: fields.qrCode?.stringValue,
      amount: fields.amount?.integerValue ? parseInt(fields.amount.integerValue, 10) : fields.amount?.doubleValue,
      planType: fields.planType?.stringValue,
      payosTransactionId: fields.payosTransactionId?.stringValue,
      paidAt: fields.paidAt?.timestampValue ? new Date(fields.paidAt.timestampValue) : null,
      transactionType: fields.transactionType?.stringValue,
    };
  }
  return null;
}

export async function getUserProfile(
  serviceAccountJson: string | undefined,
  uid: string
): Promise<any | null> {
  if (!serviceAccountJson) return null;
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    return null;
  }
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    return null;
  }

  const item = await response.json() as any;
  if (item && item.fields) {
    const fields = item.fields;
    return {
      id: uid,
      plan: fields.plan?.stringValue,
      planType: fields.planType?.stringValue,
      expiredAt: fields.expiredAt?.timestampValue ? new Date(fields.expiredAt.timestampValue) : null,
    };
  }
  return null;
}

export async function updateUserProfile(
  serviceAccountJson: string | undefined,
  uid: string,
  data: {
    plan: string;
    planType: string;
    expiredAt: Date;
    updatedAt: Date;
  }
): Promise<void> {
  if (!serviceAccountJson) return;
  const serviceAccount = JSON.parse(serviceAccountJson);
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=plan&updateMask.fieldPaths=planType&updateMask.fieldPaths=expiredAt&updateMask.fieldPaths=updatedAt`;
  
  await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: {
        plan: { stringValue: data.plan },
        planType: { stringValue: data.planType },
        expiredAt: { timestampValue: data.expiredAt.toISOString() },
        updatedAt: { timestampValue: data.updatedAt.toISOString() }
      }
    })
  });
}

export async function updatePaymentOnSuccess(
  serviceAccountJson: string | undefined,
  paymentId: string,
  payosTransactionId: string | null,
  paidAt: Date
): Promise<void> {
  if (!serviceAccountJson) return;
  const serviceAccount = JSON.parse(serviceAccountJson);
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payments/${paymentId}?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt`;
  const fields: Record<string, any> = {
    status: { stringValue: "PAID" },
    paidAt: { timestampValue: paidAt.toISOString() }
  };
  
  if (payosTransactionId) {
    url += "&updateMask.fieldPaths=payosTransactionId";
    fields.payosTransactionId = { stringValue: payosTransactionId };
  }
  
  await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields })
  });
}

export async function updatePaymentStatus(
  serviceAccountJson: string | undefined,
  paymentId: string,
  status: string
): Promise<void> {
  if (!serviceAccountJson) return;
  const serviceAccount = JSON.parse(serviceAccountJson);
  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payments/${paymentId}?updateMask.fieldPaths=status`;
  
  await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status }
      }
    })
  });
}

export async function savePaymentRecord(
  serviceAccountJson: string | undefined,
  paymentId: string,
  record: {
    uid: string;
    email: string;
    planType: string;
    amount: number;
    status: string;
    orderCode: number;
    createdAt: Date;
    expiredAt: Date;
    checkoutUrl: string;
    qrCode: string;
    transactionType?: "purchase" | "renewal" | "upgrade";
  }
): Promise<void> {
  if (!serviceAccountJson) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is missing. " +
      "Please provide the service account JSON to authenticate with Firestore."
    );
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not a valid JSON. " +
      "Please check its formatting."
    );
  }

  if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is incomplete. It must contain 'private_key', 'client_email', and 'project_id'."
    );
  }

  const accessToken = await getOAuth2Token(serviceAccount);
  const projectId = serviceAccount.project_id;
  
  // Use PATCH to create or overwrite document at payments/{paymentId}
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payments/${paymentId}`;
  
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: toFirestoreFields(record)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API Error: ${errorText}`);
  }
}

/**
 * Commits daily usage transactionally using Firestore REST API.
 */
export async function commitDailyUsage(
  serviceAccountJson: string | undefined,
  uid: string,
  successfulPages: number,
  isPro: boolean
): Promise<{ success: boolean; pagesUsed: number; remainingPages: number; error?: string }> {
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
  const projectId = serviceAccount.project_id;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const userDocPath = `projects/${projectId}/databases/(default)/documents/users/${uid}`;

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    let transaction: string | undefined;
    try {
      // 1. Begin Transaction
      const beginTxRes = await fetch(`${baseUrl}:beginTransaction`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!beginTxRes.ok) {
        const status = beginTxRes.status;
        const errText = await beginTxRes.text();
        const isAuthOrVal = status === 400 || status === 401 || status === 403;
        if (isAuthOrVal || attempt >= maxAttempts) {
          throw new Error(`Failed to begin transaction (status ${status}): ${errText}`);
        }
        continue;
      }

      const beginJson = await beginTxRes.json() as { transaction: string };
      transaction = beginJson.transaction;

      // 2. Read User Profile within Transaction
      const getRes = await fetch(`${baseUrl}/users/${uid}?transaction=${encodeURIComponent(transaction)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });

      let currentPages = 0;
      const vnDate = getVNDateString();
      let fields: any = {};

      if (getRes.ok) {
        const userDoc = await getRes.json() as any;
        if (userDoc.fields) {
          fields = userDoc.fields;
          const dailyUsage = fields.dailyUsage?.mapValue?.fields;
          if (dailyUsage) {
            const date = dailyUsage.date?.stringValue;
            const pages = dailyUsage.pages?.integerValue ? parseInt(dailyUsage.pages.integerValue, 10) : 0;
            if (date === vnDate) {
              currentPages = pages;
            }
          }
        }
      } else if (getRes.status === 404) {
        // User doc not found, fine
      } else {
        const status = getRes.status;
        const errText = await getRes.text();
        const isAuthOrVal = status === 400 || status === 401 || status === 403;
        if (isAuthOrVal || attempt >= maxAttempts) {
          throw new Error(`Failed to read user doc (status ${status}): ${errText}`);
        }
        // Rollback transaction best effort
        try {
          await fetch(`${baseUrl}:rollback`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ transaction })
          });
        } catch (_) {}
        continue;
      }

      // 3. Compute and check limits
      const pagesAfterCommit = currentPages + successfulPages;
      const remainingPages = isPro ? 999999 : Math.max(0, 50 - pagesAfterCommit);

      if (!isPro && pagesAfterCommit > 50) {
        // Rollback transaction best effort
        try {
          await fetch(`${baseUrl}:rollback`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ transaction })
          });
        } catch (_) {}
        return { 
          success: false, 
          error: "quota_exceeded", 
          pagesUsed: currentPages, 
          remainingPages: Math.max(0, 50 - currentPages) 
        };
      }

      // 4. Commit Transaction
      const commitBody = {
        transaction,
        writes: [
          {
            updateMask: {
              fieldPaths: ["dailyUsage"]
            },
            update: {
              name: userDocPath,
              fields: {
                ...fields,
                dailyUsage: {
                  mapValue: {
                    fields: {
                      date: { stringValue: vnDate },
                      pages: { integerValue: String(pagesAfterCommit) },
                      updatedAt: { timestampValue: new Date().toISOString() }
                    }
                  }
                }
              }
            }
          }
        ]
      };

      const commitRes = await fetch(`${baseUrl}:commit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(commitBody)
      });

      if (!commitRes.ok) {
        const status = commitRes.status;
        const errText = await commitRes.text();
        const isAuthOrVal = status === 400 || status === 401 || status === 403;
        if (isAuthOrVal || attempt >= maxAttempts) {
          throw new Error(`Failed to commit transaction (status ${status}): ${errText}`);
        }
        try {
          await fetch(`${baseUrl}:rollback`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ transaction })
          });
        } catch (_) {}
        continue;
      }

      return { 
        success: true, 
        pagesUsed: pagesAfterCommit, 
        remainingPages 
      };

    } catch (error: any) {
      if (transaction) {
        try {
          await fetch(`${baseUrl}:rollback`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ transaction })
          });
        } catch (_) {}
      }

      const errMessage = error?.message || "";
      const isAuthOrVal = errMessage.includes("400") || errMessage.includes("401") || errMessage.includes("403") ||
                          errMessage.includes("unauthorized") || errMessage.includes("forbidden") ||
                          errMessage.includes("invalid") || errMessage.includes("validation");
      
      if (isAuthOrVal || attempt >= maxAttempts) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }
  }

  throw new Error("Transaction aborted due to contention or max retries exceeded");
}
