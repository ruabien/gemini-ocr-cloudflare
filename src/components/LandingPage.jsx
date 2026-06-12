import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/dashboard');
  };

  const handleScroll = (e, id) => {
    e.preventDefault();
    const target = document.querySelector(id);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="text-on-background bg-background min-h-screen flex flex-col font-sans">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full bg-surface z-50 border-b border-standard flex justify-between items-center px-gutter h-toolbar-height shadow-sm">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-2xl">menu</span>
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">VN OCR</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8">
            <a 
              className="font-label-md text-label-md text-primary hover:text-primary transition-colors" 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Trang chủ
            </a>
            <a 
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" 
              href="#features"
              onClick={(e) => handleScroll(e, '#features')}
            >
              Tính năng
            </a>
            <a 
              className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors" 
              href="#documents"
              onClick={(e) => handleScroll(e, '#documents')}
            >
              Tài liệu
            </a>
          </nav>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">notifications</span>
        </div>
      </header>

      <main className="pt-toolbar-height flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[707px] flex items-center overflow-hidden bg-surface-container-lowest">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest/90 to-transparent z-10"></div>
            <img 
              className="w-full h-full object-cover" 
              alt="A professional legal setting with a focus on an elegant oak desk featuring high-end stationery and a polished gavel. The background shows a blurred, sunlit law library with leather-bound books, evoking a sense of heritage and institutional trust. The lighting is soft and cinematic, utilizing a palette of deep mahogany, gold accents, and bright whites to create a sophisticated, high-fidelity corporate atmosphere." 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkWbcSXNx4-MVyww3YAQuRMw0_VjiP5vKot15yC0K_u_Hcv-odfsFrOAONVE13nC_RFhd3tA4ouaRPmT09z9mdfTr75exULAqDV2Cxx52wnPendLfq4YwnKhYFqpV5mysEc1X8qcX0tneahEe8Hg1u8Lhcunu_MH2Okp9i9ACy567UU2uY8YQgECPgRzft8Jb7bzHPecCFFngyfOp6AEirKmNsGMq8rY1_A6TFV4cg3ZEs7PiuATJhxKU7nlYQO3Q2OdG14KZfaC0"
            />
          </div>
          <div className="container mx-auto px-margin relative z-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-block px-3 py-1 mb-6 bg-[#760000]/10 border border-[#760000] text-primary rounded-full">
                <span className="font-label-md text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  Giải pháp dành cho khối Tư pháp & Hành chính
                </span>
              </div>
              <h2 className="font-display-lg text-display-lg text-on-background mb-6 leading-tight">
                Số hóa hồ sơ tư pháp <br />
                <span className="text-state-red">chuyên nghiệp</span>
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed max-w-lg">
                Công nghệ OCR đột phá chuyển đổi chuẩn xác bản án, quyết định, hợp đồng và tài liệu nghiệp vụ sang văn bản số, tối ưu quy trình xử lý hồ sơ cho cán bộ tư pháp.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleStart}
                  className="bg-state-red text-white px-8 py-4 rounded font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-primary transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Trải nghiệm ngay
                  <span className="material-symbols-outlined text-white">arrow_forward</span>
                </button>
                <button 
                  onClick={(e) => handleScroll(e, '#documents')}
                  className="bg-white border border-deep-navy text-deep-navy px-8 py-4 rounded font-label-md text-label-md flex items-center justify-center gap-3 hover:bg-surface-container-low transition-all cursor-pointer"
                >
                  Xem tài liệu hướng dẫn
                </button>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="bg-white p-6 rounded-xl shadow-2xl border border-standard transform rotate-2 relative z-10 w-full h-[320px] overflow-hidden flex items-center justify-center">
                <img 
                  className="w-full h-full object-cover rounded shadow-inner grayscale-[30%]" 
                  alt="A macro close-up of a high-quality document scanner's glass bed with a legal contract being processed. A clean, digital scanning light bar glides over the text, with glowing red and gold interface elements superimposed on the image to signify advanced OCR technology. The aesthetic is clean, professional, and technologically advanced, emphasizing accuracy and speed." 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmL4Q5-0gC5ahtgfHro18b1wuxSJKX9dgNOB-I1e44ttBhYFnA0JE2GCJoXsXwGr7MWph10cQ-CnuPmRJf1Pi_1YW46soQt12LcMWiS3y7HCLRCJenCups8yScY96dUjJhNjC5-Knj0ZBfks6yWFo19lxoDab-BW6vmmQW9k4LPWyVYi7gEopq9m6ShFPDHJSan3o6zRGXaPJLCfxBcc5uAitNdHL3xDMne8XZKfLwyWMlX-rB7noqdqh3XfDi-r4WEMZntTUM6NM"
                />
                <div className="absolute -bottom-6 -left-6 bg-heritage-gold text-white p-4 rounded-lg shadow-xl font-headline-md">
                  <div className="text-sm font-label-sm">Độ chính xác</div>
                  99.8%
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </section>

        {/* Main Features */}
        <section className="py-24 bg-surface px-margin" id="features">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">Tính năng vượt trội</h3>
              <div className="h-1 w-20 bg-heritage-gold mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bento-card bg-white p-8 border border-standard heritage-border">
                <div className="w-12 h-12 bg-[#760000]/10 flex items-center justify-center rounded-lg mb-6">
                  <span className="material-symbols-outlined text-state-red text-3xl">document_scanner</span>
                </div>
                <h4 className="font-headline-md text-headline-md mb-4">Nhận diện chính xác</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Tối ưu cho tiếng Việt và các thuật ngữ chuyên ngành luật, nhận diện chuẩn xác các mẫu văn bản hành chính đặc thù.
                </p>
              </div>
              {/* Feature 2 */}
              <div className="bento-card bg-white p-8 border border-standard heritage-border">
                <div className="w-12 h-12 bg-[#760000]/10 flex items-center justify-center rounded-lg mb-6">
                  <span className="material-symbols-outlined text-state-red text-3xl">file_present</span>
                </div>
                <h4 className="font-headline-md text-headline-md mb-4">Đa định dạng hỗ trợ</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Chuyển đổi tức thì từ tệp PDF scan, ảnh chụp điện thoại (JPEG, PNG) sang Word hoặc tệp văn bản có thể tìm kiếm.
                </p>
              </div>
              {/* Feature 3 */}
              <div className="bento-card bg-white p-8 border border-standard heritage-border">
                <div className="w-12 h-12 bg-[#760000]/10 flex items-center justify-center rounded-lg mb-6">
                  <span className="material-symbols-outlined text-state-red text-3xl">shield</span>
                </div>
                <h4 className="font-headline-md text-headline-md mb-4">Bảo mật tuyệt đối</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Dữ liệu được xử lý mã hóa, cam kết không lưu trữ thông tin nhạy cảm của hồ sơ vụ việc, đảm bảo an toàn nghiệp vụ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Documents */}
        <section className="py-24 bg-surface-container-low px-margin" id="documents">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">Tài liệu hỗ trợ tối ưu</h3>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  VN OCR được huấn luyện đặc biệt để nhận diện các cấu trúc văn bản pháp lý phức tạp nhất tại Việt Nam.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="px-4 py-2 bg-white rounded-full border border-standard text-label-md font-label-md">Quyết định</div>
                <div className="px-4 py-2 bg-white rounded-full border border-standard text-label-md font-label-md">Hợp đồng</div>
                <div className="px-4 py-2 bg-white rounded-full border border-standard text-label-md font-label-md">Hồ sơ nghiệp vụ</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border border-standard hover:border-heritage-gold transition-all text-center">
                <span className="material-symbols-outlined text-4xl text-state-red mb-4">gavel</span>
                <div className="font-headline-md text-sm uppercase tracking-widest text-deep-navy">Bản án</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-standard hover:border-heritage-gold transition-all text-center">
                <span className="material-symbols-outlined text-4xl text-state-red mb-4">description</span>
                <div className="font-headline-md text-sm uppercase tracking-widest text-deep-navy">Hợp đồng</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-standard hover:border-heritage-gold transition-all text-center">
                <span className="material-symbols-outlined text-4xl text-state-red mb-4">assignment</span>
                <div className="font-headline-md text-sm uppercase tracking-widest text-deep-navy">Quyết định</div>
              </div>
              <div className="bg-white p-6 rounded-lg border border-standard hover:border-heritage-gold transition-all text-center">
                <span className="material-symbols-outlined text-4xl text-state-red mb-4">folder_shared</span>
                <div className="font-headline-md text-sm uppercase tracking-widest text-deep-navy">Hồ sơ vụ việc</div>
              </div>
            </div>
            <div className="mt-16 bg-deep-navy text-white p-12 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl">
                <h4 className="font-headline-lg text-white mb-4">Bắt đầu số hóa ngay hôm nay</h4>
                <p className="font-body-md text-surface-variant">Nâng cao hiệu suất công việc với công cụ OCR dành riêng cho chuyên gia tư pháp.</p>
              </div>
              <button 
                onClick={handleStart}
                className="bg-heritage-gold text-[#241a00] px-10 py-5 rounded font-label-md text-label-md whitespace-nowrap hover:brightness-110 transition-all cursor-pointer font-bold"
              >
                ĐĂNG KÝ SỬ DỤNG
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-on-background text-white py-16 px-margin">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h2 className="font-headline-md text-headline-md font-bold text-heritage-gold mb-6">VN OCR</h2>
              <p className="font-body-md text-surface-variant max-w-sm mb-6">
                Giải pháp công nghệ tiên phong trong lĩnh vực số hóa tài liệu tư pháp tại Việt Nam. Tin cậy - Chính xác - Bảo mật.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-surface-variant/10 rounded flex items-center justify-center cursor-pointer hover:bg-state-red transition-colors">
                  <span className="material-symbols-outlined">share</span>
                </div>
                <div className="w-10 h-10 bg-surface-variant/10 rounded flex items-center justify-center cursor-pointer hover:bg-state-red transition-colors">
                  <span className="material-symbols-outlined">mail</span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-label-md text-label-md text-heritage-gold mb-6 uppercase tracking-widest">Liên hệ</h5>
              <ul className="space-y-4 font-body-sm text-body-sm text-surface-variant">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  Hà Nội, Việt Nam
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm">phone</span>
                  Hotline: 1900 68xx
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm">alternate_email</span>
                  contact@vnocr.gov.vn
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-label-md text-label-md text-heritage-gold mb-6 uppercase tracking-widest">Pháp lý</h5>
              <ul className="space-y-4 font-body-sm text-body-sm text-surface-variant">
                <li><a className="hover:text-white transition-colors" href="#">Điều khoản sử dụng</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Chính sách bảo mật</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Cam kết dữ liệu</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-surface-variant/20 flex flex-col md:flex-row justify-between items-center gap-4 text-surface-variant font-label-sm">
            <p>© 2024 VN OCR. Bản quyền thuộc về Đội ngũ phát triển Công nghệ Tư pháp.</p>
            <div className="flex gap-6">
              <span>Hệ thống vận hành 24/7</span>
              <span className="text-green-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Trực tuyến
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 bg-surface border-t border-standard flex justify-around items-center h-16 px-2">
        <a 
          className="flex flex-col items-center justify-center bg-[#760000]/10 text-primary rounded-full px-4 py-1 scale-95 active:scale-90 transition-transform" 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-label-md text-[10px]">Trang chủ</span>
        </a>
        <a 
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform active:scale-90" 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleStart();
          }}
        >
          <span className="material-symbols-outlined">document_scanner</span>
          <span className="font-label-md text-[10px]">Máy quét</span>
        </a>
        <a 
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform active:scale-90" 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleStart();
          }}
        >
          <span className="material-symbols-outlined">history</span>
          <span className="font-label-md text-[10px]">Lịch sử</span>
        </a>
        <a 
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-transform active:scale-90" 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleStart();
          }}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-[10px]">Cài đặt</span>
        </a>
      </nav>
    </div>
  );
}