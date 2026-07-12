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
    slug: "huong-dan-tao-gemini-api-key",
    title: "Hướng dẫn tạo Gemini API Key và cấu hình LexOCR trong 3 phút",
    description: "Hướng dẫn từng bước tạo Gemini API Key miễn phí từ Google AI Studio và cấu hình vào LexOCR để OCR PDF, ảnh và trích xuất dữ liệu.",
    category: "Bắt đầu",
    publishedAt: "2026-07-12T00:00:00Z",
    readingTime: "4 phút đọc",
    coverImage: "/knowledge/huong-dan-tao-gemini-api-key/hero.webp",
    keywords: [
      "Gemini API Key",
      "Google AI Studio",
      "LexOCR",
      "OCR tiếng Việt",
      "OCR PDF"
    ],
    ogImage: "https://lexocr.com/knowledge/huong-dan-tao-gemini-api-key/hero.webp",
    relatedSlugs: ["chuyen-pdf-scan-sang-word"]
  },
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
    relatedSlugs: ["huong-dan-tao-gemini-api-key"]
  }
];

export function getKnowledgeArticleBySlug(slug: string): KnowledgeArticleMeta | undefined {
  return knowledgeArticles.find(article => article.slug === slug);
}