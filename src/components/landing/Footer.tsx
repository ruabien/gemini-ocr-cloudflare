import { FileText, ArrowRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Sẵn sàng giải phóng đôi tay và <span className="text-primary">tối ưu hóa thời gian</span>?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Hàng nghìn luật sư, kế toán và nhân viên hành chính đã bỏ thói quen gõ tay. Đến lượt bạn.
          </p>
          <a
            href="https://doc.hotro.online"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant animate-pulse-glow hover:scale-[1.02] transition"
          >
            Trải nghiệm ứng dụng DOC ngay
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </span>
            <span className="font-bold text-primary">DOC</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#tutorial" className="hover:text-primary transition-colors">Tài liệu</a>
            <a href="#features" className="hover:text-primary transition-colors">Tính năng</a>
            <a href="#security" className="hover:text-primary transition-colors">Bảo mật</a>
          </nav>

          <p className="text-xs text-muted-foreground">
            © 2026 DOC. Phát triển trên nền tảng Cloudflare Pages.
          </p>
        </div>
      </div>
    </footer>
  );
}
