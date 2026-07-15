import React from 'react';
import { navigateToKnowledgeCenter } from '../knowledgeNavigation';
import { KnowledgeArticleMeta } from '../../../shared/knowledgeArticles';

interface KnowledgeHeroProps {
  article: KnowledgeArticleMeta;
  ctaText?: string;
  onCtaClick?: () => void;
}

export const KnowledgeHero: React.FC<KnowledgeHeroProps> = ({
  article,
  ctaText = 'Bắt đầu OCR miễn phí',
  onCtaClick,
}) => {
  const {
    category,
    title,
    description,
    readingTime,
    publishedAt,
    coverImage,
  } = article;
  return (
    <section className="max-w-3xl mx-auto py-8 px-4 sm:px-6 text-left">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center space-x-1.5 text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-normal" aria-label="Breadcrumb">
        <button
          onClick={navigateToKnowledgeCenter}
          className="hover:text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 transition duration-150"
        >
          Hướng dẫn
        </button>
        <span className="text-slate-400 select-none">/</span>
        <span className="text-slate-600">{category}</span>
        <span className="text-slate-400 select-none">/</span>
        <span className="text-slate-800 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md" aria-current="page">
          {title}
        </span>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-4 leading-tight">
        {title}
      </h1>

      {/* Description */}
      <p className="text-lg text-slate-600 mb-4 leading-relaxed font-normal">
        {description}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 border-b border-slate-100 pb-5 mb-6">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-800 border border-blue-100">
          {category}
        </span>
        <span className="text-slate-300">•</span>
        <time dateTime={publishedAt}>{publishedAt.split('T')[0]}</time>
        <span className="text-slate-300">•</span>
        <span>{readingTime}</span>
      </div>

      {/* Hero Image */}
      {coverImage && (
        <figure className="my-6">
          <div className="w-full aspect-video overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50">
            <img
              src={coverImage}
              alt={`Ảnh minh họa: ${title}`}
              className="w-full h-full object-cover"
              loading="eager"
              width={1200}
              height={675}
            />
          </div>
          <figcaption className="text-center text-xs text-slate-400 mt-2 leading-relaxed italic">
            {title}
          </figcaption>
        </figure>
      )}

      {/* CTA */}
      <div className="my-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{ctaText}</h3>
        </div>
        {onCtaClick && (
          <button
            onClick={onCtaClick}
            className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white text-xs font-semibold rounded-lg shadow-sm transition duration-150"
          >
            {ctaText}
          </button>
        )}
      </div>
    </section>
  );
};
