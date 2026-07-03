/**
 * PayOS Helper using standard fetch and Web Crypto API.
 */

export async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export interface CreatePaymentLinkRequest {
  orderCode: number;
  amount: number;
  description: string;
  cancelUrl: string;
  returnUrl: string;
}

export interface PayOSResponse {
  code: string;
  desc: string;
  data?: {
    bin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    currency: string;
    paymentLinkId: string;
    status: string;
    checkoutUrl: string;
    qrCode: string;
  };
}

export async function createPayOSPaymentLink(
  config: PayOSConfig,
  request: CreatePaymentLinkRequest
): Promise<PayOSResponse> {
  if (!config.clientId || !config.apiKey || !config.checksumKey) {
    throw new Error(
      "Cấu hình PayOS không đầy đủ. Vui lòng kiểm tra các biến môi trường PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY."
    );
  }

  // Construct the string to sign by sorting parameters alphabetically:
  // amount, cancelUrl, description, orderCode, returnUrl
  const signatureData = `amount=${request.amount}&cancelUrl=${encodeURI(request.cancelUrl)}&description=${request.description}&orderCode=${request.orderCode}&returnUrl=${encodeURI(request.returnUrl)}`;
  const signature = await hmacSha256(config.checksumKey, signatureData);

  const payload = {
    orderCode: request.orderCode,
    amount: request.amount,
    description: request.description,
    cancelUrl: request.cancelUrl,
    returnUrl: request.returnUrl,
    signature: signature
  };

  const response = await fetch("https://api-merchant.payos.vn/v2/payment-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.clientId,
      "x-api-key": config.apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayOS API Error (HTTP ${response.status}): ${errorText}`);
  }

  const result = await response.json() as PayOSResponse;
  return result;
}

export async function verifyWebhookData(
  data: any,
  checksumKey: string,
  expectedSignature: string
): Promise<boolean> {
  if (!data || !checksumKey || !expectedSignature) return false;
  
  // Sort keys alphabetically
  const keys = Object.keys(data).sort();
  const params: string[] = [];
  
  for (const key of keys) {
    if (key === "signature") continue;
    const value = data[key];
    if (value === null || value === undefined) continue;
    
    let strVal = "";
    if (typeof value === "object") {
      strVal = JSON.stringify(value);
    } else {
      strVal = String(value);
    }
    params.push(`${key}=${strVal}`);
  }
  
  const signatureData = params.join("&");
  const computedSignature = await hmacSha256(checksumKey, signatureData);
  return computedSignature === expectedSignature;
}
