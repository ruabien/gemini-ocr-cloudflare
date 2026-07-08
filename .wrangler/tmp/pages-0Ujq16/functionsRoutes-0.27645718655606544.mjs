import { onRequestPost as __api_ocr_export_docx_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr\\export\\docx.ts"
import { onRequestPost as __api_ocr_export_excel_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr\\export\\excel.ts"
import { onRequestPost as __api_ocr_anonymize_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr\\anonymize.ts"
import { onRequestPost as __api_ocr_process_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr\\process.ts"
import { onRequestPost as __api_payments_create_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\payments\\create.ts"
import { onRequestGet as __api_payments_webhook_ts_onRequestGet } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\payments\\webhook.ts"
import { onRequestPost as __api_payments_webhook_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\payments\\webhook.ts"
import { onRequest as __api_payments__path__ts_onRequest } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\payments\\[path].ts"
import { onRequestOptions as __api_ocr_space_js_onRequestOptions } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr-space.js"
import { onRequestPost as __api_ocr_space_js_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr-space.js"
import { onRequest as __api_ocr_ts_onRequest } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\api\\ocr.ts"
import { onRequestGet as __payos_webhook_ts_onRequestGet } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\payos-webhook.ts"
import { onRequestPost as __payos_webhook_ts_onRequestPost } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\payos-webhook.ts"
import { onRequest as ___middleware_ts_onRequest } from "D:\\Tools\\gemini-ocr-cloudflare\\functions\\_middleware.ts"

export const routes = [
    {
      routePath: "/api/ocr/export/docx",
      mountPath: "/api/ocr/export",
      method: "POST",
      middlewares: [],
      modules: [__api_ocr_export_docx_ts_onRequestPost],
    },
  {
      routePath: "/api/ocr/export/excel",
      mountPath: "/api/ocr/export",
      method: "POST",
      middlewares: [],
      modules: [__api_ocr_export_excel_ts_onRequestPost],
    },
  {
      routePath: "/api/ocr/anonymize",
      mountPath: "/api/ocr",
      method: "POST",
      middlewares: [],
      modules: [__api_ocr_anonymize_ts_onRequestPost],
    },
  {
      routePath: "/api/ocr/process",
      mountPath: "/api/ocr",
      method: "POST",
      middlewares: [],
      modules: [__api_ocr_process_ts_onRequestPost],
    },
  {
      routePath: "/api/payments/create",
      mountPath: "/api/payments",
      method: "POST",
      middlewares: [],
      modules: [__api_payments_create_ts_onRequestPost],
    },
  {
      routePath: "/api/payments/webhook",
      mountPath: "/api/payments",
      method: "GET",
      middlewares: [],
      modules: [__api_payments_webhook_ts_onRequestGet],
    },
  {
      routePath: "/api/payments/webhook",
      mountPath: "/api/payments",
      method: "POST",
      middlewares: [],
      modules: [__api_payments_webhook_ts_onRequestPost],
    },
  {
      routePath: "/api/payments/:path",
      mountPath: "/api/payments",
      method: "",
      middlewares: [],
      modules: [__api_payments__path__ts_onRequest],
    },
  {
      routePath: "/api/ocr-space",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_ocr_space_js_onRequestOptions],
    },
  {
      routePath: "/api/ocr-space",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_ocr_space_js_onRequestPost],
    },
  {
      routePath: "/api/ocr",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ocr_ts_onRequest],
    },
  {
      routePath: "/payos-webhook",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__payos_webhook_ts_onRequestGet],
    },
  {
      routePath: "/payos-webhook",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__payos_webhook_ts_onRequestPost],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_ts_onRequest],
      modules: [],
    },
  ]