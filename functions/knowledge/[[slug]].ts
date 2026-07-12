import { getKnowledgeArticleBySlug } from '../../shared/knowledgeArticles';

interface Env {
  ASSETS: {
    fetch: (request: Request | string, init?: RequestInit) => Promise<Response>;
  };
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Params<P>;
  data: Data;
}

type Params<P extends string> = Record<string, string | string[]>;

declare global {
  class HTMLRewriter {
    constructor();
    on(selector: string, handlers: { element?: (element: any) => void }): this;
    transform(response: Response): Response;
  }
}

export async function onRequest(context: EventContext<Env, any, any>): Promise<Response> {
  const url = new URL(context.request.url);
  const slug = url.pathname.split('/').filter(Boolean)[1] ?? '';

  // Determine if we are on the list page or a specific article
  const isListPage = url.pathname === '/knowledge' || url.pathname === '/knowledge/';

  // Fetch the original HTML (served by Cloudflare Pages)
  const indexUrl = new URL('/index.html', url.origin);
  const originalResponse = await context.env.ASSETS.fetch(indexUrl.toString());
  const originalHtml = await originalResponse.text();

  // Default metadata for the Knowledge Center
  let title = 'Knowledge Center – LexOCR';
  let description = 'Hướng dẫn sử dụng OCR, số hóa tài liệu và trích xuất dữ liệu phục vụ nghiên cứu hồ sơ.';
  let ogType = 'website';
  let ogImage = 'https://lexocr.com/knowledge/og-default.jpg';
  const canonical = `https://lexocr.com${url.pathname}`;

  if (!isListPage && slug) {
    const article = getKnowledgeArticleBySlug(slug);
    if (article) {
      title = article.title;
      description = article.description;
      ogType = 'article';
      ogImage = article.ogImage;
    } else {
      // Not found – show a friendly not‑found title/description
      title = 'Bài viết không tồn tại – Knowledge Center';
      description = 'Không tìm thấy bài viết yêu cầu.';
    }
  }

  // Rewrite meta tags in the HTML response
  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element: any) {
        element.setInnerContent(title);
      },
    })
    .on('meta[name="description"]', {
      element(element: any) {
        element.setAttribute('content', description);
      },
    })
    .on('link[rel="canonical"]', {
      element(element: any) {
        element.setAttribute('href', canonical);
      },
    })
    .on('meta[property="og:type"]', {
      element(element: any) {
        element.setAttribute('content', ogType);
      },
    })
    .on('meta[property="og:title"]', {
      element(element: any) {
        element.setAttribute('content', title);
      },
    })
    .on('meta[property="og:description"]', {
      element(element: any) {
        element.setAttribute('content', description);
      },
    })
    .on('meta[property="og:url"]', {
      element(element: any) {
        element.setAttribute('content', canonical);
      },
    })
    .on('meta[property="og:image"]', {
      element(element: any) {
        element.setAttribute('content', ogImage);
      },
    })
    .on('meta[name="twitter:card"]', {
      element(element: any) {
        element.setAttribute('content', 'summary_large_image');
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element: any) {
        element.setAttribute('content', title);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element: any) {
        element.setAttribute('content', description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(element: any) {
        element.setAttribute('content', ogImage);
      },
    });

  const headers = new Headers(originalResponse.headers);
  headers.set('content-type', 'text/html; charset=utf-8');

  const rewritten = rewriter.transform(
    new Response(originalHtml, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers
    })
  );
  return rewritten;
}
