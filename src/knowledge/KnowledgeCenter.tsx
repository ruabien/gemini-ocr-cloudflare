import React from 'react';
import { knowledgeArticles } from '../../shared/knowledgeArticles';
import { navigateToKnowledgeArticle } from './knowledgeNavigation';

export default function KnowledgeCenter() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Knowledge Center</h1>
      <p className="text-lg text-slate-600 mb-6">
        Hướng dẫn sử dụng OCR, số hóa tài liệu và trích xuất dữ liệu phục vụ nghiên cứu hồ sơ.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {knowledgeArticles.map((article) => (
          <button
            key={article.slug}
            onClick={() => navigateToKnowledgeArticle(article.slug)}
            className="text-left p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
          >
            <h2 className="text-xl font-semibold">{article.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{article.description}</p>
            <div className="text-xs text-slate-400 mt-2">
              {article.category} • {article.readingTime}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}