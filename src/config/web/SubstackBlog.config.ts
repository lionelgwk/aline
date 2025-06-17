import { CommonProcessors } from "../../processors";
import { EnhancedScrapingRules } from "../../types/scraper-config.types";

// Generic Substack config that works for any [slug].substack.com
export const SubstackBlogConfig: EnhancedScrapingRules = {
  domain: "substack.com",
  name: "Substack Blog",

  selectors: {
    title: [{ selector: "h1.post-title.published" }],

    content: [{ selector: ".available-content" }],

    author: [
      {
        selector: "div.profile-hover-card-target a",
      },
    ],
    defaultAuthor: "Shrey G",

    // For link extraction method
    articleLinks: ['a[data-testid="post-preview-title"]', 'a[href*="/p/"]'],

    pagination: {
      pageLinks: [],
      nextButton: [],
      maxPagePattern: [],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}",
      },
    },

    urlPatterns: {
      articlePattern:
        /^https:\/\/[a-z0-9-]+\.substack\.com\/p\/[a-z0-9-]+\/?$/i,
      excludePatterns: [],
    },
  },

  // Multi-step SPA configuration with lazy loading
  spaConfig: {
    collectionMethod: "extract-links",
    buttonSelector: 'a[data-testid="post-preview-title"]',
    waitAfterClick: 2000,

    // Actions to perform before scraping
    preActions: [
      {
        action: "click",
        selector: '[data-testid="maybeLater"]',
        waitFor: 1000,
        timeout: 5000,
        optional: true, // skippable as it may not be present
        description: 'Dismiss "No thanks" subscription popup',
      },
      {
        action: "click",
        selector: '[data-testid="archive-view-all"]',
        waitFor: 'a[data-testid="post-preview-title"]',
        timeout: 10000,
        optional: false,
        description: "Expand full article list",
      },
      {
        action: "wait",
        waitFor: 2000, // Wait 2 seconds for initial load
        description: "Wait for initial article links to load",
      },
    ],

    // Lazy loading configuration
    enableLazyLoading: true,
    lazyLoadConfig: {
      maxScrollAttempts: 20, // Scroll up to 20 times
      scrollDelay: 2000, // Wait 2 seconds between scrolls
      stopCondition: "no-new-links", // Stop when no new links are found
    },
  },

  behavior: {
    retryAttempts: 3,
    delayBetweenRequests: 2000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    contentType: "blog",
  },

  processing: {
    minContentLength: 100,
    cleanupRules: {
      removeSelectors: [
        ".subscription-widget",
        ".paywall",
        ".sidebar",
        "nav",
        "header",
        "footer",
        ".share-buttons",
        ".subscribe-widget",
        ".substack-post-embed",
      ],
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
