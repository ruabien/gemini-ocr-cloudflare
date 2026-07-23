# Metadata Standard (metadata-standard.md)

This document describes the **production metadata schema** used by the LexOCR Knowledge Center and maps it to the **Front‑Matter** fields that authors provide in the Markdown source.

## 1. Production Metadata Schema (source: `shared/knowledgeArticles.ts`)

| Field            | Type                     | Required? | Description                                                                    | Used by Cloudflare SEO | Used by Knowledge List / Detail |
|------------------|--------------------------|----------|--------------------------------------------------------------------------------|------------------------|---------------------------------|
| `slug`           | `string`                 | Yes      | Unique identifier used in URL `/knowledge/{slug}`                              | ✅ `og:url`, canonical | ✅ Article navigation            |
| `title`          | `string`                 | Yes      | Human readable title, shown in page `<title>` and `<og:title>`                 | ✅ `title`, `og:title` | ✅ Article list title            |
| `description`    | `string`                 | Yes      | Short description for meta description and `og:description`                    | ✅ `meta[name="description"]`, `og:description` | ✅ List preview |
| `category`       | `string`                 | Yes      | Content grouping (e.g., “Bắt đầu”, “Hướng dẫn OCR”)                           | ❌                     | ✅ Category filter                |
| `publishedAt`    | ISO‑date `string`        | Yes      | Publication timestamp, used for sorting & RSS                                 | ❌                     | ✅ Display on article page       |
| `updatedAt`      | ISO‑date `string` (opt)  | No       | Last update timestamp                                                         | ❌                     | ✅ Display if present            |
| `readingTime`    | `string`                 | Yes      | Human‑readable estimate (e.g., “4 phút đọc”)                                   | ❌                     | ✅ Shown in article header       |
| `coverImage`      | `string` (opt)           | No       | Relative path to hero image (`/knowledge/{slug}/hero.webp`)                   | ✅ `og:image` (fallback) | ✅ Hero component                 |
| `ogImage`        | `string`                 | Yes      | Absolute URL for Open Graph image (used by Cloudflare SEO)                    | ✅ `og:image`           | ❌                               |
| `keywords`       | `string[]`               | Yes      | List of SEO keywords                                                          | ✅ `meta[name="keywords"]` (if added) | ❌ |
| `relatedSlugs`   | `string[]`               | Yes      | Slugs of related articles for “Bài viết liên quan” section                   | ❌                     | ✅ Render related articles       |

## 2. Front‑Matter Fields (Markdown source)

| Front‑Matter | Maps to Production Field | Comments |
|--------------|--------------------------|----------|
| `title`      | `title`                  | Must match exactly |
| `slug`       | `slug`                   | Must be unique across all articles |
| `description`| `description`            | Short, ≤ 160 characters |
| `category`   | `category`               | Free‑form string, used for grouping |
| `author`      | –                        | Not stored in production metadata (informational only) |
| `published`   | –                        | Boolean for editorial workflow, not stored |
| `publishedAt`| `publishedAt`            | ISO‑8601 date |
| `lastUpdated`| `updatedAt` (optional)   | ISO‑8601 date |
| `readingTime`| `readingTime`            | Human readable (e.g., “4 phút đọc”) |
| `keywords`    | `keywords`               | Array of strings |
| `tags`        | –                        | Informational, not stored |
| `heroImage`  | `coverImage` (relative) | Path `"/knowledge/{slug}/hero.webp"` |
| `heroAlt`    | –                        | Alt text used only in Markdown, not stored |

**Important:** The Front‑Matter is **not** automatically injected into production metadata. Cline must translate the fields above into the structure defined in `shared/knowledgeArticles.ts` when creating or updating an article.

## 3. Example Mapping

```yaml
---
title: "Hướng dẫn tạo Gemini API Key"
slug: "huong-dan-tao-gemini-api-key"
description: "Hướng dẫn từng bước tạo Gemini API Key miễn phí..."
category: "Bắt đầu"
author: "LexOCR Team"
published: true
publishedAt: 2026-07-12T00:00:00Z
lastUpdated: 2026-07-12T00:00:00Z
readingTime: "4 phút đọc"
keywords:
  - "Gemini API Key"
  - "Google AI Studio"
heroImage: "/knowledge/huong-dan-tao-gemini-api-key/hero.webp"
---
```

Cline will generate the following entry in `shared/knowledgeArticles.ts`:

```ts
{
  slug: "huong-dan-tao-gemini-api-key",
  title: "Hướng dẫn tạo Gemini API Key",
  description: "Hướng dẫn từng bước tạo Gemini API Key miễn phí...",
  category: "Bắt đầu",
  publishedAt: "2026-07-12T00:00:00Z",
  readingTime: "4 phút đọc",
  coverImage: "/knowledge/huong-dan-tao-gemini-api-key/hero.webp",
  ogImage: "https://lexocr.com/knowledge/huong-dan-tao-gemini-api-key/hero.webp",
  keywords: ["Gemini API Key", "Google AI Studio"],
  relatedSlugs: [] // fill manually if needed
}
```

---

**Usage tip for Cline:**  
When parsing a Markdown file, extract the Front‑Matter fields, construct the object adhering to the table above, and append it to the `knowledgeArticles` array (or update the existing element). Do **not** modify the schema in `shared/knowledgeArticles.ts` without explicit stakeholder approval.