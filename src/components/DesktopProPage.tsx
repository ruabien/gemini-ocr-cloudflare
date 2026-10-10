import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Key,
  Layers,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const disabledCtaTitle = "Sắp ra mắt — vui lòng quay lại sau";

export default function DesktopProPage() {
  return (
    <div className="flex flex-col w-full animate-fade-in">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-14 text-white shadow-xl sm:px-10 sm:py-20">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#f8fafc_1px,transparent_1px),linear-gradient(to_bottom,#f8fafc_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-28 left-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-200">
              <ShieldCheck className="h-4 w-4" />
              Ứng dụng desktop xử lý hồ sơ tại máy
            </div>

            <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              LexOCR Pro Desktop — Bóc tách hồ sơ Offline 100%
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Giải pháp dành cho hồ sơ pháp lý và tài liệu nhạy cảm: dữ liệu được xử lý ngay trên máy tính của bạn,
              không tải tệp lên đám mây, không gửi nội dung hồ sơ tới dịch vụ AI trực tuyến.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled
                title={disabledCtaTitle}
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-600 px-5 py-3 text-sm font-bold text-slate-300 opacity-80 shadow-sm"
              >
                <Key className="h-4 w-4" />
                Mua license
              </button>
              <button
                type="button"
                disabled
                title={disabledCtaTitle}
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800/70 px-5 py-3 text-sm font-bold text-slate-300 opacity-80"
              >
                <Sparkles className="h-4 w-4" />
                Tải bản dùng thử
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Sắp ra mắt — vui lòng quay lại sau.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-600/70 bg-slate-800/70 p-4 shadow-2xl backdrop-blur">
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-500 bg-slate-900/70 px-6 text-center">
              <div className="mb-4 rounded-2xl bg-blue-500/15 p-4">
                <FileText className="h-12 w-12 text-blue-300" />
              </div>
              <p className="text-base font-semibold text-slate-100">
                Giao diện LexOCR Pro Desktop
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                Screenshot Desktop UI sẽ được cập nhật khi ra mắt
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-1 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-lg bg-rose-100 p-3">
                <AlertTriangle className="h-7 w-7 text-rose-600" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Hồ sơ pháp lý không nên phụ thuộc vào đám mây
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              <p>
                Hồ sơ vụ việc, tài liệu tố tụng, chứng cứ, thông tin cá nhân và dữ liệu nghiệp vụ thường chứa nội dung
                cần được kiểm soát chặt chẽ. Khi sử dụng OCR hoặc AI trên nền tảng đám mây, tệp có thể phải rời khỏi
                môi trường làm việc nội bộ để được xử lý.
              </p>
              <p>
                Điều đó làm tăng rủi ro về đường truyền, chính sách lưu giữ dữ liệu của bên thứ ba, quyền truy cập
                tài khoản và khả năng đáp ứng các yêu cầu bảo mật nội bộ.
              </p>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-rose-900">
                <strong>LexOCR Pro Desktop</strong> được định hướng cho quy trình xử lý tại chỗ: hồ sơ ở lại trên máy
                của bạn trong suốt quá trình bóc tách.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-1 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Giải pháp desktop chuyên dụng</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Làm việc với hồ sơ nhạy cảm, chủ động và an tâm hơn
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <Shield className="h-7 w-7 text-emerald-600" />
              <h3 className="mt-4 font-bold text-slate-900">Offline 100%</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Xử lý hồ sơ ngay tại máy tính, không cần tải tài liệu lên đám mây.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <Sparkles className="h-7 w-7 text-blue-600" />
              <h3 className="mt-4 font-bold text-slate-900">OneOCR của Microsoft</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Tận dụng công nghệ OCR của Microsoft, tối ưu cho nhu cầu nhận diện tài liệu tiếng Việt.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <FileText className="h-7 w-7 text-indigo-600" />
              <h3 className="mt-4 font-bold text-slate-900">Xuất DOCX chuẩn Nghị định 30</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Hỗ trợ tạo tệp DOCX phục vụ quy trình soạn thảo và hoàn thiện văn bản hành chính.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
              <h3 className="mt-4 font-bold text-slate-900">Trích xuất Excel có cấu trúc</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Chuyển dữ liệu từ biểu mẫu và bảng biểu sang định dạng thuận tiện cho rà soát, tổng hợp.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <Layers className="h-7 w-7 text-amber-600" />
              <h3 className="mt-4 font-bold text-slate-900">Portable, không cần quyền Admin</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Thiết kế gọn nhẹ để triển khai linh hoạt trong môi trường máy tính nghiệp vụ.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <Key className="h-7 w-7 text-rose-600" />
              <h3 className="mt-4 font-bold text-slate-900">License key vĩnh viễn</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Mua một lần, sử dụng lâu dài với license key dành cho phiên bản desktop.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-1 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              So sánh LexOCR Miễn phí và Pro Desktop
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Chọn công cụ phù hợp với mức độ nhạy cảm và yêu cầu xử lý hồ sơ của bạn.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-100">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Tiêu chí</th>
                    <th className="px-5 py-4 font-semibold">LexOCR Miễn phí</th>
                    <th className="px-5 py-4 font-semibold text-amber-300">LexOCR Pro Desktop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="px-5 py-4 font-medium text-slate-800">Môi trường xử lý</td>
                    <td className="px-5 py-4">Trên trình duyệt</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">Tại máy, Offline 100%</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-slate-800">Công nghệ OCR</td>
                    <td className="px-5 py-4">Tesseract</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">OneOCR của Microsoft</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-slate-800">Hồ sơ nhạy cảm</td>
                    <td className="px-5 py-4">Phù hợp nhu cầu cơ bản</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">Ưu tiên kiểm soát dữ liệu tại chỗ</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-slate-800">Xuất dữ liệu nâng cao</td>
                    <td className="px-5 py-4">Văn bản cơ bản</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">DOCX Nghị định 30 và Excel có cấu trúc</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-4 font-medium text-slate-800">Hình thức sử dụng</td>
                    <td className="px-5 py-4">Miễn phí</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">License key mua một lần</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-900 px-6 py-16 text-white sm:px-10 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Hướng dẫn sử dụng</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Ba bước để bắt đầu khi sản phẩm ra mắt
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">1</span>
              <h3 className="mt-5 font-bold">Mua license</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Nhận license key dành cho phiên bản LexOCR Pro Desktop.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">2</span>
              <h3 className="mt-5 font-bold">Tải installer</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Tải bộ cài đặt hoặc bản portable phù hợp với máy tính của bạn.
              </p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950">3</span>
              <h3 className="mt-5 font-bold">Nhập key</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Kích hoạt license trong ứng dụng và bắt đầu xử lý hồ sơ tại máy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-1 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <HelpCircle className="mx-auto h-8 w-8 text-blue-600" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Câu hỏi thường gặp
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-bold text-slate-800">
                License có thời hạn sử dụng không?
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                License key được định hướng theo hình thức mua một lần, sử dụng vĩnh viễn cho phiên bản được cấp phép.
                Chính sách chi tiết sẽ được công bố khi sản phẩm ra mắt.
              </p>
            </details>

            <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-bold text-slate-800">
                Tôi có cần quyền quản trị viên để sử dụng không?
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Phiên bản portable được định hướng để sử dụng linh hoạt mà không yêu cầu quyền quản trị viên trong quá
                trình vận hành thông thường.
              </p>
            </details>

            <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-bold text-slate-800">
                Ứng dụng có gửi hồ sơ lên máy chủ không?
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Không. LexOCR Pro Desktop được định hướng xử lý hồ sơ Offline 100%, giúp tài liệu ở lại trên máy tính
                của người dùng.
              </p>
            </details>

            <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-bold text-slate-800">
                Tôi có nhận được bản cập nhật không?
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Chính sách cập nhật và phạm vi hỗ trợ theo license sẽ được công bố cùng thời điểm phát hành chính thức.
              </p>
            </details>

            <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-bold text-slate-800">
                Khi nào tôi có thể mua hoặc tải bản dùng thử?
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Các kênh mua license và tải bản dùng thử hiện đang được chuẩn bị. Vui lòng quay lại sau để nhận thông
                tin phát hành.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="px-1 pb-16 sm:pb-20">
        <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-to-r from-blue-700 to-slate-900 px-6 py-12 text-center text-white shadow-lg sm:px-10">
          <Lock className="mx-auto h-10 w-10 text-amber-300" />
          <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            Giữ hồ sơ ở nơi bạn kiểm soát
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            LexOCR Pro Desktop đang được hoàn thiện để phục vụ quy trình bóc tách hồ sơ an toàn, riêng tư và không phụ
            thuộc đám mây.
          </p>
          <button
            type="button"
            disabled
            title={disabledCtaTitle}
            className="mt-7 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-400 px-5 py-3 text-sm font-bold text-slate-700 opacity-80"
          >
            <CheckCircle2 className="h-4 w-4" />
            Đăng ký nhận thông tin ra mắt
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs sm:px-6 lg:px-8">
          <div className="mb-2 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
            <a href="/privacy" className="transition-colors hover:text-white">
              Chính sách bảo mật
            </a>
            <a href="/terms" className="transition-colors hover:text-white">
              Điều khoản sử dụng
            </a>
          </div>
          <div className="mb-2 text-slate-500">
            Hỗ trợ kỹ thuật:{" "}
            <a href="mailto:support@lexocr.com" className="transition-colors hover:text-slate-300">
              support@lexocr.com
            </a>
          </div>
          <p>© 2026 LexOCR</p>
        </div>
      </footer>
    </div>
  );
}