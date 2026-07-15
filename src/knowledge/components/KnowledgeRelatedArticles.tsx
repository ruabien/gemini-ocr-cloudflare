import React from 'react';
import { KnowledgeArticleMeta } from '../../../shared/knowledgeArticles';
import { navigateToKnowledgeArticle } from '../knowledgeNavigation';

interface KnowledgeRelatedArticlesProps {
  articles: KnowledgeArticleMeta[];
}

export const KnowledgeRelatedArticles: React.FC<KnowledgeRelatedArticlesProps> = ({
  articles,
}) => {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-slate-200">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Bài viết liên quan</h3>
      <div className="grid gap-6 sm:grid-cols-2">
        {articles.map((rel) => (
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
            <div className="p-5 flex flex-col justify-between flex-1 text-left">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100 mb-2">
                  {rel.category}
                </span>
                <h4 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  <button
                    onClick={() => navigateToKnowledgeArticle(rel.slug)}
                    className="text-left focus:outline-none focus:underline leading-snug"
                  >
                    {rel.title}
                  </button>
                </h4>
              </div>
              <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400">
                <span>{rel.readingTime}</span>
                <button
                  onClick={() => navigateToKnowledgeArticle(rel.slug)}
                  className="font-bold text-blue-600 hover:text-blue-855"
                >
                  Đọc bài &rarr;
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
