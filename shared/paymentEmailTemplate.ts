export interface PaymentSuccessEmailProps {
  displayName: string;
  planType: string;
  amount: number;
  orderCode: number | string;
  paidAt: string | Date;
  expiredAt: string | Date;
  transactionType?: "purchase" | "renewal" | "upgrade";
  testPayment?: boolean;
  email?: string;
}

export function generatePaymentSuccessEmailHtml({
  displayName = "",
  planType = "Pro",
  amount = 0,
  orderCode = "000000",
  paidAt = new Date(),
  expiredAt = new Date(),
  transactionType = "purchase",
  testPayment = false,
  email = "",
}: PaymentSuccessEmailProps): string {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const formattedPaidAt = new Date(paidAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedExpiredAt = new Date(expiredAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const displayPlanType =
    String(planType).toLowerCase() === "month"
      ? "LexOCR PRO Tháng"
      : String(planType).toLowerCase() === "year"
      ? "LexOCR PRO Năm"
      : String(planType).toUpperCase();

  let bodyContent = "";
  if (transactionType === "renewal") {
    bodyContent = `
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Gia hạn thành công.</p>
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Ngày hết hạn mới: ${formattedExpiredAt}</p>
    `;
  } else if (transactionType === "upgrade") {
    bodyContent = `
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Chúc mừng!</p>
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Bạn đã nâng cấp lên LexOCR PRO Năm.</p>
    `;
  } else {
    bodyContent = `
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Cảm ơn bạn đã sử dụng LexOCR.</p>
    `;
  }

  const subjectText =
    {
      purchase: "Thanh toán LexOCR PRO thành công",
      renewal: "Gia hạn LexOCR PRO thành công",
      upgrade: "Nâng cấp lên LexOCR PRO Năm thành công",
    }[transactionType] || "Thanh toán LexOCR PRO thành công";

  const emailInfo = email
    ? `<p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">
        Tài khoản:<br />
        ${email}
      </p>`
    : "";

  const testPaymentText = testPayment ? " (Chế độ kiểm thử)" : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="vi">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${subjectText}</div>
  <body style="background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif">
    <div style="margin:0 auto;padding:40px 20px;max-width:600px;background-color:#FFFFFF;border-radius:8px;box-shadow:0 2px 8px rgba(0, 0, 0, 0.05)">
      <div style="text-align:center;margin-bottom:24px">
        <p style="margin:0;font-size:28px;font-weight:800;color:#163A70;letter-spacing:2px">LEXOCR</p>
        <p style="margin:4px 0;font-size:16px;font-weight:600;color:#3B82F6">Procuracy v2.5</p>
        <p style="margin:4px 0 0 0;font-size:14px;color:#6B7280">Hệ thống bóc tách hồ sơ & trợ lý Kiểm sát viên</p>
      </div>
      <h1 style="font-size:24px;letter-spacing:-0.5px;line-height:1.3;font-weight:700;color:#163A70;text-align:center;margin-bottom:24px">${subjectText}</h1>
      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.5; color: #1F2937;">Xin chào ${
        displayName ? displayName : "bạn"
      },</p>
      ${emailInfo}
      ${bodyContent}
      
      <div style="padding:24px;background-color:#F0F4F8;border-radius:8px;margin-top:24px;margin-bottom:32px">
        <p style="font-size:18px;font-weight:600;color:#163A70;margin:0 0 16px 0">Thông tin giao dịch</p>
        
        <table style="width:100%;margin-bottom:12px">
          <tr>
            <td style="width:40%;margin:0;font-size:14px;color:#4B5563">Gói:</td>
            <td style="width:60%;margin:0;font-size:14px;font-weight:600;color:#1F2937">${displayPlanType}</td>
          </tr>
        </table>
        
        <table style="width:100%;margin-bottom:12px">
          <tr>
            <td style="width:40%;margin:0;font-size:14px;color:#4B5563">Giá tiền:</td>
            <td style="width:60%;margin:0;font-size:14px;font-weight:600;color:#1F2937">${formattedAmount}${testPaymentText}</td>
          </tr>
        </table>
        
        <table style="width:100%;margin-bottom:12px">
          <tr>
            <td style="width:40%;margin:0;font-size:14px;color:#4B5563">Mã giao dịch:</td>
            <td style="width:60%;margin:0;font-size:14px;font-weight:600;color:#1F2937">#${orderCode}</td>
          </tr>
        </table>
        
        <table style="width:100%;margin-bottom:12px">
          <tr>
            <td style="width:40%;margin:0;font-size:14px;color:#4B5563">Ngày thanh toán:</td>
            <td style="width:60%;margin:0;font-size:14px;font-weight:600;color:#1F2937">${formattedPaidAt}</td>
          </tr>
        </table>
        
        <table style="width:100%;margin-bottom:12px">
          <tr>
            <td style="width:40%;margin:0;font-size:14px;color:#4B5563">Ngày hết hạn:</td>
            <td style="width:60%;margin:0;font-size:14px;font-weight:600;color:#1F2937">${formattedExpiredAt}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:32px;margin-bottom:32px">
        <a href="https://lexocr.com" style="background-color:#163A70;border-radius:4px;color:#fff;font-size:16px;text-decoration:none;text-align:center;display:inline-block;padding:12px 32px;font-weight:600;line-height:100%;max-width:100%">Mở LexOCR</a>
        <p style="font-size:12px;color:#6B7280;text-align:center;margin-top:16px;margin-bottom:0">
          Nếu có vấn đề về giao dịch hoặc cần xuất hóa đơn, vui lòng liên hệ: <br />
          <a href="mailto:billing@lexocr.com" style="color:#6B7280;text-decoration:underline">billing@lexocr.com</a>
        </p>
      </div>

      <hr style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#D9E2EC;margin:24px 0" />
      
      <p style="color:#4B5563;font-size:12px;text-align:center;line-height:1.5;margin:0">
        LexOCR không lưu trữ tài liệu hồ sơ của người dùng.<br />
        support@lexocr.com<br />
        https://lexocr.com<br />
        © 2026 LexOCR
      </p>
    </div>
  </body>
</html>`;
}