import { EnhancedScrapingRules } from "../../types";

export const GenericConfig: EnhancedScrapingRules = {
  domain: "generic-pdf",
  name: "Generic PDF Processor",

  contentDetection: {
    isPdf: true,
    autoDetect: true, // Auto-detect PDF URLs
  },

  pdfRules: {
    chapterPattern: /^(chapter|section)\s+\d+/i,
    ignorePatterns: [
      /page\s+\d+/gi,
      /^\d+$/gm, // Remove standalone page numbers
    ],
    minWordCount: 10,
    cleanReplacePatterns: [
      { pattern: /\f/g, replacement: "\n" },
      { pattern: /\n{3,}/g, replacement: "\n\n" },
      { pattern: /\s+/g, replacement: " " },
    ],
    tableOfContentsIndicators: [/table\s+of\s+contents/i, /contents/i],
    chapterTitleExtraction: {
      lookAheadLines: 2,
      minTitleLength: 3,
      maxTitleLength: 100,
    },
  },

  behavior: {
    retryAttempts: 3,
    delayBetweenRequests: 1000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    contentType: "book",
  },

  processing: {
    minContentLength: 100,
    cleanupRules: {
      removeSelectors: [],
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
