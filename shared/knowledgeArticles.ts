export interface KnowledgeArticleMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  coverImage?: string;
  ogImage: string;
  keywords: string[];
  relatedSlugs: string[];
}

export const knowledgeArticles: KnowledgeArticleMeta[] = [
  {
    slug: "chuyen-pdf-scan-sang-word",
    title: "Chuyển PDF scan sang Word: Hướng dẫn đơn giản bằng OCR",
    description: "Hướng dẫn chuyển PDF scan sang Word bằng OCR tiếng Việt, giúp trích xuất nội dung để chỉnh sửa mà không cần nhập lại thủ công.",
    category: "Hướng dẫn OCR",
    publishedAt: "2026-07-12T00:00:00Z", // Can be adjusted upon real deploy
    readingTime: "5 phút đọc",
    coverImage: "/knowledge/chuyen-pdf-scan-sang-word/hero.webp",
    keywords: [
      "chuyển PDF scan sang Word",
      "OCR PDF tiếng Việt",
      "PDF sang Word",
      "nhận dạng văn bản"
    ],
    ogImage: "https://lexocr.com/knowledge/chuyen-pdf-scan-sang-word/hero.webp",
    relatedSlugs: []
  }
];

export function getKnowledgeArticleBySlug(slug: string): KnowledgeArticleMeta | undefined {
  return knowledgeArticles.find(article => article.slug === slug);
}