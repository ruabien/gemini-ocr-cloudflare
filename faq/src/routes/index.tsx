import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Comparison } from "@/components/landing/Comparison";
import { Steps } from "@/components/landing/Steps";
import { Security } from "@/components/landing/Security";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DOC — Số hóa tài liệu PDF & Ảnh bằng AI trong 3 giây" },
      {
        name: "description",
        content:
          "DOC dùng OCR AI Gemini để biến PDF, ảnh chụp, hóa đơn, hồ sơ pháp lý thành văn bản số chỉnh sửa được, chính xác 99%, miễn phí trọn đời.",
      },
      { property: "og:title", content: "DOC — Số hóa tài liệu PDF & Ảnh bằng AI" },
      {
        property: "og:description",
        content: "Số hóa tài liệu chính xác 99% bằng OCR AI. Miễn phí trọn đời. Bảo mật tuyệt đối.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Comparison />
        <Steps />
        <Security />
      </main>
      <Footer />
    </div>
  );
}
