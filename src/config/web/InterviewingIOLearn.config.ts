import { EnhancedScrapingRules } from "../../types";
import { CommonProcessors } from "../../utils";

export const InterviewingIOLearnConfig: EnhancedScrapingRules = {
  domain: "interviewing.io",
  name: "Interviewing.io Interview Guides",

  selectors: {
    title: [{ selector: "h2 > span" }],
    content: [
      {
        selector:
          ".mx-auto.mb-\\[128px\\].mt-\\[0px\\].flex.w-full.max-w-\\[90vw\\]",
        processor: CommonProcessors.removeInterviewingIONestedNav,
      },
    ],
    author: [
      {
        selector: ".columns-2 .mb-6:first-child div div",
      },
      { selector: ".guide-author" },
    ],

    pagination: {
      pageLinks: [],
      nextButton: [],
      maxPagePattern: [],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}",
      },
    },

    // Target the interview-guides section specifically
    articleLinks: [
      '#interview-guides + .col-span-2 .cursor-pointer a[href^="/guides/"]',
    ],

    urlPatterns: {
      // Individual guide URLs
      articlePattern: /^https:\/\/interviewing\.io\/guides\/[a-z0-9-]+\/?$/i,
      excludePatterns: [/\/learn\/?$/, /#interview-guides$/],
    },
  },

  behavior: {
    retryAttempts: 3,
    delayBetweenRequests: 1500,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    contentType: "other", // Interview guides
  },

  processing: {
    minContentLength: 200,
    cleanupRules: {
      removeSelectors: [
        ".advertisement",
        ".ads",
        ".social-share",
        ".newsletter-signup",
        "nav",
        "footer",
        ".sidebar",
        ".breadcrumb",
      ],
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
