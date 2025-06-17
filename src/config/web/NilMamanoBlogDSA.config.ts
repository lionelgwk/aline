import { EnhancedScrapingRules } from "../../types";
import { CommonProcessors } from "../../processors";

export const NilMamanoBlogDSAConfig: EnhancedScrapingRules = {
  domain: "nilmamano.com",
  name: "Nilmamano DSA",

  selectors: {
    title: [{ selector: "h1" }],
    content: [{ selector: "article" }],
    author: [
      {
        selector: ".mb-2.border-t.pt-2",
        processor: CommonProcessors.getInterviewingIOBlogAuthor,
      },
    ],
    defaultAuthor: "Nil Mamano",

    pagination: {
      pageLinks: [], // No pagination for Nil Mamano's DSA category
      nextButton: [],
      maxPagePattern: [],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}",
      },
    },

    articleLinks: ['a[href^="/blog/"][href*="?category=dsa"]'],

    // NOTE: An article link is https://nilmamano.com/blog/[slug]?category=dsa
    urlPatterns: {
      articlePattern:
        /^https:\/\/nilmamano\.com\/blog\/[a-z0-9-]+\/?\?category=dsa$/i,
      excludePatterns: [],
    },
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
