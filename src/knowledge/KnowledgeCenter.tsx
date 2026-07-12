import React from 'react';
import { knowledgeArticles } from '../../shared/knowledgeArticles';
import { navigateToKnowledgeArticle } from './knowledgeNavigation';

export default function KnowledgeCenter() {
  const handleStartOcr = () => {
    window.history.pushState({ activeTab: 'scanner' }, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate', { state: { activeTab: 'scanner' } }));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Title & Description */}
      <div className="mb-10 text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-3">
          Hướng dẫn sử dụng LexOCR
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Hướng dẫn OCR, số hóa tài liệu, xuất Word và trích xuất dữ liệu phục vụ nghiên cứu hồ sơ.
        </p>
      </div>

      {/* Category Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">
          Hướng dẫn OCR
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {knowledgeArticles.map((article) => {
            const hasSingleArticle = knowledgeArticles.length === 1;
            return (
              <div
                key={article.slug}
                className={`flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition duration-200 group ${
                  hasSingleArticle ? 'max-w-md w-full' : ''
                }`}
              >
                {/* 16:9 Image Thumbnail Container */}
                {article.coverImage && (
                  <button
                    onClick={() => navigateToKnowledgeArticle(article.slug)}
                    className="relative w-full aspect-video overflow-hidden bg-slate-100 block focus:outline-none"
                    aria-label={article.title}
                  >
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </button>
                )}

                {/* Card content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Badge / Category */}
                    <div className="mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                        {article.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                      <button
                        onClick={() => navigateToKnowledgeArticle(article.slug)}
                        className="text-left focus:outline-none focus:underline"
                      >
                        {article.title}
                      </button>
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 leading-relaxed">
                      {article.description}
                    </p>
                  </div>

                  {/* Footer metadata & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto text-xs text-slate-400">
                    <span>{article.readingTime}</span>
                    <button
                      onClick={() => navigateToKnowledgeArticle(article.slug)}
                      className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 focus:outline-none group/btn"
                    >
                      Đọc bài
                      <svg
                        className="w-4 h-4 ml-1 transform group-hover/btn:translate-x-0.5 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* For single article case: extra light CTA block below */}
      {knowledgeArticles.length === 1 && (
        <div className="mt-12 p-6 bg-slate-50 border border-slate-200 rounded-xl max-w-md text-left">
          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            Bạn muốn thử ngay tính năng?
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Bóc tách tài liệu PDF, ảnh scan tiếng Việt cực nhanh bằng AI.
          </p>
          <button
            onClick={handleStartOcr}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition duration-150"
          >
            Bắt đầu bóc tách tài liệu
            <svg
              className="w-3.5 h-3.5 ml-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}