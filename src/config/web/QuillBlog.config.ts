import { EnhancedScrapingRules } from "../../types";
import { CommonProcessors } from "../../processors";

export const QuillBlogConfig: EnhancedScrapingRules = {
  domain: "quill.co",
  name: "Quill Blog",

  selectors: {
    title: [
      {
        selector:
          "h1.text-\\[48px\\].leading-\\[64px\\].pb-3.tracking-tight.font-semibold.px-7.md\\:px-12.text-slate-800",
      },
    ],
    content: [
      {
        selector:
          "div.h-\\[calc\\(100vh\\)\\].max-h-\\[calc\\(100vh\\)\\].min-h-\\[calc\\(100vh\\)\\]",
      },
    ],
    author: [
      {
        selector: "div.text-slate-700.text-\\[14px\\]",
        processor: CommonProcessors.getQuillBlogAuthorName,
      },
    ],
    defaultAuthor: "",
    pagination: {
      pageLinks: [],
      nextButton: [],
      maxPagePattern: [],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}",
      },
    },

    articleLinks: ["button.text-slate-700.font-semibold.text-sm"],

    // NOTE: An article link is https://quill.co/blog/[slug], not followed with /page, /category
    urlPatterns: {
      articlePattern: /^https:\/\/quill\.co\/blog\/[a-z0-9-]+\/?$/i,
      excludePatterns: [
        /\/blog\/page\/\d+/,
        /\/blog\/category\//,
        /\/blog\/tag\//,
        /\/blog\/?$/,
      ],
    },
  },

  spaConfig: {
    collectionMethod: "click-through",
    buttonSelector: "button.text-slate-700.font-semibold.text-sm",
    waitAfterClick: 2000,
    preActions: [],
    enableLazyLoading: false,
  },

  behavior: {
    retryAttempts: 3,
    delayBetweenRequests: 1000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    contentType: "blog",
  },

  processing: {
    minContentLength: 100, // NOTE: if it is less than 100, flag it out as a low quality article, might have some errors
    cleanupRules: {
      removeSelectors: [
        ".advertisement",
        ".ads",
        ".social-share",
        ".newsletter-signup",
        ".comments",
        "nav",
        "footer",
        ".sidebar",
      ],
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
