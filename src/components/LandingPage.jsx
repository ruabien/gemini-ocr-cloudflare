import { useState, useEffect } from 'react';
import { 
  Sparkles, ShieldCheck, Zap, Layers, FileOutput, RefreshCw, 
  HelpCircle, ChevronDown, Check, ArrowRight, Upload, Play,
  Lock, Eye, ServerOff, Cpu, FileText, Camera, Gavel, AlertTriangle,
  Shield, BookOpen, Search, ClipboardCheck
} from 'lucide-react';
import FileDropzone from './FileDropzone';

export default function LandingPage({ onFilesSelected, onOpenSettings }) {
  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  
  // Live Demo Typing State
  const [demoText, setDemoText] = useState('');
  const demoTextTarget = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nĐƠN KHỞI KIỆN\n\nKính gửi: Tòa án nhân dân quận Hoàn Kiếm, thành phố Hà Nội.\n\nTôi tên là: Nguyễn Văn A, sinh năm 1985.\nCăn cước công dân số: 001085000123 cấp ngày 15/10/2021 tại Cục Cảnh sát Quản lý hành chính về trật tự xã hội.";
  
  // Typing Effect for Live Demo
  useEffect(() => {
    let index = 0;
    let timer;
    
    const startTyping = () => {
      timer = setInterval(() => {
        if (index < demoTextTarget.length) {
          setDemoText(demoTextTarget.substring(0, index + 1));
          index++;
        } else {
          clearInterval(timer);
          // Wait and restart loop
          setTimeout(() => {
            setTimeout(() => {
              index = 0;
              setDemoText('');
              startTyping();
            }, 4000);
          }, 2000);
        }
      }, 18);
    };
    
    startTyping();
    
    return () => clearInterval(timer);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Trigger hidden input click
  const triggerGlobalUpload = () => {
    const input = document.getElementById('landing-global-file-input');
    if (input) {
      input.click();
    }
  };

  const handleGlobalFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const faqItems = [
    {
      q: "DOC có đảm bảo an toàn bí mật hồ sơ vụ án không?",
      a: "Tuyệt đối an toàn. Ứng dụng chạy trực tiếp trên trình duyệt của bạn (Client-Side). Tất cả dữ liệu hồ sơ vụ án, chứng cứ chụp thực địa đều được xử lý cục bộ và chuyển thẳng tới máy chủ bảo mật của Google qua kết nối HTTPS mã hóa, không qua bất kỳ máy chủ trung gian nào của DOC. Thiết kế này đáp ứng các tiêu chuẩn bảo mật nghiêm ngặt của Luật Bảo vệ bí mật nhà nước."
    },
    {
      q: "API Key Gemini được quản lý như thế nào để tránh lộ thông tin?",
      a: "Gemini API Key cá nhân của bạn được lưu trữ cục bộ tại bộ nhớ trình duyệt (localStorage) của bạn. Hệ thống hoạt động phi trạng thái (stateless), không ghi nhật ký lịch sử tài liệu tố tụng hay lưu trữ khóa của bạn trên đám mây. Bạn có thể xóa cấu hình này bất cứ lúc nào."
    },
    {
      q: "Có bóc tách được các bản scan tài liệu chứng cứ cũ, mờ hoặc chữ viết tay không?",
      a: "Nhờ sức mạnh của trí tuệ nhân tạo Google Gemini AI thế hệ mới, ứng dụng tự động nhận diện ngữ cảnh tiếng Việt pháp lý để khôi phục và sửa các chữ bị mờ, mất nét, dính chữ do chất lượng quét ảnh kém từ hồ sơ cũ hoặc ảnh chụp thực địa."
    },
    {
      q: "Hệ thống hỗ trợ xuất những định dạng tài liệu nào phục vụ xây dựng hồ sơ án?",
      a: "Bạn có thể xuất văn bản bóc tách sang định dạng tài liệu Word (.docx), Markdown (.md) hoặc tệp văn bản thuần (.txt) được chuẩn hóa, giúp dễ dàng sao chép trực tiếp vào các mẫu văn bản tố tụng, cáo trạng hoặc bản án mà không lo lỗi định dạng."
    },
    {
      q: "Có giới hạn số lượng trang tài liệu scan hoặc dung lượng file không?",
      a: "DOC hỗ trợ tải lên nhiều hình ảnh chứng cứ cùng lúc và các tệp hồ sơ PDF scan dung lượng tối đa lên đến 100MB. Hệ thống tự động phân tách trang PDF và xử lý song song trên hàng đợi để hoàn thành việc bóc tách tài liệu số lượng lớn trong thời gian ngắn nhất."
    },
    {
      q: "Làm thế nào để lấy Gemini API Key miễn phí?",
      a: "Bạn chỉ cần truy cập Google AI Studio (aistudio.google.com), đăng nhập bằng tài khoản Google bất kỳ, click vào nút 'Get API Key' và tạo một khoá trong 10 giây. Bạn có thể click vào nút 'Xem cách hoạt động' ở góc trên để xem video hướng dẫn chi tiết."
    }
  ];

  return (
    <div className="relative min-h-screen bg-background text-on-surface flex flex-col font-sans">
      {/* Hidden file input for CTA triggers */}
      <input 
        type="file" 
        id="landing-global-file-input"
        onChange={handleGlobalFileChange}
        accept=".pdf, .jpg, .jpeg, .png"
        multiple
        className="hidden"
      />

      {/* Grid background overlay */}
      <div className="absolute inset-0 bg-grid pointer-events-none z-0" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full glass-card border-b border-outline-variant/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-ai-accent flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform duration-300">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-primary to-ai-accent bg-clip-text text-transparent">
                DOC
              </span>
            </a>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
              <button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors cursor-pointer">Tính năng</button>
              <button onClick={() => scrollToSection('demo')} className="hover:text-primary transition-colors cursor-pointer">Live Demo</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-primary transition-colors cursor-pointer">Cách hoạt động</button>
              <button onClick={() => scrollToSection('security')} className="hover:text-primary transition-colors cursor-pointer">Bảo mật</button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition-colors cursor-pointer">Câu hỏi</button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onOpenSettings}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary-container/20 transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-icons text-[18px]">settings</span>
              <span>Cấu hình API</span>
            </button>
            <button 
              onClick={triggerGlobalUpload}
              className="btn-premium-primary text-white text-xs sm:text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <span>Dùng miễn phí</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto w-full px-6 pt-16 pb-20 md:pt-24 md:pb-28 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Content */}
          <div className="lg:col-span-6 space-y-8 text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-container border border-primary/20 text-primary text-xs font-bold shadow-sm">
              <Sparkles size={13} className="text-ai-accent" />
              <span className="uppercase tracking-wider">Số hóa hồ sơ tư pháp bằng AI thế hệ mới</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface leading-[1.1]">
              Trợ lý số hóa <br />
              <span className="gradient-text-ai text-3xl sm:text-4xl lg:text-5xl block mt-2">Hồ sơ tư pháp bằng AI</span>
            </h1>
            
            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-xl">
              Chuyển PDF scan, ảnh chụp hồ sơ, bản án, quyết định, hợp đồng và tài liệu nghiệp vụ thành văn bản có thể sao chép, tra cứu và xử lý.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={triggerGlobalUpload}
                className="btn-premium-primary text-white font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 text-sm sm:text-base group"
              >
                <Upload size={18} />
                <span>Bắt đầu OCR tài liệu</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => scrollToSection('security')}
                className="btn-premium-secondary text-on-surface font-semibold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
              >
                <Lock size={16} className="text-primary" />
                <span>Xem cam kết bảo mật</span>
              </button>
            </div>
            
            {/* Trust badges */}
            <div className="pt-6 border-t border-outline-variant/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Bảo mật Zero-Server</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers size={14} className="text-primary shrink-0" />
                  <span>Xử lý hồ sơ lớn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileOutput size={14} className="text-ai-accent shrink-0" />
                  <span>Tải Word (.docx) sạch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock size={14} className="text-indigo-500 shrink-0" />
                  <span>Tuân thủ bảo vệ bí mật</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Right Visual: Premium Dropzone */}
          <div className="lg:col-span-6 animate-fade-up [animation-delay:150ms]">
            <div className="relative p-2 rounded-3xl bg-gradient-to-tr from-primary/10 via-transparent to-ai-accent/15 border border-outline-variant/40 shadow-2xl glass-card">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-ai-accent/10 rounded-full blur-3xl -z-10" />
              
              <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <FileDropzone onFilesSelected={onFilesSelected} />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="border-y border-outline-variant/40 bg-surface/30 backdrop-blur-sm py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary to-ai-accent bg-clip-text text-transparent">50.000+</div>
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-wider">Hồ sơ tư pháp được số hóa</p>
            </div>
            <div className="space-y-1 border-y md:border-y-0 md:border-x border-outline-variant/40 py-6 md:py-0">
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary to-ai-accent bg-clip-text text-transparent">98%</div>
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-wider">Chính xác thuật ngữ pháp lý</p>
            </div>
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-primary to-ai-accent bg-clip-text text-transparent">10x</div>
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-wider">Tiết kiệm thời gian lập hồ sơ</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: DÀNH CHO AI */}
      <section id="targets" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10 border-t border-outline-variant/40">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <Gavel size={12} />
            <span>Đối tượng phục vụ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Dành cho ai?
          </h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto leading-relaxed">
            Giải pháp chuyên dụng hỗ trợ đắc lực cho cán bộ nghiệp vụ và chuyên gia trong khối tư pháp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base">Kiểm sát viên</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Số hóa nhanh hồ sơ vụ án, biên bản lấy lời khai phục vụ lập cáo trạng và xây dựng hồ sơ kiểm sát.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Gavel size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base">Thẩm phán</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Trích xuất nội dung chứng cứ, hồ sơ kiện tụng, bản án lịch sử phục vụ công tác nghiên cứu nghiệp vụ.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base">Luật sư</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Số hóa nhanh chóng tài liệu do khách hàng cung cấp và hồ sơ tố tụng phục vụ nghiên cứu phương án bào chữa.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base">Điều tra viên</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Chuyển đổi các biên bản hỏi cung viết tay, biên bản khám nghiệm hiện trường thành văn bản số hóa lưu trữ.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <ClipboardCheck size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base">Chấp hành viên</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Số hóa nhanh các quyết định thi hành án, biên bản kê biên tài sản phục vụ đôn đốc và theo dõi hồ sơ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE OCR DEMO (BEFORE/AFTER) */}
      <section id="demo" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ai-accent/10 border border-ai-accent/20 text-ai-accent text-xs font-bold">
            <Sparkles size={12} />
            <span>Trải nghiệm số hóa</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Số hóa hồ sơ vụ án thông minh
          </h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto leading-relaxed">
            Xem cách AI tự động phục hồi văn bản pháp lý từ ảnh chụp chứng cứ bị mờ và tự sửa lỗi chính tả theo đúng ngữ cảnh tư pháp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Left Column: Original Scanned Image Visual */}
          <div className="rounded-2xl border border-outline-variant/40 bg-white shadow-md p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                Tài liệu chứng cứ / Biên bản gốc (Mờ, dính chữ)
              </span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">JPEG/PDF</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center bg-slate-50/80 rounded-xl p-6 border border-dashed border-slate-200 relative overflow-hidden min-h-[220px]">
              <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
              
              <div className="relative space-y-3 font-serif text-sm text-slate-400/90 leading-relaxed italic select-none">
                <p className="line-through decoration-red-400/60 decoration-2">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIÊT NAM (Thiếu dấu)</p>
                <p className="line-through decoration-red-400/60 decoration-2">Đọc lập - Tự do - Hạnh phúc (Sai chính tả)</p>
                <p className="mt-4 font-bold text-slate-500">ĐƠN KHỞI KIỆN</p>
                <p className="line-through decoration-red-400/60 decoration-2">Kính gửi: Toà an nhan dan quan Hoan Kiem... (Không dấu)</p>
                <p className="line-through decoration-red-400/60 decoration-2">Căn cước công dân số: OO1O85OOO123 (Nhầm O với số 0)</p>
              </div>
              
              {/* Badges pointing out errors */}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">Mất dấu</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">Sai số</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between text-xs text-on-surface-variant/80 font-medium">
              <span>Độ phân giải thấp</span>
              <span>Ảnh chụp hiện trường/Điện thoại</span>
            </div>
          </div>

          {/* Right Column: AI Processed Text Result */}
          <div className="rounded-2xl border border-primary/20 bg-white shadow-lg shadow-primary/5 p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Visual border glow for AI theme */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-ai-accent/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                Văn bản số hóa bởi DOC AI
              </span>
              <span className="text-xs bg-primary-container text-primary px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Sparkles size={10} />
                AI Nghiệp Vụ
              </span>
            </div>

            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-5 font-mono text-xs text-on-surface leading-relaxed min-h-[220px] whitespace-pre-wrap select-all">
              <span className="typing-cursor font-medium">{demoText}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold flex items-center gap-0.5">
                  <Check size={10} /> Đã sửa dấu
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold flex items-center gap-0.5">
                  <Check size={10} /> Nhận diện số chuẩn
                </span>
              </div>
              <span className="text-[11px] font-bold text-primary">Tự động giữ bố cục gốc</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <Layers size={12} />
            <span>Tính năng chuyên biệt</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Tại sao DOC mang lại hiệu quả vượt trội?
          </h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto leading-relaxed">
            Thiết kế chuyên biệt cho hồ sơ tố tụng và tài liệu tư pháp tiếng Việt phức tạp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Zap size={22} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Số hóa nghiệp vụ siêu tốc</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Xử lý hồ sơ tài liệu tức thì chỉ trong vài giây mỗi trang chứng cứ. Tách luồng xử lý song song để giảm thời gian chờ đợi đối với các vụ án nhiều trang.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-ai-accent/10 flex items-center justify-center text-ai-accent mb-5">
              <Sparkles size={22} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Tối ưu tiếng Việt tư pháp</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Khả năng nhận dạng chuẩn xác 100% các từ ngữ pháp lý cổ, từ viết tắt hành chính, dấu quốc huy và văn phong tư pháp Việt Nam.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Bảo mật tài liệu tuyệt đối</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Xử lý hoàn toàn tại Client-Side. Tài liệu nghiệp vụ nhạy cảm được truyền thẳng tới cổng bảo mật Google API, đáp ứng nghiêm ngặt việc bảo vệ bí mật tư pháp.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
              <Layers size={22} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Bảo toàn cấu trúc văn bản</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Giữ nguyên định dạng bảng biểu, thụt lề biên bản ghi lời khai, phân vùng chữ ký/dấu đỏ giúp hồ sơ số hóa giữ đúng nguyên bản.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
              <RefreshCw size={22} />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Xử lý hồ sơ vụ án lớn</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Thả hàng chục ảnh tài liệu hoặc tệp PDF vụ án hàng trăm trang. Hệ thống tự động phân tách trang và ghép nối kết quả văn bản số hóa hoàn chỉnh.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-white p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-5">
              <Sparkles size={22} className="text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">AI phục hồi chữ mờ, hỏng</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Sử dụng trí tuệ nhân tạo để phân tích ngữ cảnh hồ sơ, tự động bổ sung nét chữ mờ, sửa các lỗi dính chữ do chất lượng giấy tờ lưu trữ lâu năm kém.
            </p>
          </div>

        </div>
      </section>

      {/* USE CASES SECTION */}
      <section id="use-cases" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10 border-t border-outline-variant/40">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <FileText size={12} />
            <span>Ứng dụng nghiệp vụ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Ứng dụng trong nghiệp vụ
          </h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto leading-relaxed">
            Hỗ trợ toàn diện các hoạt động chuyên môn tố tụng và xử lý tài liệu pháp lý hàng ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Use Case 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Số hóa hồ sơ vụ án scan</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Chuyển đổi toàn diện tập hồ sơ PDF scan nhiều trang thành định dạng văn bản sạch để chỉnh sửa, lưu trữ.
              </p>
            </div>
          </div>

          {/* Use Case 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Gavel size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Bóc tách nội dung bản án, quyết định</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Trích xuất chính xác thông tin pháp lý, các quyết định tố tụng, án lệ phục vụ nghiên cứu nghiệp vụ.
              </p>
            </div>
          </div>

          {/* Use Case 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <Camera size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Chuyển ảnh chụp tài liệu thành văn bản</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Nhận diện chữ tiếng Việt từ ảnh chụp bằng điện thoại di động tại thực địa hoặc trong phòng hồ sơ.
              </p>
            </div>
          </div>

          {/* Use Case 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <FileOutput size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Trích xuất nội dung hợp đồng, đơn từ, biên bản</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Hỗ trợ bóc tách các điều khoản cam kết, lời khai viết tay hay đánh máy một cách nhanh chóng.
              </p>
            </div>
          </div>

          {/* Use Case 5 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Hỗ trợ tra cứu nhanh trong tài liệu dài</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Dễ dàng tìm kiếm thông tin pháp lý, định vị nội dung quan trọng trong hồ sơ dài hàng trăm trang.
              </p>
            </div>
          </div>

          {/* Use Case 6 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-on-surface text-base mb-2">Chuẩn bị dữ liệu để tóm tắt, phân tích hoặc soạn thảo</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Cung cấp dữ liệu văn bản sạch để tóm tắt thông tin vụ án, phân tích hoặc đưa vào các mẫu báo cáo nghiệp vụ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10 border-t border-outline-variant/40">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            <Play size={12} className="fill-indigo-700" />
            <span>Quy trình sử dụng</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Quy trình 3 bước
          </h2>
          <p className="text-on-surface-variant text-base max-w-xl mx-auto leading-relaxed">
            Tối giản, bảo mật và tương thích với nghiệp vụ tư pháp hàng ngày của bạn.
          </p>
        </div>

        {/* Steps Timeline UI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-4xl mx-auto">
          {/* Decorative connector line on desktop */}
          <div className="hidden md:block absolute top-[2.5rem] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-primary/30 to-ai-accent/30 -z-10" />
          
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-outline-variant/50 shadow-md flex items-center justify-center mx-auto text-primary font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                1
              </div>
              <Upload size={28} />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Tải PDF hoặc hình ảnh</h3>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
              Tải hình ảnh chứng cứ (.jpg, .png, .webp) hoặc tài liệu scan hồ sơ (.pdf) lên hệ thống.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-outline-variant/50 shadow-md flex items-center justify-center mx-auto text-ai-accent font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-ai-accent text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                2
              </div>
              <Cpu size={28} className="animate-spin-[duration:10s]" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">OCR bằng AI</h3>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
              Mô hình Gemini AI tiến hành phân tích hình ảnh và tái tạo văn bản, tự động khôi phục chữ mờ theo ngữ cảnh tố tụng.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white border border-outline-variant/50 shadow-md flex items-center justify-center mx-auto text-emerald-500 font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                3
              </div>
              <FileOutput size={28} />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Sao chép hoặc tải kết quả</h3>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
              Sao chép văn bản số hóa sạch bằng 1-click hoặc kết xuất sang file Microsoft Word (.docx) để hoàn tất hồ sơ.
            </p>
          </div>

        </div>
      </section>

      {/* TRUST & SECURITY (DARK PANEL) */}
      <section id="security" className="bg-slate-950 text-slate-100 py-20 relative overflow-hidden z-10">
        {/* Background ambient glow */}
        <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-4 text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <ShieldCheck size={12} />
                <span>Bảo mật & Quyền riêng tư</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                An toàn tuyệt đối cho hồ sơ tài liệu tư pháp
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Chúng tôi hiểu rằng hồ sơ vụ án, tài liệu chứng cứ và các biên bản nghiệp vụ tư pháp là tài sản đặc biệt quan trọng, nhạy cảm và thuộc phạm vi bảo mật cao. DOC được thiết kế trên mô hình phi trạng thái (stateless) để đảm bảo dữ liệu luôn thuộc quyền kiểm soát tuyệt đối của riêng bạn.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-3 hover:bg-white/[0.05] transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <ServerOff size={18} />
                </div>
                <h3 className="font-bold text-white text-base">Xử lý file cục bộ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hồ sơ chứng cứ được xử lý tách trang trực tiếp trên trình duyệt, gửi thẳng tới máy chủ bảo mật của Google qua kết nối HTTPS mã hóa mà không qua bất kỳ server trung gian nào.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-3 hover:bg-white/[0.05] transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <Lock size={18} />
                </div>
                <h3 className="font-bold text-white text-base">Lưu API Key tại máy</h3>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Gemini API Key được mã hóa và lưu trữ cục bộ dưới dạng <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded text-primary">localStorage</code> trên trình duyệt của riêng bạn, đáp ứng các tiêu chuẩn bảo mật dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-3 hover:bg-white/[0.05] transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-ai-accent/15 flex items-center justify-center text-ai-accent">
                  <RefreshCw size={18} />
                </div>
                <h3 className="font-bold text-white text-base">Không lưu lịch sử</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hệ thống hoạt động phi trạng thái (stateless). Các tệp tin nghiệp vụ và kết quả số hóa chỉ tồn tại tạm thời trong bộ nhớ phiên làm việc và tự động hủy sạch ngay khi bạn đóng tab trình duyệt.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-3 hover:bg-white/[0.05] transition-all text-left">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Eye size={18} />
                </div>
                <h3 className="font-bold text-white text-base">Dễ dàng xoá bỏ</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bạn có thể chủ động hủy bỏ cấu hình khóa API khỏi thiết bị bất cứ lúc nào, đảm bảo tuân thủ nghiêm ngặt Luật Bảo vệ bí mật nhà nước về quản lý thiết bị số.
                </p>
              </div>

            </div>

          </div>

          {/* DISCLAIMER CARD */}
          <div className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="text-left space-y-1">
              <h4 className="font-bold text-amber-400 text-sm">Tuyên bố miễn trừ trách nhiệm (Disclaimer)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mặc dù mô hình AI Gemini thế hệ mới sở hữu khả năng nhận diện ngữ cảnh thuật ngữ pháp lý vô cùng chính xác, kết quả bóc tách vẫn có thể phát sinh sai sót nhỏ ngoài ý muốn tùy thuộc vào độ nhòe, góc nghiêng hoặc chất lượng tài liệu gốc. Cán bộ tư pháp, kiểm sát viên và luật sư được khuyến nghị <strong>bắt buộc phải đối chiếu và kiểm tra lại văn bản</strong> trước khi áp dụng vào các tài liệu tố tụng chính thức như cáo trạng, bản án, quyết định khởi tố hoặc tài liệu chứng cứ trước tòa.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto w-full px-6 py-20 relative z-10">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-on-surface-variant text-xs font-bold">
            <HelpCircle size={12} />
            <span>Giải đáp thắc mắc</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Các câu hỏi thường gặp
          </h2>
        </div>

        <div className="space-y-4 text-left">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index}
                className="bg-white rounded-2xl border border-outline-variant/60 hover:border-primary/30 transition-all overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="flex justify-between items-center p-5 cursor-pointer text-base sm:text-lg font-bold text-on-surface hover:text-primary transition-colors focus:outline-none w-full text-left"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`h-5 w-5 text-on-surface-variant transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-60 opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-5 text-sm sm:text-base text-on-surface-variant leading-relaxed font-normal">
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CALL TO ACTION SECTION */}
      <section className="max-w-7xl mx-auto w-full px-6 pb-20 relative z-10">
        <div className="relative rounded-3xl overflow-hidden py-16 px-8 md:p-20 text-center bg-gradient-to-tr from-primary to-ai-accent text-white shadow-xl shadow-primary/10">
          {/* Ambient visuals */}
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bắt đầu số hóa hồ sơ tư pháp bằng AI ngay hôm nay
            </h2>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed">
              Quy trình khép kín, an toàn tuyệt đối. Chỉ cần tải hồ sơ lên và nhận kết quả văn bản số hóa dạng Word sạch chỉ trong vài giây.
            </p>
            <button 
              onClick={triggerGlobalUpload}
              className="bg-white hover:bg-slate-100 text-primary font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-lg active:scale-95 transition-all duration-200 inline-flex items-center gap-2 cursor-pointer mx-auto"
            >
              <Upload size={18} />
              <span>Tải hồ sơ lên ngay</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="w-full bg-slate-50 border-t border-outline-variant/60 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-6">
          
          <div className="md:col-span-5 space-y-4 text-left">
            <a href="#" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-ai-accent flex items-center justify-center text-white">
                <Sparkles size={16} />
              </div>
              <span className="font-bold text-xl tracking-tight text-on-surface">DOC</span>
            </a>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">
              Hệ thống số hóa hồ sơ vụ án và tài liệu tư pháp bằng trí tuệ nhân tạo. Chuyển đổi mọi tệp PDF scan nghiệp vụ, ảnh chụp chứng cứ mờ nhòe sang định dạng văn bản soạn thảo chuẩn chỉnh trong chớp mắt.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-left">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Sản phẩm</h4>
              <ul className="space-y-2.5 text-sm text-on-surface-variant">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors cursor-pointer">Tính năng</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="hover:text-primary transition-colors cursor-pointer">Bản dùng thử</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-primary transition-colors cursor-pointer">Quy trình</button></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Pháp lý</h4>
              <ul className="space-y-2.5 text-sm text-on-surface-variant">
                <li><a href="#" className="hover:text-primary transition-colors">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a></li>
                <li><button onClick={() => scrollToSection('security')} className="hover:text-primary transition-colors cursor-pointer">Cam kết an toàn</button></li>
              </ul>
            </div>

            <div className="space-y-4 col-span-2 sm:col-span-1">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Liên hệ</h4>
              <ul className="space-y-2.5 text-sm text-on-surface-variant">
                <li className="flex items-center gap-1.5">
                  <span className="material-icons text-xs text-on-surface-variant">email</span>
                  <a href="mailto:support@hotro.online" className="hover:text-primary transition-colors">support@hotro.online</a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-icons text-xs text-on-surface-variant">language</span>
                  <a href="https://doc.hotro.online" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">doc.hotro.online</a>
                </li>
              </ul>
            </div>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-outline-variant/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-on-surface-variant">
          <p>© 2026 DOC. Bản quyền thuộc về dự án số hóa tài liệu tư pháp thông minh.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary">Facebook</a>
            <a href="#" className="hover:text-primary">Github</a>
            <a href="#" className="hover:text-primary">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
