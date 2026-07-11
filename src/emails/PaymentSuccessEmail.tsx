import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Button,
  Row,
  Column
} from "@react-email/components";
import * as React from "react";

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

export const PaymentSuccessEmail = ({
  displayName = "",
  planType = "Pro",
  amount = 0,
  orderCode = "000000",
  paidAt = new Date(),
  expiredAt = new Date(),
  transactionType = "purchase",
  testPayment = false,
  email = "",
}: PaymentSuccessEmailProps) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);

  const formattedPaidAt = new Date(paidAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  const formattedExpiredAt = new Date(expiredAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const displayPlanType =
    String(planType).toLowerCase() === "month"
      ? "LexOCR PRO Tháng"
      : String(planType).toLowerCase() === "year"
      ? "LexOCR PRO Năm"
      : String(planType).toUpperCase();

  let bodyContent = null;
  if (transactionType === "renewal") {
    bodyContent = (
      <>
        <Text style={paragraph}>Gia hạn thành công.</Text>
        <Text style={paragraph}>Ngày hết hạn mới: {formattedExpiredAt}</Text>
      </>
    );
  } else if (transactionType === "upgrade") {
    bodyContent = (
      <>
        <Text style={paragraph}>Chúc mừng!</Text>
        <Text style={paragraph}>Bạn đã nâng cấp lên LexOCR PRO Năm.</Text>
      </>
    );
  } else {
    bodyContent = (
      <Text style={paragraph}>Cảm ơn bạn đã sử dụng LexOCR.</Text>
    );
  }

  const subjectText = {
    purchase: "Thanh toán LexOCR PRO thành công",
    renewal: "Gia hạn LexOCR PRO thành công",
    upgrade: "Nâng cấp lên LexOCR PRO Năm thành công"
  }[transactionType] || "Thanh toán LexOCR PRO thành công";

  return (
    <Html>
      <Head />
      <Preview>{subjectText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={logoTextContainer}>
            <Text style={logoMainText}>LEXOCR</Text>
            <Text style={logoSubText}>Procuracy v2.5</Text>
            <Text style={logoDescText}>Hệ thống bóc tách hồ sơ & trợ lý Kiểm sát viên</Text>
          </div>
<Heading style={heading}>{subjectText}</Heading>
          
<Text style={paragraph}>Xin chào {displayName ? displayName : "bạn"},</Text>
{email && (
  <Text style={paragraph}>
    Tài khoản:<br />
    {email}
  </Text>
)}
          {bodyContent}

          <Section style={card}>
            <Text style={cardTitle}>Thông tin giao dịch</Text>
            
            <Row style={row}>
              <Column style={labelColumn}><Text style={label}>Gói:</Text></Column>
              <Column style={valueColumn}><Text style={value}>{displayPlanType}</Text></Column>
            </Row>
            
<Row style={row}>
  <Column style={labelColumn}><Text style={label}>Giá tiền:</Text></Column>
  <Column style={valueColumn}><Text style={value}>{formattedAmount}{testPayment ? " (Chế độ kiểm thử)" : ""}</Text></Column>
</Row>
            
            <Row style={row}>
              <Column style={labelColumn}><Text style={label}>Mã giao dịch:</Text></Column>
              <Column style={valueColumn}><Text style={value}>#{orderCode}</Text></Column>
            </Row>
            
            <Row style={row}>
              <Column style={labelColumn}><Text style={label}>Ngày thanh toán:</Text></Column>
              <Column style={valueColumn}><Text style={value}>{formattedPaidAt}</Text></Column>
            </Row>
            
            <Row style={row}>
              <Column style={labelColumn}><Text style={label}>Ngày hết hạn:</Text></Column>
              <Column style={valueColumn}><Text style={value}>{formattedExpiredAt}</Text></Column>
            </Row>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href="https://lexocr.com">
              Mở LexOCR
            </Button>
            <Text style={{ fontSize: "12px", color: "#6B7280", textAlign: "center", marginTop: "16px", marginBottom: "0" }}>
              Nếu có vấn đề về giao dịch hoặc cần xuất hóa đơn, vui lòng liên hệ: <br />
              <a href="mailto:billing@lexocr.com" style={{ color: "#6B7280", textDecoration: "underline" }}>billing@lexocr.com</a>
            </Text>
          </Section>

          <Hr style={hr} />
          
<Text style={footer}>
  LexOCR không lưu trữ tài liệu hồ sơ của người dùng.<br />
  support@lexocr.com<br />
  https://lexocr.com<br />
  © 2026 LexOCR
</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentSuccessEmail;

const main = {
  backgroundColor: "#F8FAFC",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
};

const logoTextContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logoMainText = {
  margin: "0",
  fontSize: "28px",
  fontWeight: "800",
  color: "#163A70",
  letterSpacing: "2px",
};

const logoSubText = {
  margin: "4px 0",
  fontSize: "16px",
  fontWeight: "600",
  color: "#3B82F6",
};

const logoDescText = {
  margin: "4px 0 0 0",
  fontSize: "14px",
  color: "#6B7280",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#163A70",
  textAlign: "center" as const,
  marginBottom: "24px",
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#1F2937",
};

const card = {
  padding: "24px",
  backgroundColor: "#F0F4F8",
  borderRadius: "8px",
  marginTop: "24px",
  marginBottom: "32px",
};

const cardTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#163A70",
  margin: "0 0 16px 0",
};

const row = {
  marginBottom: "12px",
};

const labelColumn = {
  width: "40%",
};

const valueColumn = {
  width: "60%",
};

const label = {
  margin: "0",
  fontSize: "14px",
  color: "#4B5563",
};

const value = {
  margin: "0",
  fontSize: "14px",
  fontWeight: "600",
  color: "#1F2937",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
  marginBottom: "32px",
};

const button = {
  backgroundColor: "#163A70",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
  fontWeight: "600",
};

const hr = {
  borderColor: "#D9E2EC",
  margin: "24px 0",
};

const footer = {
  color: "#4B5563",
  fontSize: "12px",
  textAlign: "center" as const,
  lineHeight: "1.5",
};