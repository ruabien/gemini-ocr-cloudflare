import { Zap, Target, Layers, ShieldCheck, X, Check, Sparkles } from "lucide-react";

const rows = [
  {
    icon: Zap,
    title: "Tốc độ xử lý",
    old: "15–20 phút mỗi trang gõ tay, mệt nhoài cả buổi sáng cho 1 bộ hồ sơ.",
    doc: "Chỉ 3 giây mỗi trang nhờ động cơ Gemini AI thế hệ mới nhất của Google.",
  },
  {
    icon: Target,
    title: "Độ chính xác",
    old: "Sai chính tả, mất dấu thanh, đặc biệt nguy hiểm với thuật ngữ pháp lý chuyên ngành.",
    doc: "Chính xác 99% — giữ nguyên thuật ngữ pháp lý, bố cục hành chính và số liệu dày đặc.",
  },
  {
    icon: Layers,
    title: "Năng lực xử lý",
    old: "Tải lên từng file một, hay treo trình duyệt khi file ảnh quá nặng.",
    doc: "Xử lý hàng loạt (batch) hàng chục ảnh và PDF nặng cùng lúc, mượt mà không gián đoạn.",
  },
  {
    icon: ShieldCheck,
    title: "Bảo mật & Riêng tư",
    old: "Tài liệu mật của khách hàng đi qua máy chủ trung gian không rõ nguồn gốc.",
    doc: "Direct Fetch ngay tại trình duyệt — tệp chạy thẳng tới Google qua Key cá nhân, DOC không ghi log.",
  },
];

export function Comparison() {
  return (
    <section id="features" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Kỷ nguyên AI mới
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            DOC — Kỷ nguyên số hóa tài liệu <span className="text-primary">sạch</span> bằng AI
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Không chỉ là bóc chữ — DOC trả về <strong className="text-foreground">văn bản số nguyên bản,
            chuẩn ngữ cảnh</strong>, sẵn sàng đưa vào hợp đồng, báo cáo hay hồ sơ tố tụng mà không cần chỉnh sửa lại.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <X className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-foreground">Lối mòn cũ</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-11">Gõ tay, Google Drive, app OCR free</p>
            <ul className="space-y-6">
              {rows.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <r.icon className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.old}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border-2 border-primary/40 bg-card p-8 shadow-elegant">
            <span className="absolute -top-3 right-6 rounded-full bg-success px-3 py-1 text-[10px] font-bold text-success-foreground uppercase tracking-wide">
              Khuyên dùng
            </span>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Check className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-bold text-primary">Giải pháp với DOC</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-11">Gemini AI + Direct Fetch</p>
            <ul className="space-y-6">
              {rows.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <r.icon className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{r.doc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
