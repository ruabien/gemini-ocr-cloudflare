import React from 'react';
import { KnowledgeArticleMeta } from '../../../shared/knowledgeArticles';
import { KnowledgeHero } from './KnowledgeHero';
import { KnowledgeTOC } from './KnowledgeTOC';
import { KnowledgeRelatedArticles } from './KnowledgeRelatedArticles';
import { navigateToKnowledgeArticle } from '../knowledgeNavigation';

interface KnowledgeArticleTemplateProps {
  article: KnowledgeArticleMeta;
  children: React.ReactNode;
  relatedArticles?: KnowledgeArticleMeta[];
  prevArticle?: KnowledgeArticleMeta;
  nextArticle?: KnowledgeArticleMeta;
}

export const KnowledgeArticleTemplate: React.FC<KnowledgeArticleTemplateProps> = ({
  article,
  children,
  relatedArticles = [],
  prevArticle,
  nextArticle,
}) => {
  React.useEffect(() => {
    document.title = article.title;
  }, [article.title]);

  return (
    <>
      <article className="min-h-screen bg-white">
        {/* ① Hero */}
        <KnowledgeHero article={article} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ② Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-8 flex items-center space-x-2" aria-label="Breadcrumb">
            <a href="/" className="hover:text-blue-600 transition-colors">Trang chủ</a>
            <span>&rsaquo;</span>
            <a href="/knowledge" className="hover:text-blue-600 transition-colors">Hướng dẫn</a>
            <span>&rsaquo;</span>
            <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-none">
              {article.title}
            </span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main Content Area */}
            <div className="flex-1 lg:max-w-[760px] xl:max-w-[820px]">
              
              {/* Mobile TOC: Shows at top on mobile/tablet */}
              <div className="block lg:hidden mb-10">
                <KnowledgeTOC />
              </div>

              {/* ④ Nội dung bài viết */}
              {/* 
                Typography styled to match professional docs (Cloudflare, Stripe, Vercel).
                - large line-height
                - lots of whitespace
                - clear heading hierarchy
              */}
              <div className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-bold prose-headings:text-slate-900 
                prose-h2:mt-16 prose-h2:mb-6 prose-h2:text-2xl prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 prose-h2:scroll-mt-24
                prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-xl
                prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-li:my-2 prose-li:text-slate-700
                prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
                prose-table:w-full prose-table:text-left prose-table:border-collapse prose-th:p-3 prose-th:bg-slate-50 prose-th:border prose-th:border-slate-200 prose-td:p-3 prose-td:border prose-td:border-slate-200
                prose-blockquote:border-l-4 prose-blockquote:border-slate-200 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600
                prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:text-pink-600 prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:overflow-x-auto
                prose-img:rounded-xl prose-img:border prose-img:border-slate-200 prose-img:shadow-sm"
              >
                {children}
              </div>

              {/* ⑨ Related Articles */}
              {relatedArticles.length > 0 && (
                <KnowledgeRelatedArticles articles={relatedArticles} />
              )}

              {/* ⑩ Previous / Next */}
              {(prevArticle || nextArticle) && (
                <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-4">
                  {prevArticle ? (
                    <button
                      onClick={() => navigateToKnowledgeArticle(prevArticle.slug)}
                      className="text-left group flex flex-col p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    >
                      <span className="text-sm text-slate-500 mb-1 group-hover:text-blue-600 transition-colors flex items-center">
                        <span className="mr-1">&larr;</span> Bài trước
                      </span>
                      <span className="font-semibold text-slate-900 line-clamp-2 leading-snug truncate max-w-full text-ellipsis overflow-hidden">
                        {prevArticle.title}
                      </span>
                    </button>
                  ) : (
                    <div></div> // Empty div for grid alignment
                  )}
                  
                  {nextArticle ? (
                    <button
                      onClick={() => navigateToKnowledgeArticle(nextArticle.slug)}
                      className="text-right group flex flex-col p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    >
                      <span className="text-sm text-slate-500 mb-1 group-hover:text-blue-600 transition-colors flex items-center justify-end">
                        Bài tiếp <span className="ml-1">&rarr;</span>
                      </span>
                      <span className="font-semibold text-slate-900 line-clamp-2 leading-snug truncate max-w-full text-ellipsis overflow-hidden">
                        {nextArticle.title}
                      </span>
                    </button>
                  ) : (
                    <div></div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop TOC - Right Sidebar */}
            <KnowledgeTOC slug={article.slug} />
          </div>
        </div>
      </article>
    </>
  );
};
