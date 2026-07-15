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

  // 1. Bypass static assets
  const STATIC_ASSET_PATTERN =
    /\.(?:webp|png|jpe?g|gif|svg|ico|avif|css|m?js|map|json|xml|txt|woff2?|ttf|eot)$/i;

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    return context.next();
  }

  // 2. Parse path segments
  const segments = url.pathname.split('/').filter(Boolean);

  const isListPage =
    segments.length === 1 &&
    segments[0] === 'knowledge';

  const isArticlePage =
    segments.length === 2 &&
    segments[0] === 'knowledge';

  // If path doesn't match list page or article page (e.g. segments.length > 2 or doesn't start with knowledge), pass through
  if (!isListPage && !isArticlePage) {
    return context.next();
  }

  const slug = isArticlePage ? segments[1] : '';

  // Fetch the original HTML (served by Cloudflare Pages)
  const indexUrl = new URL('/index.html', url.origin);
  const originalResponse = await context.env.ASSETS.fetch(indexUrl.toString());
  const originalHtml = await originalResponse.text();

  // Default metadata for the Knowledge Center
  let title = 'Hướng dẫn sử dụng LexOCR';
  let description = 'Hướng dẫn OCR, số hóa tài liệu, xuất Word và trích xuất dữ liệu phục vụ nghiên cứu hồ sơ.';
  let ogType = 'website';
  let ogImage = 'https://lexocr.com/knowledge/og-default.jpg';
  const canonical = `https://lexocr.com${url.pathname}`;

  if (isArticlePage && slug) {
    const article = getKnowledgeArticleBySlug(slug);
    if (article) {
      title = `${article.title} | Hướng dẫn LexOCR`;
      description = article.description;
      ogType = 'article';
      ogImage = article.ogImage;
    } else {
      // Not found – show a friendly not‑found title/description
      title = 'Bài viết không tồn tại | Hướng dẫn LexOCR';
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
