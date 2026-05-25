import { KeyRound, Settings2, FileOutput, Play, Clock3 } from "lucide-react";

const steps = [
  {
    icon: KeyRound,
    title: "Tạo mã API Key miễn phí",
    desc: "Lấy API Key cá nhân hoàn toàn miễn phí từ Google AI Studio chỉ trong 30 giây. Không cần thẻ tín dụng, không ràng buộc.",
  },
  {
    icon: Settings2,
    title: "Dán Key vào ô cấu hình bảo mật",
    desc: "Mở ứng dụng DOC, dán đoạn mã API Key vào ô cấu hình bảo mật phía dưới. Key được lưu cục bộ ngay trên trình duyệt của bạn.",
  },
  {
    icon: FileOutput,
    title: "Kéo thả & sao chép kết quả",
    desc: "Kéo thả tệp ảnh hoặc PDF vào khung, chờ 3 giây và sao chép văn bản số sạch thuần túy — sẵn sàng dán vào Word, Excel.",
  },
];

export function Steps() {
  return (
    <section id="tutorial" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
            Mỳ ăn liền — Ai cũng dùng được
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Sử dụng <span className="text-primary">miễn phí trọn đời</span> chỉ sau 3 bước đơn giản
          </h2>
          <p className="mt-4 text-muted-foreground">
            Không rành công nghệ? Không sao cả. Xem video 30 giây ở bên phải là bạn làm chủ ngay.
          </p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: 3-step timeline */}
          <ol className="relative space-y-8">
            <span
              aria-hidden
              className="absolute left-[27px] top-3 bottom-3 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent"
            />
            {steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-5">
                <span className="relative z-10 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elegant">
                  <s.icon className="h-6 w-6" />
                </span>
                <div className="pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Bước {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* Right: video placeholder */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-primary/5 to-success/20 blur-3xl rounded-full" />
            <a
              href="https://doc.hotro.online"
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-video rounded-2xl border border-border bg-gradient-to-br from-[oklch(0.22_0.04_255)] to-primary overflow-hidden shadow-elegant group"
            >
              <div className="absolute inset-0 bg-grid opacity-30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur border border-white/30 group-hover:scale-110 transition animate-pulse-glow">
                  <Play className="h-9 w-9 ml-1 fill-current" />
                </span>
                <p className="mt-5 text-base sm:text-lg font-bold">Video hướng dẫn thực tế 30 giây</p>
                <p className="mt-1 text-xs sm:text-sm text-primary-foreground/80 text-center px-6">
                  Học nhanh cách lấy API Key cho người không rành công nghệ
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-[11px] font-medium">
                  <Clock3 className="h-3 w-3" /> 0:30
                </span>
              </div>
            </a>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Bấm để mở ứng dụng và làm theo từng bước
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
