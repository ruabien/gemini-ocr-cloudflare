import React from 'react';
import { getKnowledgeArticleBySlug, knowledgeArticles } from '../../shared/knowledgeArticles';
import { navigateToKnowledgeCenter } from './knowledgeNavigation';
import { KnowledgeArticleTemplate } from './components/KnowledgeArticleTemplate';
import { KnowledgeCallout } from './components/KnowledgeCallout';
import { KnowledgeImage } from './components/KnowledgeImage';

import ChuyenPdfScanSangWord from './content/ChuyenPdfScanSangWord';
import HuongDanTaoGeminiApiKey from './content/HuongDanTaoGeminiApiKey';
import OcrPdfScanSangWordMienPhi from './content/OcrPdfScanSangWordMienPhi';
import OcrPdfScanSangWordBangAi from './content/OcrPdfScanSangWordBangAi';

interface Props {
  slug: string;
}

// Reusable Helper Components for Article Content
// Kept here for backwards compatibility with existing content files
export function TipBox({ children }: { children: React.ReactNode }) {
  return <KnowledgeCallout type="tip">{children}</KnowledgeCallout>;
}

export function NoteBox({ children }: { children: React.ReactNode }) {
  return <KnowledgeCallout type="warning">{children}</KnowledgeCallout>;
}

export function ResultBox({ children }: { children: React.ReactNode }) {
  return <KnowledgeCallout type="info" title="Kết quả">{children}</KnowledgeCallout>;
}

interface ArticleImageProps {
  src: string;
  alt: string;
  caption: string;
}

export function ArticleImage({ src, alt, caption }: ArticleImageProps) {
  return <KnowledgeImage src={src} alt={alt} caption={caption} />;
}

export default function KnowledgeArticle({ slug }: Props) {
  const article = getKnowledgeArticleBySlug(slug);

  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = decodeURIComponent(hash.substring(1));
      requestAnimationFrame(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "auto", block: "start" });
        }
      });
      return;
    }

    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    });
  }, [slug]);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-left mt-16">
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

  let ContentComponent: React.FC = () => <div>Nội dung bài viết chưa được cập nhật.</div>;
  if (slug === 'chuyen-pdf-scan-sang-word') {
    ContentComponent = ChuyenPdfScanSangWord;
  } else if (slug === 'huong-dan-tao-gemini-api-key') {
    ContentComponent = HuongDanTaoGeminiApiKey;
  } else if (slug === 'ocr-pdf-scan-sang-word-mien-phi') {
    ContentComponent = OcrPdfScanSangWordMienPhi;
  } else if (slug === 'ocr-pdf-scan-sang-word-bang-ai') {
    ContentComponent = OcrPdfScanSangWordBangAi;
  }

  // Find next/prev articles based on current index in the main list
  const currentIndex = knowledgeArticles.findIndex((a) => a.slug === slug);
  const prevArticle = currentIndex > 0 ? knowledgeArticles[currentIndex - 1] : undefined;
  const nextArticle = currentIndex >= 0 && currentIndex < knowledgeArticles.length - 1 ? knowledgeArticles[currentIndex + 1] : undefined;

  // Related articles mapping
  const relatedArticles = (article.relatedSlugs || [])
    .map(getKnowledgeArticleBySlug)
    .filter((a): a is NonNullable<typeof a> => !!a);

  return (
    <KnowledgeArticleTemplate
      article={article}
      relatedArticles={relatedArticles}
      prevArticle={prevArticle}
      nextArticle={nextArticle}
    >
      <ContentComponent />
    </KnowledgeArticleTemplate>
  );
}
