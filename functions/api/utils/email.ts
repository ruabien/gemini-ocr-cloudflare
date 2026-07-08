import React from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { PaymentSuccessEmail } from "../../../src/emails/PaymentSuccessEmail";

interface SendPaymentSuccessEmailParams {
  email: string;
  displayName: string;
  planType: string;
  amount: number;
  expiredAt: string | Date;
  orderCode: number | string;
  resendApiKey: string;
}

/**
 * Helper to send payment success email via Resend
 */
export async function sendPaymentSuccessEmail({
  email,
  displayName,
  planType,
  amount,
  expiredAt,
  orderCode,
  resendApiKey,
}: SendPaymentSuccessEmailParams): Promise<void> {
  if (!resendApiKey) {
    console.error("[Email Error] RESEND_API_KEY is not defined");
    return;
  }

  try {
    const htmlContent = await render(
      React.createElement(PaymentSuccessEmail, {
        displayName,
        planType,
        amount,
        orderCode,
        paidAt: new Date(),
        expiredAt,
      })
    );

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "LexOCR Billing <billing@lexocr.com>",
      to: email,
      subject: "Thanh toán LexOCR PRO thành công",
      html: htmlContent,
    });

    if (error) {
      console.error("[Email Error] Resend API error:", error);
    } else {
      console.log("[Email Success] Email sent successfully:", data?.id);
    }
  } catch (err) {
    console.error("[Email Error] Exception while sending email:", err);
  }
}