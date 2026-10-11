import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  Lock,
  ScanLine,
} from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
  setActiveTab: (tab: string) => void;
}

const faqs = [
  {
    question: "LexOCR Web Free hỗ trợ những loại tệp nào?",
    answer: "PDF, JPG, PNG. Bạn có thể tải lên nhiều ảnh cùng lúc.",
  },
  {
    question: "Tôi có cần đăng nhập hoặc cài đặt phần mềm không?",
    answer:
      "Không. LexOCR Web Free sử dụng trực tiếp, không cần đăng nhập hay cài đặt gì.",
  },
  {
    question: "Giới hạn số trang cho mỗi lần OCR là bao nhiêu?",
    answer:
      "Tối đa 20 trang mỗi lần bóc tách. Bạn có thể chia nhỏ tài liệu dài thành nhiều lần xử lý.",
  },
  {
    question: "Tôi có thể xuất kết quả ở định dạng nào?",
    answer:
      "Web Free hỗ trợ xuất text thuần (TXT) và copy nhanh vào clipboard. Các định dạng tài liệu và bảng tính sẽ có ở bản Desktop Pro.",
  },
  {
    question: "Chất lượng OCR tiếng Việt phụ thuộc vào những yếu tố nào?",
    answer:
      "Chất lượng phụ thuộc vào độ rõ nét và bố cục tài liệu gốc. Ảnh scan rõ, độ phân giải cao cho kết quả tốt nhất.",
  },
  {
    question: "LexOCR Desktop Pro khác gì Web Free?",
    answer:
      "Desktop Pro là bản offline cho nhu cầu xử lý khối lượng lớn hoặc tài liệu cần bảo mật cao. Xem chi tiết tại trang Pro Desktop.",
  },
];

export default function LandingPage({ onStart, setActiveTab }: LandingPageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="landing-container" className="flex w-full flex-col animate-fade-in">
      {/* Hero */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-14 text-white sm:px-12">
        {/* Grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.08]"
          aria-hidden="true"
        />
        {/* Ambient glow — red (top center) */}
        <div
          className="pointer-events-none absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/15 blur-3xl"
          aria-hidden="true"
        />
        {/* Ambient glow — amber (bottom right) */}
        <div
          className="pointer-events-none absolute right-10 bottom-10 h-80 w-80 rounded-full bg-yellow-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Chuyển PDF & Ảnh sang{" "}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-red-500 bg-clip-text text-transparent">
              Text tiếng Việt
            </span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
            Miễn phí, không cần đăng nhập. Nhận văn bản chỉ trong vài giây.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={onStart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500 sm:w-auto"
            >
              Chọn file PDF hoặc Ảnh
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-8 sm:mt-12 max-w-2xl mx-auto w-full relative">
            <div className="absolute inset-0 -z-0 bg-red-500/10 blur-3xl rounded-full" aria-hidden="true" />
            <div className="relative max-h-[380px] overflow-hidden rounded-xl">
              <div className="relative bg-white rounded-xl shadow-2xl ring-1 ring-white/10 overflow-hidden">
              {/* Window chrome bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                <div className="ml-4 flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-400 font-mono truncate">
                  lexocr.com/scanner
                </div>
              </div>

              {/* App body — 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: image preview mockup */}
                <div className="p-5 bg-slate-50/60 border-r border-slate-100">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-3">
                    Tài liệu gốc
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm aspect-[3/4] flex flex-col justify-start pt-6">
                    <div className="text-center text-[11px] font-bold text-slate-700 mb-2">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div className="text-center text-[10px] text-slate-500 mb-3">
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <div className="h-px bg-slate-200 my-2"></div>
                    <div className="space-y-1.5 text-[10px] text-slate-600">
                      <div className="flex gap-2">
                        <span className="text-slate-400 w-20 shrink-0">Nguyên đơn:</span>
                        <span className="bg-yellow-100 px-1 rounded font-semibold text-slate-800">
                          Ông LÊ VĂN C
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 w-20 shrink-0">Bị đơn:</span>
                        <span className="bg-yellow-100 px-1 rounded font-semibold text-slate-800">
                          Bà PHẠM THỊ D
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 w-20 shrink-0">Ngày thụ lý:</span>
                        <span className="bg-yellow-100 px-1 rounded font-semibold text-slate-800">
                          12/03/2026
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: OCR result mockup */}
                <div className="p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Văn bản nhận dạng
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Hoàn tất
                    </div>
                  </div>
                  <div className="space-y-2 text-[13px] leading-relaxed text-slate-700 font-mono">
                    <p className="text-[13px] font-bold text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p>Độc lập - Tự do - Hạnh phúc</p>
                    <p className="pt-1">
                      Nguyên đơn: <span className="bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-slate-900">LÊ VĂN C</span>
                    </p>
                    <p>
                      Bị đơn: <span className="bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-slate-900">PHẠM THỊ D</span>
                    </p>
                    <p>
                      Ngày thụ lý:{" "}
                      <span className="bg-emerald-50 px-1.5 py-0.5 rounded font-semibold text-slate-900">12/03/2026</span>
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    <div className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md">
                      Copy
                    </div>
                    <div className="text-[10px] font-semibold text-white bg-red-600 px-3 py-1.5 rounded-md">
                      Tải TXT
                    </div>
                  </div>
                </div>
              </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-12 max-w-3xl mx-auto border-t border-white/10 pt-6">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {[
              "Hỗ trợ PDF, JPG, PNG",
              "Không gửi file lên server",
              "Tối đa 20 trang mỗi lần",
              "Kết quả trong vài giây",
            ].map((fact) => (
              <div key={fact} className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {fact}
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full bg-white px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                CÁCH HOẠT ĐỘNG
              </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Từ tài liệu đến văn bản trong 3 bước
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Tải file lên",
                description: "Chọn PDF hoặc ảnh từ thiết bị của bạn.",
                cardClassName: "border-t-4 border-t-red-600",
                iconClassName: "h-11 w-11 rounded-lg bg-red-50 text-red-600 flex items-center justify-center",
              },
              {
                icon: ScanLine,
                title: "Tự động nhận dạng",
                description: "Văn bản tiếng Việt được nhận dạng và giữ nguyên bố cục.",
                cardClassName: "border-t-4 border-t-amber-500",
                iconClassName: "h-11 w-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center",
              },
              {
                icon: Copy,
                title: "Copy hoặc tải TXT",
                description: "Lấy kết quả dạng text thuần, copy nhanh hoặc tải về máy.",
                cardClassName: "border-t-4 border-t-emerald-600",
                iconClassName: "h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center",
              },
            ].map(({ icon: Icon, title, description, cardClassName, iconClassName }, index) => (
              <div key={title} className={`rounded-2xl border border-slate-200 p-6 ${cardClassName}`}>
                <div className="flex items-center justify-between">
                  <div className={iconClassName}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-800">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop Pro teaser */}
      <section className="w-full bg-slate-900 px-6 py-10 text-white sm:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold sm:text-xl">
                Cần xử lý khối lượng lớn hoặc bảo mật cao?
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                LexOCR Desktop Pro là bản offline cho nhu cầu xử lý hàng trăm trang hoặc tài liệu cần kiểm soát chặt chẽ.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("upgrade")}
            className="inline-flex shrink-0 items-center space-x-1.5 whitespace-nowrap text-sm font-bold text-amber-400 transition-colors hover:text-amber-300"
          >
            <span>Tìm hiểu Desktop Pro</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full bg-white px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Câu hỏi thường gặp
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Một vài thông tin hữu ích trước khi bạn bắt đầu.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`ml-4 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-red-600" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? "max-h-48 border-t border-slate-200 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-slate-400">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs sm:px-12">
          <div className="mb-2 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
            <button
              onClick={() => setActiveTab("privacy")}
              className="transition-colors hover:text-white"
            >
              Chính sách bảo mật
            </button>
            <button
              onClick={() => setActiveTab("terms")}
              className="transition-colors hover:text-white"
            >
              Điều khoản sử dụng
            </button>
          </div>
          <p className="mb-2 text-slate-500">
            Hỗ trợ kỹ thuật: {" "}
            <a href="mailto:support@lexocr.com" className="transition-colors hover:text-slate-300">
              support@lexocr.com
            </a>
          </p>
          <p>© 2026 LexOCR</p>
        </div>
      </footer>
    </div>
  );
}