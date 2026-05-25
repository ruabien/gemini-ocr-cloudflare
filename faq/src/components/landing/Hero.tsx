import { AlertTriangle, Clock, Eye, FileWarning, Type, Hash } from "lucide-react";

export function Hero() {
  return (
    <section id="pain" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24">
        <div className="text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Nỗi đau thầm lặng của dân văn phòng
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Bạn đang lãng phí <span className="text-primary">hàng giờ đồng hồ</span> để gõ lại tài liệu bằng tay?
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Mỗi sáng, hàng nghìn thư ký pháp lý, kế toán viên và nhân viên hành chính lại ngồi trước màn hình,
            căng mắt gõ lại từng dòng từ những bản án mờ nhòe, file PDF scan lệch khung, hay xấp giấy tờ
            dày cộp vừa nhận từ khách hàng. Một công việc lặp đi lặp lại, bào mòn năng suất và cả thị lực.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-up [animation-delay:120ms]">
          <PainCard
            icon={Clock}
            title="Gõ tay chậm như rùa bò"
            desc="Trung bình 15–20 phút để gõ lại 1 trang A4 dày chữ. Một bộ hồ sơ 50 trang có thể ngốn trọn cả ngày làm việc."
          />
          <PainCard
            icon={Eye}
            title="Mỏi mắt, đau cổ, tụt năng suất"
            desc="Liếc qua liếc lại giữa giấy và màn hình suốt 8 tiếng khiến mắt khô rát, vai gáy nhức mỏi, hiệu suất giảm trầm trọng."
          />
          <PainCard
            icon={Type}
            title="OCR miễn phí phá nát font tiếng Việt"
            desc="Google Drive, app free thường biến 'Nguyễn' thành 'Nguyen', làm vỡ dấu thanh và xóa sạch định dạng đoạn."
          />
          <PainCard
            icon={Hash}
            title="Nuốt mất con số — tử huyệt kế toán"
            desc="Một chữ số bị bỏ sót trong báo cáo tài chính hay hợp đồng có thể khiến bạn mất việc, mất khách hàng, mất uy tín."
          />
          <PainCard
            icon={FileWarning}
            title="Mất định dạng — phải dàn trang lại từ đầu"
            desc="Bảng biểu, danh sách đánh số, đề mục bị bóc thành một khối chữ hỗn loạn. Công sức gõ lại đổ sông đổ biển."
          />
          <PainCard
            icon={AlertTriangle}
            title="Rủi ro pháp lý nghiêm trọng"
            desc="Với bản án, hợp đồng, hồ sơ tố tụng — chỉ một lỗi chính tả nhỏ cũng có thể làm sai lệch toàn bộ ý chí pháp lý."
            highlight
          />
        </div>

        <div className="mt-14 text-center">
          <p className="text-base sm:text-lg text-foreground/80 font-medium">
            Đã đến lúc bạn cần một giải pháp xứng đáng với chuyên môn của mình.
          </p>
          <div className="mt-2 inline-block h-1 w-16 rounded-full bg-primary/60" />
        </div>
      </div>
    </section>
  );
}

function PainCard({
  icon: Icon,
  title,
  desc,
  highlight,
}: {
  icon: typeof Clock;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 bg-card transition hover:-translate-y-1 hover:shadow-elegant ${
        highlight ? "border-destructive/40 bg-destructive/[0.03]" : "border-border"
      }`}
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
          highlight ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
