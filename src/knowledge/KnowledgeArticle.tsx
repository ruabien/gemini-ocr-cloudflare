import React from 'react';
import { getKnowledgeArticleBySlug } from '../../shared/knowledgeArticles';
import { navigateToKnowledgeCenter } from './knowledgeNavigation';
import ChuyenPdfScanSangWord from './content/ChuyenPdfScanSangWord';

interface Props {
  slug: string;
}

export default function KnowledgeArticle({ slug }: Props) {
  const article = getKnowledgeArticleBySlug(slug);
  if (!article) {
    // Render not found fallback
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy bài viết</h1>
        <button
          onClick={navigateToKnowledgeCenter}
          className="text-blue-600 hover:underline"
        >
          Quay lại Knowledge Center
        </button>
      </div>
    );
  }

  // Choose content component based on slug
  let ContentComponent: React.FC = () => <div>Content not implemented</div>;
  if (slug === 'chuyen-pdf-scan-sang-word') {
    ContentComponent = ChuyenPdfScanSangWord;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <nav className="text-sm text-slate-500 mb-4">
        <button onClick={navigateToKnowledgeCenter} className="hover:underline">
          Knowledge Center
        </button>
        {' / '}
        <span>{article.title}</span>
      </nav>
      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      <p className="text-lg text-slate-600 mb-4">{article.description}</p>
      <div className="text-xs text-slate-400 mb-6">
        {article.category} • {article.publishedAt.split('T')[0]} • {article.readingTime}
      </div>
      <ContentComponent />
    </div>
  );
}