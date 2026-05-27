import { FileText } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <FileText className="h-5 w-5" />
          </span>
          <span className="font-bold text-xl tracking-tight text-primary">DOC</span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Tính năng</a>
          <a href="#tutorial" className="hover:text-primary transition-colors">Hướng dẫn</a>
          <a href="#security" className="hover:text-primary transition-colors">Bảo mật</a>
        </nav>

        <a
          href="https://doc.hotro.online"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition"
        >
          Sử dụng miễn phí
        </a>
      </div>
    </header>
  );
}
