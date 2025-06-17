import { EnhancedScrapingRules } from "../../types";
import { CommonProcessors } from "../../processors";

export const InterviewingIOTopicsConfig: EnhancedScrapingRules = {
  domain: "interviewing.io",
  name: "Interviewing.io Company Guides",

  selectors: {
    // For individual company guide pages
    title: [{ selector: "h2" }],
    content: [
      {
        selector: ".mx-auto.mb-\\[128px\\].mt-\\[0px\\].flex.w-full", // Main content div
        processor: CommonProcessors.removeInterviewingIONestedNav,
      },
      {
        selector: ".shrink > div > div:not([class])", // NOTE: this is for /[slug]-interview-questions pages, targeting the div without class names, where the content is
      },
    ],
    author: [],
    defaultAuthor: "",

    pagination: {
      pageLinks: [], // No pagination for company listing
      nextButton: [],
      maxPagePattern: [],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}", // No pagination
      },
    },

    // Key part: How to find company guide links
    articleLinks: [
      'h2#companies ~ .grid a[href^="/guides/hiring-process/"]',
      'h2#companies ~ .grid a[href$="-interview-questions"]',
    ],

    urlPatterns: {
      // Individual company guide URLs
      // this matches both /guides/hiring-process/[name] and /[name]-interview-questions
      articlePattern:
        /^https:\/\/interviewing\.io\/(?:guides\/hiring-process\/[a-z0-9-]+|[a-z0-9-]+-interview-questions)\/?$/i,
      excludePatterns: [/\/topics\/?$/, /#companies$/, /#\w+$/],
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
        "nav",
        "footer",
        ".sidebar",
        ".breadcrumb", // Often present in guide pages
      ],
      replacePatterns: [
        { pattern: /\n{3,}/g, replacement: "\n\n" },
        { pattern: /\s+/g, replacement: " " },
      ],
    },
  },
};
