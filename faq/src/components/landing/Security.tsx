import { ShieldCheck, KeyRound, Lock, Repeat } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    icon: KeyRound,
    q: "API Key là gì? Tại sao tôi phải tự điền vào ứng dụng?",
    a: "API Key giống như chiếc chìa khóa cá nhân do chính Google cấp để bạn sử dụng trực tiếp tài nguyên AI của họ miễn phí. Nhờ dán Key riêng, bạn được sở hữu toàn bộ hạn mức xử lý ký tự khổng lồ của Google mà không bị bóp băng thông hay bắt nạp tiền như các app thương mại khác.",
  },
  {
    icon: Lock,
    q: "Tài liệu pháp lý và hồ sơ doanh nghiệp của tôi có bị đọc trộm hay lưu lại không?",
    a: "Tuyệt đối KHÔNG. DOC hoạt động theo mô hình xử lý tại thiết bị (Direct Fetch). Dữ liệu mã hóa chạy thẳng từ trình duyệt của bạn lên máy chủ an toàn của Google. Đội ngũ phát triển DOC không sở hữu máy chủ trung gian lưu trữ và hoàn toàn không thể tiếp cận tệp tin của bạn. Dữ liệu của bạn là tài sản tối mật của riêng bạn.",
  },
  {
    icon: Repeat,
    q: 'Tại sao đôi khi đang chạy hàng loạt ứng dụng lại báo "Đang đổi Key"?',
    a: "Đây là tính năng thông minh độc quyền của DOC. Khi một chiếc Key chạm ngưỡng giới hạn yêu cầu theo phút của Google, hệ thống sẽ tự động kích hoạt xoay vòng sang chiếc Key tiếp theo trong danh sách dự phòng của bạn để đảm bảo tiến trình bóc tách hàng trăm trang tài liệu diễn ra liên tục, không bị ngắt quãng.",
  },
];

export function Security() {
  return (
    <section id="security" className="py-24 bg-surface">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cam kết minh bạch
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Câu hỏi thường gặp & <span className="text-primary">Cam kết bảo mật</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Mọi băn khoăn của bạn về quyền riêng tư và cách hoạt động của DOC đều được trả lời tại đây.
          </p>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-soft">
          <Accordion type="single" collapsible defaultValue="item-0" className="divide-y divide-border">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="border-0 px-2 sm:px-4">
                <AccordionTrigger className="py-5 text-left text-base sm:text-lg font-semibold text-foreground hover:no-underline hover:text-primary">
                  <span className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <span className="pt-1.5">{f.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-12 pr-2 pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-[oklch(0.38_0.18_258)] p-6 sm:p-8 text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div>
            <p className="text-base sm:text-lg font-bold">DOC không bao giờ chạm vào tệp tin của bạn.</p>
            <p className="mt-1 text-sm text-primary-foreground/85 leading-relaxed">
              Toàn bộ tài liệu — hợp đồng, bản án, hóa đơn, hồ sơ khách hàng — đi thẳng từ trình duyệt
              của bạn đến máy chủ Google qua kết nối mã hóa. Không log, không lưu, không trung gian.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
