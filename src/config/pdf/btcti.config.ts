import { EnhancedScrapingRules } from "../../types";

export const BTCTIConfig: EnhancedScrapingRules = {
  domain: "bctci",
  name: "Beyond Cracking the Coding Interview",

  // Mark this as a PDF configuration
  contentDetection: {
    isPdf: true,
    autoDetect: false, // Don't auto-detect, explicitly handle BCTCI PDFs
  },

  // PDF-specific rules extracted from your current PDFScraper
  pdfRules: {
    chapterPattern: /^chapter\s+\d+$/i,
    ignorePatterns: [
      /CHAPTER\s+\d+\s+▸.+?\d{1,3}/gi, // Remove running headers
      /^[A-Z\s]{8,50}$/gm, // Remove large all-caps lines
      /bctci\.co\S*/gi, // Remove marketing footers
    ],
    minWordCount: 300,
    cleanReplacePatterns: [
      { pattern: /\f/g, replacement: "\n" },
      { pattern: /\r\n|\r/g, replacement: "\n" },
      { pattern: /\n{3,}/g, replacement: "\n\n" },
      { pattern: /^\s+|\s+$/gm, replacement: "" },
      { pattern: /\s+/g, replacement: " " },
    ],
    tableOfContentsIndicators: [
      /^ugly\s+truths/i,
      /^chapter\s+\d+/i,
      /^job\s+searches/i,
    ],
    chapterTitleExtraction: {
      lookAheadLines: 3,
      minTitleLength: 5,
      maxTitleLength: 120,
    },
  },

  behavior: {
    retryAttempts: 2,
    delayBetweenRequests: 500,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    contentType: "book",
  },

  processing: {
    minContentLength: 300,
    cleanupRules: {
      removeSelectors: [], // Not applicable for PDFs
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
