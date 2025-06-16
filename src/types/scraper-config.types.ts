import { ContentType } from ".";

// extended to include pdf format
export interface EnhancedScrapingRules extends ScrapingRules {
  pdfRules?: PDFScrapingRules;
  contentDetection?: {
    isPdf?: boolean;
    autoDetect?: boolean;
  };
}

export interface ScrapingRules {
  // Site identification
  domain: string;
  name: string;

  // Selectors for different elements
  selectors?: SelectorConfig;

  // Scraping behavior
  behavior: {
    retryAttempts: number;
    delayBetweenRequests: number;
    userAgent?: string;
    contentType: ContentType;
  };

  // Content processing rules
  processing: {
    minContentLength: number;
    cleanupRules: {
      removeSelectors: string[];
      replacePatterns: Array<{ pattern: RegExp; replacement: string }>;
    };
  };
}

export interface SelectorConfig {
  // Content extraction selectors
  title: SelectorWithProcessor[];
  content: SelectorWithProcessor[];
  author: SelectorWithProcessor[];

  // Pagination selectors
  pagination: {
    pageLinks: string[];
    nextButton: string[];
    maxPagePattern: RegExp[];
    urlPattern: {
      firstPage: string;
      otherPages: string;
    };
  };

  // Article listing selectors
  articleLinks: string[];

  // URL patterns
  urlPatterns: {
    articlePattern: RegExp;
    excludePatterns: RegExp[];
  };
}

export type ProcessorFunction = (rawText: string) => string;

export interface SelectorWithProcessor {
  selector: string;
  processor?: ProcessorFunction;
}

export interface PDFScrapingRules {
  chapterPattern: RegExp;
  ignorePatterns: RegExp[];
  minWordCount: number;
  cleanReplacePatterns: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
  tableOfContentsIndicators?: RegExp[];
  chapterTitleExtraction?: {
    lookAheadLines: number;
    minTitleLength: number;
    maxTitleLength: number;
  };
}
