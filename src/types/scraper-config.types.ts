import { ContentType } from ".";

// extended to include pdf and spa rules
export interface EnhancedScrapingRules extends ScrapingRules {
  spaConfig?: SPAScrapingRules;
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
  defaultAuthor: string;

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

export interface SPAScrapingRules {
  collectionMethod: "click-through" | "extract-links";
  buttonSelector: string;
  waitAfterClick: number;

  // Pre-actions (click "No thanks", "See all", etc.)
  preActions?: SPAAction[];

  // Lazy loading support for infinite scroll
  enableLazyLoading?: boolean;
  lazyLoadConfig?: {
    maxScrollAttempts?: number;
    scrollDelay?: number;
    stopCondition?: "no-new-links" | "max-attempts" | "timeout";
  };
}

export interface SPAAction {
  action: "click" | "wait" | "scroll";
  selector?: string;
  waitFor?: string | number; // Selector to wait for, or milliseconds to wait
  timeout?: number;
  optional?: boolean; // If true, don't fail if element not found
  description?: string; // For logging
  scrollBehavior?: "smooth" | "auto"; // For scroll actions
  scrollDirection?: "down" | "up" | "bottom"; // For scroll actions
}
