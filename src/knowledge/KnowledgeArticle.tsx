import React from 'react';
import { getKnowledgeArticleBySlug, knowledgeArticles } from '../../shared/knowledgeArticles';
import { navigateToKnowledgeCenter, navigateToKnowledgeArticle } from './knowledgeNavigation';
import ChuyenPdfScanSangWord from './content/ChuyenPdfScanSangWord';
import HuongDanTaoGeminiApiKey from './content/HuongDanTaoGeminiApiKey';

interface Props {
  slug: string;
}

// Reusable Helper Components for Article Content
export function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-slate-800">
      <div className="flex items-start gap-2.5">
        <span className="font-semibold text-emerald-700 text-sm flex items-center select-none" aria-hidden="true">💡 Mẹo:</span>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-slate-800">
      <div className="flex items-start gap-2.5">
        <span className="font-semibold text-amber-700 text-sm flex items-center select-none" aria-hidden="true">⚠️ Lưu ý:</span>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg text-slate-800">
      <div className="flex items-start gap-2.5">
        <span className="font-semibold text-blue-700 text-sm flex items-center select-none" aria-hidden="true">✅ Kết quả:</span>
        <div className="flex-1 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

interface ArticleImageProps {
  src: string;
  alt: string;
  caption: string;
}

export function ArticleImage({ src, alt, caption }: ArticleImageProps) {
  return (
    <figure className="my-6">
      <div className="w-full aspect-video overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          width={800}
          height={450}
        />
      </div>
      <figcaption className="text-center text-xs text-slate-400 mt-2 leading-relaxed italic">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function KnowledgeArticle({ slug }: Props) {
  const article = getKnowledgeArticleBySlug(slug);

  const handleStartOcr = () => {
    window.history.pushState({ activeTab: 'scanner' }, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'scanner' } }));
  };

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-left">
        <h1 className="text-2xl font-bold mb-4 text-slate-900">Không tìm thấy bài viết</h1>
        <button
          onClick={navigateToKnowledgeCenter}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold focus:outline-none focus:underline"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại Hướng dẫn
        </button>
      </div>
    );
  }

  let ContentComponent: React.FC = () => <div>Content not implemented</div>;
  if (slug === 'chuyen-pdf-scan-sang-word') {
    ContentComponent = ChuyenPdfScanSangWord;
  } else if (slug === 'huong-dan-tao-gemini-api-key') {
    ContentComponent = HuongDanTaoGeminiApiKey;
  }

  // Related articles mapping
  const relatedArticles = (article.relatedSlugs || [])
    .map(getKnowledgeArticleBySlug)
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <article className="max-w-3xl mx-auto py-8 px-4 sm:px-6 text-left">
      {/* A. Header bài */}
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center space-x-1.5 text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-normal" aria-label="Breadcrumb">
        <button
          onClick={navigateToKnowledgeCenter}
          className="hover:text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 transition duration-150"
        >
          Hướng dẫn
        </button>
        <span className="text-slate-400 select-none">/</span>
        <span className="text-slate-600">{article.category}</span>
        <span className="text-slate-400 select-none">/</span>
        <span className="text-slate-800 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md" aria-current="page">
          {article.title}
        </span>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-4 leading-tight">
        {article.title}
      </h1>

      {/* Description */}
      <p className="text-lg text-slate-600 mb-4 leading-relaxed font-normal">
        {article.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 border-b border-slate-100 pb-5 mb-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-100">
          {article.category}
        </span>
        <span className="text-slate-300">•</span>
        <time dateTime={article.publishedAt}>{article.publishedAt.split('T')[0]}</time>
        <span className="text-slate-300">•</span>
        <span>{article.readingTime}</span>
      </div>

      {/* B. Hero Image */}
      {article.coverImage && (
        <figure className="my-6">
          <div className="w-full aspect-video overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50">
            <img
              src={article.coverImage}
              alt="Giao diện LexOCR chuyển PDF scan sang Word"
              className="w-full h-full object-cover"
              width={1200}
              height={675}
              fetchPriority="high"
            />
          </div>
          <figcaption className="text-center text-xs text-slate-400 mt-2 leading-relaxed italic">
            Giao diện LexOCR chuyển PDF scan sang Word
          </figcaption>
        </figure>
      )}

      {/* C. Table of Contents */}
      <div className="my-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3.5" id="toc-heading">
          Trong bài này
        </h2>
        <nav aria-labelledby="toc-heading">
          {slug === 'huong-dan-tao-gemini-api-key' ? (
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-blue-600 font-medium">
              <li>
                <a href="#gioi-thieu" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a href="#vi-sao-lexocr-can-gemini-api-key" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Vì sao LexOCR cần Gemini API Key
                </a>
              </li>
              <li>
                <a href="#buoc-1-truy-cap-google-ai-studio" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 1: Truy cập Google AI Studio
                </a>
              </li>
              <li>
                <a href="#buoc-2-tao-api-key" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 2: Tạo API Key
                </a>
              </li>
              <li>
                <a href="#buoc-3-copy-api-key" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 3: Copy API Key
                </a>
              </li>
              <li>
                <a href="#buoc-4-mo-trang-cai-dat-lexocr" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 4: Mở trang Cài đặt LexOCR
                </a>
              </li>
              <li>
                <a href="#buoc-5-dan-api-key" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 5: Dán API Key
                </a>
              </li>
              <li>
                <a href="#buoc-6-kiem-tra-cau-hinh-thanh-cong" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 6: Kiểm tra cấu hình thành công
                </a>
              </li>
              <li>
                <a href="#cau-hoi-thuong-gap" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#ket-luan" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Kết luận
                </a>
              </li>
            </ul>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-blue-600 font-medium">
              <li>
                <a href="#gioi-thieu" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Giới thiệu
                </a>
              </li>
              <li>
                <a href="#vi-sao-pdf-scan-khong-the-chinh-sua" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Vì sao PDF scan không thể chỉnh sửa
                </a>
              </li>
              <li>
                <a href="#buoc-1-tai-pdf-scan" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 1: Tải PDF scan
                </a>
              </li>
              <li>
                <a href="#buoc-2-bat-dau-ocr" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 2: Bắt đầu OCR
                </a>
              </li>
              <li>
                <a href="#buoc-3-xuat-word" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Bước 3: Xuất Word
                </a>
              </li>
              <li>
                <a href="#meo-tang-do-chinh-xac" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Mẹo tăng độ chính xác
                </a>
              </li>
              <li>
                <a href="#gioi-han-goi-free" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Giới hạn gói Free
                </a>
              </li>
              <li>
                <a href="#cau-hoi-thuong-gap" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#ket-luan" className="hover:underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-0.5 transition-colors">
                  Kết luận
                </a>
              </li>
            </ul>
          )}
        </nav>
      </div>

      {/* D. CTA đầu bài */}
      <div className="my-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Bạn đã có file PDF scan?</h3>
          <p className="text-xs text-slate-500 mt-0.5">Thực hiện bóc tách tài liệu và chuyển đổi cực nhanh bằng AI.</p>
        </div>
        <button
          onClick={handleStartOcr}
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white text-xs font-semibold rounded-lg shadow-sm transition duration-150"
        >
          Bắt đầu bóc tách tài liệu
        </button>
      </div>

      {/* Article Content Component */}
      <div className="mt-8">
        <ContentComponent />
      </div>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <div className="mt-16 pt-8 border-t border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Bài viết liên quan</h3>
          <div className="grid gap-6 sm:grid-cols-2">
            {relatedArticles.map((rel) => (
              <div
                key={rel.slug}
                className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 group"
              >
                {rel.coverImage && (
                  <button
                    onClick={() => navigateToKnowledgeArticle(rel.slug)}
                    className="relative w-full aspect-video overflow-hidden bg-slate-100 focus:outline-none"
                    aria-label={rel.title}
                  >
                    <img
                      src={rel.coverImage}
                      alt={rel.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                )}
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100 mb-2">
                      {rel.category}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      <button
                        onClick={() => navigateToKnowledgeArticle(rel.slug)}
                        className="text-left focus:outline-none focus:underline"
                      >
                        {rel.title}
                      </button>
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400">
                    <span>{rel.readingTime}</span>
                    <button
                      onClick={() => navigateToKnowledgeArticle(rel.slug)}
                      className="font-bold text-blue-600 hover:text-blue-850"
                    >
                      Đọc bài &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. CTA cuối bài */}
      <div className="mt-16 p-8 bg-slate-950 text-white rounded-2xl text-center relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_50%)]"></div>
        <div className="relative z-10 max-w-md mx-auto">
          <h3 className="text-xl font-bold mb-1.5">Bắt đầu bóc tách tài liệu</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Thử OCR PDF tiếng Việt trực tiếp trên LexOCR.
          </p>
          <button
            onClick={handleStartOcr}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 text-white text-sm font-semibold rounded-xl shadow-lg transition duration-150"
          >
            Bắt đầu bóc tách tài liệu
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}