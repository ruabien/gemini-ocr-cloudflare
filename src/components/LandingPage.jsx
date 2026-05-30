import { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Zap, Layers, FileOutput, RefreshCw, 
  HelpCircle, ChevronDown, Check, ArrowRight, Upload, Play,
  Lock, Cpu, FileText, Camera, Gavel,
  Shield, BookOpen, Search, ClipboardCheck, ShieldAlert, Scale
} from 'lucide-react';
import FileDropzone from './FileDropzone';

export default function LandingPage({ onFilesSelected, onOpenSettings }) {
  const fileInputRef = useRef(null);
  // FAQ state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  
  // Live Demo Typing State
  const [demoText, setDemoText] = useState('');
  const demoTextTarget = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nĐƠN KHỞI KIỆN\n\nKính gửi: Tòa án nhân dân quận Hoàn Kiếm, thành phố Hà Nội.\n\nTôi tên là: Nguyễn Văn A, sinh năm 1985.\nCăn cước công dân số: 001085000123 cấp ngày 15/10/2021";
  
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleGlobalFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const faqItems = [
    {
      q: "Công cụ này dành cho ai?",
      a: "DOC được thiết kế chuyên biệt phục vụ các cán bộ nghiệp vụ và chuyên gia trong khối tư pháp Việt Nam, bao gồm: Kiểm sát viên, Thẩm phán, Luật sư, Điều tra viên và Chấp hành viên có nhu cầu số hóa, xử lý văn bản từ hồ sơ tài liệu nghiệp vụ nhanh chóng."
    },
    {
      q: "Có thể xử lý loại tài liệu nào?",
      a: "Hệ thống hỗ trợ xử lý hầu hết các loại hình ảnh chụp tài liệu chứng cứ (định dạng JPG, PNG, WEBP) và các tệp văn bản PDF scan tài liệu nghiệp vụ nhiều trang với dung lượng tối đa lên tới 100MB cho mỗi tệp."
    },
    {
      q: "Có dùng được cho hồ sơ tư pháp không?",
      a: "Có. DOC tối ưu hóa sâu cho ngữ cảnh và thuật ngữ nghiệp vụ tư pháp tại Việt Nam (như bản án, quyết định tố tụng, biên bản hỏi cung, hợp đồng, đơn từ). Trí tuệ nhân tạo Gemini AI giúp tự động sửa lỗi chính tả và khôi phục các phần chữ bị mờ, mất nét do chất lượng quét tài liệu cũ kém."
    },
    {
      q: "Có nên tải tài liệu mật lên không?",
      a: "Tuyệt đối KHÔNG. Mặc dù dữ liệu được truyền tải qua HTTPS mã hóa trực tiếp đến Gemini API và không lưu lại bất kỳ máy chủ nào của DOC, người dùng tuyệt đối không được tải lên hoặc xử lý các tài liệu thuộc danh mục bí mật nhà nước (tài liệu mật, tối mật, tuyệt mật) theo quy định của Luật Bảo vệ bí mật nhà nước hiện hành."
    },
    {
      q: "Kết quả OCR có thể dùng thay bản gốc không?",
      a: "Không. Kết quả nhận dạng từ AI chỉ mang tính chất tham khảo chuyên môn và đóng vai trò trợ lý số hóa bóc tách văn bản thô để tiết kiệm thời gian soạn thảo. Người dùng bắt buộc phải đối chiếu, rà soát thủ công kết quả với tài liệu gốc trước khi đưa vào hồ sơ vụ án hoặc văn bản tố tụng chính thức."
    },
    {
      q: "API key Gemini được xử lý như thế nào?",
      a: "API Key cá nhân của bạn được mã hóa và lưu trữ cục bộ ngay tại bộ nhớ trình duyệt (localStorage) trên thiết bị của riêng bạn. Hệ thống hoạt động phi trạng thái (stateless), không ghi nhật ký lịch sử tài liệu nghiệp vụ hay lưu trữ khóa của bạn trên đám mây. Bạn có toàn quyền xóa cấu hình khóa này khỏi thiết bị bất cứ lúc nào."
    }
  ];

  return (
    <div className="relative min-h-screen bg-background text-on-surface flex flex-col font-sans">
      {/* Hidden file input for CTA triggers */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleGlobalFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.webp"
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
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                <Scale size={18} />
              </div>
              <span className="font-bold text-2xl tracking-tight text-primary">
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
              <span>Bắt đầu số hóa</span>
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
              <span className="material-icons text-[14px] text-primary shrink-0">gavel</span>
              <span className="uppercase tracking-wider">Hệ thống số hóa hồ sơ tư pháp chuyên sâu</span>
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
            <div className="relative p-2 rounded-2xl bg-surface border border-border shadow-md">
              
              <div className="p-4 bg-surface rounded-2xl border border-border shadow-sm">
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
              <div className="text-4xl sm:text-5xl font-extrabold text-primary">50.000+</div>
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-wider">Hồ sơ tư pháp được số hóa</p>
            </div>
            <div className="space-y-1 border-y md:border-y-0 md:border-x border-outline-variant/40 py-6 md:py-0">
              <div className="text-4xl sm:text-5xl font-extrabold text-primary">98%</div>
              <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-wider">Chính xác thuật ngữ pháp lý</p>
            </div>
            <div className="space-y-1">
              <div className="text-4xl sm:text-5xl font-extrabold text-primary">10x</div>
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Dành cho ai?
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            Giải pháp chuyên dụng hỗ trợ đắc lực cho cán bộ nghiệp vụ và chuyên gia trong khối tư pháp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {/* Card 1 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base">Kiểm sát viên</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Số hóa nhanh hồ sơ vụ án, biên bản lấy lời khai phục vụ lập cáo trạng và xây dựng hồ sơ kiểm sát.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Gavel size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base">Thẩm phán</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Trích xuất nội dung chứng cứ, hồ sơ kiện tụng, bản án lịch sử phục vụ công tác nghiên cứu nghiệp vụ.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base">Luật sư</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Số hóa nhanh chóng tài liệu do khách hàng cung cấp và hồ sơ tố tụng phục vụ nghiên cứu phương án bào chữa.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base">Điều tra viên</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Chuyển đổi các biên bản hỏi cung viết tay, biên bản khám nghiệm hiện trường thành văn bản số hóa lưu trữ.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardCheck size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base">Chấp hành viên</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Số hóa nhanh các quyết định thi hành án, biên bản kê biên tài sản phục vụ đôn đốc và theo dõi hồ sơ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE OCR DEMO (BEFORE/AFTER) */}
      <section id="demo" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold">
            <Cpu size={12} />
            <span>Trải nghiệm số hóa</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Số hóa hồ sơ vụ án thông minh
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            Xem cách AI tự động phục hồi văn bản pháp lý từ ảnh chụp chứng cứ bị mờ và tự sửa lỗi chính tả theo đúng ngữ cảnh tư pháp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Left Column: Original Scanned Image Visual */}
          <div className="rounded-2xl border border-outline-variant/40 bg-surface shadow-md p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                Tài liệu chứng cứ / Biên bản gốc (Mờ, dính chữ)
              </span>
              <span className="text-xs bg-background text-text-secondary px-2 py-0.5 rounded-md font-medium">JPEG/PDF</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center bg-background/80 rounded-xl p-6 border border-dashed border-border relative overflow-hidden min-h-[220px]">
              <div className="absolute inset-0 bg-[radial-gradient(rgba(22,58,112,0.06)_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
              
              <div className="relative space-y-3 font-serif text-sm text-text-secondary/80 leading-relaxed italic select-none">
                <p className="line-through decoration-accent/60 decoration-2">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIÊT NAM (Thiếu dấu)</p>
                <p className="line-through decoration-accent/60 decoration-2">Đọc lập - Tự do - Hạnh phúc (Sai chính tả)</p>
                <p className="mt-4 font-bold text-text-secondary">ĐƠN KHỞI KIỆN</p>
                <p className="line-through decoration-accent/60 decoration-2">Kính gửi: Toà an nhan dan quan Hoan Kiem... (Không dấu)</p>
                <p className="line-through decoration-accent/60 decoration-2">Căn cước công dân số: OO1O85OOO123 (Nhầm O với số 0)</p>
              </div>
              
              {/* Badges pointing out errors */}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20 font-bold">Mất dấu</span>
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20 font-bold">Sai số</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between text-xs text-text-secondary/80 font-medium">
              <span>Độ phân giải thấp</span>
              <span>Ảnh chụp hiện trường/Điện thoại</span>
            </div>
          </div>

          {/* Right Column: AI Processed Text Result */}
          <div className="rounded-2xl border border-primary/20 bg-surface shadow-lg shadow-primary/5 p-6 flex flex-col justify-between relative overflow-hidden">
            {/* Visual border glow for AI theme */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 mb-4">
              <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Văn bản số hóa bởi DOC AI
              </span>
              <span className="text-xs bg-primary-container text-primary px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Cpu size={10} />
                AI Nghiệp Vụ
              </span>
            </div>

            <div className="flex-1 bg-background border border-border rounded-xl p-5 font-mono text-xs text-text-primary leading-relaxed min-h-[220px] whitespace-pre-wrap select-all">
              <span className="typing-cursor font-medium">{demoText}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded border border-success/20 font-bold flex items-center gap-0.5">
                  <Check size={10} /> Đã sửa dấu
                </span>
                <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded border border-success/20 font-bold flex items-center gap-0.5">
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Tại sao DOC mang lại hiệu quả vượt trội?
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            Thiết kế chuyên biệt cho hồ sơ tố tụng và tài liệu tư pháp tiếng Việt phức tạp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Zap size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Số hóa nghiệp vụ siêu tốc</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Xử lý hồ sơ tài liệu tức thì chỉ trong vài giây mỗi trang chứng cứ. Tách luồng xử lý song song để giảm thời gian chờ đợi đối với các vụ án nhiều trang.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Scale size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Tối ưu tiếng Việt tư pháp</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Khả năng nhận dạng chuẩn xác 100% các từ ngữ pháp lý cổ, từ viết tắt hành chính, dấu quốc huy và văn phong tư pháp Việt Nam.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center mb-5">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Bảo mật tài liệu tuyệt đối</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Xử lý hoàn toàn tại Client-Side. Tài liệu nghiệp vụ nhạy cảm được truyền thẳng tới cổng bảo mật Google API, đáp ứng nghiêm ngặt việc bảo vệ bí mật tư pháp.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Layers size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Bảo toàn cấu trúc văn bản</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Giữ nguyên định dạng bảng biểu, thụt lề biên bản ghi lời khai, phân vùng chữ ký/dấu đỏ giúp hồ sơ số hóa giữ đúng nguyên bản.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <RefreshCw size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Xử lý hồ sơ vụ án lớn</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Thả hàng chục ảnh tài liệu hoặc tệp PDF vụ án hàng trăm trang. Hệ thống tự động phân tách trang và ghép nối kết quả văn bản số hóa hoàn chỉnh.
            </p>
          </div>

          <div className="hover-glow-card rounded-2xl bg-surface p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
              <Cpu size={22} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">AI phục hồi chữ mờ, hỏng</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Ứng dụng trong nghiệp vụ
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            Hỗ trợ toàn diện các hoạt động chuyên môn tố tụng và xử lý tài liệu pháp lý hàng ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Use Case 1 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Số hóa hồ sơ vụ án scan</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Chuyển đổi toàn diện tập hồ sơ PDF scan nhiều trang thành định dạng văn bản sạch để chỉnh sửa, lưu trữ.
              </p>
            </div>
          </div>

          {/* Use Case 2 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Gavel size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Bóc tách nội dung bản án, quyết định</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Trích xuất chính xác thông tin pháp lý, các quyết định tố tụng, án lệ phục vụ nghiên cứu nghiệp vụ.
              </p>
            </div>
          </div>

          {/* Use Case 3 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center mb-4">
                <Camera size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Chuyển ảnh chụp tài liệu thành văn bản</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Nhận diện chữ tiếng Việt từ ảnh chụp bằng điện thoại di động tại thực địa hoặc trong phòng hồ sơ.
              </p>
            </div>
          </div>

          {/* Use Case 4 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <FileOutput size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Trích xuất nội dung hợp đồng, đơn từ, biên bản</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Hỗ trợ bóc tách các điều khoản cam kết, lời khai viết tay hay đánh máy một cách nhanh chóng.
              </p>
            </div>
          </div>

          {/* Use Case 5 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Search size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Hỗ trợ tra cứu nhanh trong tài liệu dài</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Dễ dàng tìm kiếm thông tin pháp lý, định vị nội dung quan trọng trong hồ sơ dài hàng trăm trang.
              </p>
            </div>
          </div>

          {/* Use Case 6 */}
          <div className="bg-surface p-6 rounded-2xl border border-border hover-glow-card text-left flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Cpu size={20} />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-2">Chuẩn bị dữ liệu để tóm tắt, phân tích hoặc soạn thảo</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cung cấp dữ liệu văn bản sạch để tóm tắt thông tin vụ án, phân tích hoặc đưa vào các mẫu báo cáo nghiệp vụ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-6 py-20 relative z-10 border-t border-outline-variant/40">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/20 text-secondary text-xs font-bold">
            <Play size={12} className="fill-secondary" />
            <span>Quy trình sử dụng</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Quy trình 3 bước
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
          <p className="text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
            Tối giản, bảo mật và tương thích với nghiệp vụ tư pháp hàng ngày của bạn.
          </p>
        </div>

        {/* Steps Timeline UI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-4xl mx-auto">
          {/* Decorative connector line on desktop */}
          <div className="hidden md:block absolute top-[2.5rem] left-[15%] right-[15%] h-0.5 bg-border -z-10" />
          
          {/* Step 1 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-center mx-auto text-primary font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                1
              </div>
              <Upload size={28} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Tải PDF hoặc hình ảnh</h3>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              Tải hình ảnh chứng cứ (.jpg, .png, .webp) hoặc tài liệu scan hồ sơ (.pdf) lên hệ thống.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-center mx-auto text-secondary font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-secondary text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                2
              </div>
              <Cpu size={28} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">OCR bằng AI</h3>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              Mô hình Gemini AI tiến hành phân tích hình ảnh và tái tạo văn bản, tự động khôi phục chữ mờ theo ngữ cảnh tố tụng.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border shadow-sm flex items-center justify-center mx-auto text-success font-bold text-lg relative">
              <div className="w-8 h-8 rounded-full bg-success text-white text-xs font-extrabold flex items-center justify-center absolute -top-2.5 -right-2.5 border-4 border-background">
                3
              </div>
              <FileOutput size={28} />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Sao chép hoặc tải kết quả</h3>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">
              Sao chép văn bản số hóa sạch bằng 1-click hoặc kết xuất sang file Microsoft Word (.docx) để hoàn tất hồ sơ.
            </p>
          </div>

        </div>
      </section>

      {/* TRUST & SECURITY (DARK PANEL) */}
      <section id="security" className="bg-[#0B1E36] text-white py-20 relative overflow-hidden z-10">
        {/* Background ambient glow */}
        <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <ShieldCheck size={12} />
              <span>Bảo mật & Quyền riêng tư</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Cam kết bảo mật & Cảnh báo nghiệp vụ
            </h2>
            <div className="legal-divider mx-auto"><div className="legal-divider-primary bg-white/40"></div><div className="legal-divider-accent bg-accent"></div></div>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Website ưu tiên bảo vệ tài liệu nghiệp vụ tư pháp. Dữ liệu xử lý được minh bạch hóa hoàn toàn về mặt kỹ thuật.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Cam kết bảo mật nghiệp vụ */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-4">
                  <Lock size={18} />
                </div>
                <h3 className="font-bold text-white text-lg mb-4">Cam kết bảo mật nghiệp vụ</h3>
                <ul className="text-xs text-white/60 space-y-3 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Xử lý cục bộ:</strong> Các tác vụ tiền xử lý như nén hình ảnh và phân tách trang PDF được thực hiện trực tiếp và cục bộ trên trình duyệt thiết bị của bạn.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Truyền tải trực tiếp:</strong> Dữ liệu hình ảnh (mã hóa Base64) và API Key của bạn được gửi trực tiếp từ trình duyệt đến dịch vụ bên thứ ba (Google Gemini API) qua kết nối HTTPS mã hóa để nhận diện văn bản, không đi qua hay lưu trữ ở bất kỳ máy chủ trung gian nào khác.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Hỗ trợ OCR.space (Bên thứ ba):</strong> OCR.space là dịch vụ OCR do hệ thống cấu hình. Người dùng không cần nhập OCR.space API key. Chỉ trang bị lỗi khi Gemini không xử lý được mới được gửi sang OCR.space. Tuyệt đối không xử lý tài liệu mật, tối mật, tuyệt mật hoặc hồ sơ chưa được phép.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Không ghi nhật ký:</strong> Hệ thống tuyệt đối không lưu trữ tệp tin của bạn, không ghi nhận nhật ký (log) nội dung văn bản OCR và không ghi log API Key.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Quyền kiểm soát khóa:</strong> API Key cá nhân được lưu tại bộ nhớ trình duyệt của riêng bạn. Bạn có thể ẩn/hiện hoặc chủ động xóa sạch hoàn toàn cấu hình khóa bất kỳ lúc nào.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Lưu ý với tài liệu mật */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 mb-4">
                  <ShieldAlert size={18} />
                </div>
                <h3 className="font-bold text-white text-lg mb-4">Lưu ý với tài liệu mật</h3>
                <ul className="text-xs text-white/60 space-y-3 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Bí mật nhà nước:</strong> Tuyệt đối không tải lên hoặc xử lý các tài liệu thuộc danh mục bí mật nhà nước (tài liệu mật, tối mật, tuyệt mật) theo quy định của Luật Bảo vệ bí mật nhà nước hiện hành.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Hạn chế thông tin nhạy cảm:</strong> Không thực hiện nhận dạng văn bản đối với chứng cứ vụ án, hồ sơ điều tra tố tụng nhạy cảm hoặc dữ liệu cá nhân khi chưa được phê duyệt của cơ quan có thẩm quyền hoặc chưa được sự đồng ý của khách hàng.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Trách nhiệm tuân thủ:</strong> Người dùng hoàn toàn tự chịu trách nhiệm trong việc kiểm tra và tuân thủ các quy định bảo mật nội bộ của cơ quan, tổ chức hoặc văn phòng luật sư mà mình đang công tác.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Giới hạn của OCR/AI */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-all text-left flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 mb-4">
                  <Scale size={18} />
                </div>
                <h3 className="font-bold text-white text-lg mb-4">Giới hạn của OCR & AI</h3>
                <ul className="text-xs text-white/60 space-y-3 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Sai số kỹ thuật:</strong> Kết quả nhận dạng ký tự quang học (OCR) từ mô hình AI có thể phát sinh sai lệch, nhầm lẫn ký tự, lỗi dịch nghĩa do chất lượng quét ảnh kém, chữ viết tay hoặc phông chữ cổ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Đối chiếu bắt buộc:</strong> Văn bản nhận dạng cần được đối chiếu, soát lỗi và kiểm tra kỹ lưỡng thủ công với bản gốc trước khi đưa vào hồ sơ vụ án hoặc tài liệu chính thức.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Tính chất hỗ trợ:</strong> Công cụ chỉ hỗ trợ số hóa bóc tách văn bản thô để tối ưu hóa thời gian soạn thảo, hoàn toàn không thay thế cho đánh giá chuyên môn pháp lý của cán bộ nghiệp vụ.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                    <span><strong>Không làm căn cứ duy nhất:</strong> Tuyệt đối không sử dụng kết quả nhận dạng từ AI làm căn cứ pháp lý hoặc chứng cứ duy nhất trong hoạt động tố tụng, phán quyết hoặc tư vấn pháp luật.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto w-full px-6 py-20 relative z-10">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-border text-text-secondary text-xs font-bold">
            <HelpCircle size={12} />
            <span>Giải đáp thắc mắc</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Các câu hỏi thường gặp
          </h2>
          <div className="legal-divider mx-auto"><div className="legal-divider-primary"></div><div className="legal-divider-accent"></div></div>
        </div>

        <div className="space-y-4 text-left">
          {faqItems.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index}
                className="bg-surface rounded-2xl border border-border hover:border-primary/30 transition-all overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="flex justify-between items-center p-5 cursor-pointer text-base sm:text-lg font-bold text-text-primary hover:text-primary transition-colors focus:outline-none w-full text-left"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-60 opacity-100 border-t border-border/50' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-5 text-sm sm:text-base text-text-secondary leading-relaxed font-normal">
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
        <div className="relative rounded-2xl overflow-hidden py-16 px-8 md:p-20 text-center bg-primary border border-secondary/20 text-white shadow-lg">
          {/* Ambient visuals */}
          <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

          <div className="relative max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Bắt đầu số hóa hồ sơ tư pháp bằng AI ngay hôm nay
            </h2>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed">
              Quy trình khép kín, an toàn tuyệt đối. Chỉ cần tải hồ sơ lên và nhận kết quả văn bản số hóa dạng Word sạch chỉ trong vài giây.
            </p>
            <button 
              onClick={triggerGlobalUpload}
              className="bg-surface hover:bg-background text-primary font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-md transition-all duration-200 inline-flex items-center gap-2 cursor-pointer mx-auto"
            >
              <Upload size={18} />
              <span>Tải hồ sơ lên ngay</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="w-full bg-[#0B1E36] border-t border-white/10 py-16 relative z-10 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-6">
          
          <div className="md:col-span-5 space-y-4 text-left">
            <a href="#" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white shadow-sm">
                <span className="material-icons text-[16px]">gavel</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">DOC</span>
            </a>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              Hệ thống số hóa hồ sơ vụ án và tài liệu tư pháp chuyên dụng bằng Trí tuệ Nhân tạo. Giải pháp nhận dạng và chuẩn hóa văn bản tố tụng bảo mật tối đa cho khối cơ quan tư pháp và văn phòng luật.
            </p>
            <div className="text-xs text-white/40 font-bold">
              Phiên bản: v1.4.0 (Nâng cấp Tư pháp Chuyên sâu)
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-left">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hệ thống</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-secondary transition-colors cursor-pointer">Tính năng nghiệp vụ</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="hover:text-secondary transition-colors cursor-pointer">Bản dùng thử</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-secondary transition-colors cursor-pointer">Quy trình số hóa</button></li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Thông tin pháp lý</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><a href="#" className="hover:text-secondary transition-colors">Điều khoản Sử dụng (Terms)</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Chính sách Bảo mật (Privacy)</a></li>
                <li><button onClick={() => scrollToSection('security')} className="hover:text-secondary transition-colors cursor-pointer">Cam kết an toàn</button></li>
              </ul>
            </div>

            <div className="space-y-4 col-span-2 sm:col-span-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hỗ trợ nghiệp vụ</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li className="flex items-center gap-1.5">
                  <span className="material-icons text-xs text-white/60">email</span>
                  <a href="mailto:support@hotro.online" className="hover:text-secondary transition-colors">support@hotro.online</a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="material-icons text-xs text-white/60">history</span>
                  <a href="#" className="hover:text-secondary transition-colors" onClick={(e) => { e.preventDefault(); alert("Nhật ký thay đổi v1.4.0:\n- Chuyển đổi giao diện chính quy sang tone màu Navy/Slate tư pháp.\n- Tích hợp công cụ Nhận diện số văn bản tố tụng dùng regex.\n- Thêm tính năng Chuẩn hóa quốc hiệu, tiêu ngữ và dấu câu văn bản pháp lý.\n- Thêm nút tải Word (.docx) trực tiếp.\n- Đo lường và hiển thị siêu dữ liệu thời gian số hóa."); }}>Nhật ký thay đổi (Changelog)</a>
                </li>
              </ul>
            </div>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-white/60">
          <p>© 2026 DOC. Hệ thống Số hóa Hồ sơ Tư pháp Chuyên dụng.</p>
          <div className="flex gap-4">
            <a href="mailto:support@hotro.online" className="hover:text-secondary">Liên hệ hỗ trợ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
