import { PlanType } from "../types";

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculates the new expiration timestamp for a subscription plan.
 *
 * @param currentExpiredAt The current expiration timestamp in milliseconds, or null/undefined if none exists or has expired.
 * @param planType The type of plan being purchased ("month" or "year").
 * @returns The new expiration timestamp in milliseconds.
 */
export function calculateNewExpiry(
  currentExpiredAt: number | null | undefined,
  planType: PlanType
): number {
  const now = Date.now();
  const addedDays = planType === "month" ? 30 : 365;
  const addedMs = addedDays * MILLISECONDS_IN_A_DAY;

  if (currentExpiredAt && currentExpiredAt > now) {
    return currentExpiredAt + addedMs;
  }
  return now + addedMs;
}

export async function createPaymentSession(
  idToken: string,
  planType: "month" | "year"
): Promise<{
  checkoutUrl?: string;
  orderCode?: number;
  amount?: number;
  qrCode?: string;
  expiredAt?: string;
  isReuseOrder?: boolean;
  paymentLinkId?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ planType })
    });

    const data = await response.json();
    if (!data.success) {
      return { error: data.error || "Có lỗi xảy ra khi tạo đơn thanh toán." };
    }

    return {
      checkoutUrl: data.checkoutUrl,
      orderCode: data.orderCode,
      amount: data.amount,
      qrCode: data.qrCode,
      expiredAt: data.expiredAt,
      isReuseOrder: data.isReuseOrder,
      paymentLinkId: data.paymentLinkId,
      bin: data.bin,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      description: data.description
    };
  } catch (error: any) {
    return { error: error.message || "Lỗi kết nối mạng." };
  }
}
