/**
 * WebMCP Integration for LexOCR
 * Exposes key site tools to AI agents via the browser.
 */

// Define the tools
const ocrTool = {
  name: "process_ocr",
  description: "Extract text from Vietnamese legal documents using OCR",
  inputSchema: {
    type: "object",
    properties: {
      imageUrl: { type: "string", description: "URL of the image to process" }
    },
    required: ["imageUrl"]
  },
  execute: async (args: any) => {
    return { text: "OCR feature exposed via WebMCP. In a full implementation, this would process the provided imageUrl." };
  }
};

const anonymizeTool = {
  name: "anonymize_text",
  description: "Anonymize sensitive information (names, IDs, addresses, phones) in a text",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The text to anonymize" }
    },
    required: ["text"]
  },
  execute: async (args: any) => {
    return { anonymizedText: "Anonymization feature exposed via WebMCP." };
  }
};

export function registerWebMCP() {
  const tools = [ocrTool, anonymizeTool];
  const controller = new AbortController();
  const signal = controller.signal;
  
  // Expose controller to window so we can abort/unregister if needed
  if (typeof window !== 'undefined') {
    (window as any)._webMcpController = controller;
  }

  const applyTools = (modelContext: any) => {
    if (!modelContext) return;

    // API 1: registerTool (from WebMCP standard/spec)
    if (typeof modelContext.registerTool === 'function') {
      tools.forEach(tool => {
        try {
          modelContext.registerTool(tool, { signal });
        } catch (e) {
          console.error("WebMCP registerTool failed:", e);
        }
      });
    }

    // API 2: provideContext (from user feedback / older or variant implementations)
    if (typeof modelContext.provideContext === 'function') {
      try {
        modelContext.provideContext({ tools }, { signal });
      } catch (e1) {
        try {
          modelContext.provideContext(tools, { signal });
        } catch (e2) {
          console.error("WebMCP provideContext failed:", e2);
        }
      }
    }
  };

  // Try applying to navigator.modelContext
  if (typeof navigator !== 'undefined' && (navigator as any).modelContext) {
    applyTools((navigator as any).modelContext);
  }
  
  // Fallback to document.modelContext if specified there
  if (typeof document !== 'undefined' && (document as any).modelContext) {
    applyTools((document as any).modelContext);
  }
}