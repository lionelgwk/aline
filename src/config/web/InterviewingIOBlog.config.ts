import { EnhancedScrapingRules } from "../../types";
import { CommonProcessors } from "../../processors";

export const InterviewingIOBlogConfig: EnhancedScrapingRules = {
  domain: "interviewing.io",
  name: "Interviewing.io Blog",

  selectors: {
    title: [{ selector: "h1#title" }],
    content: [{ selector: ".leading-7" }],
    author: [
      {
        selector: ".mb-2.border-t.pt-2",
        processor: CommonProcessors.getInterviewingIOBlogAuthor,
      },
    ],

    pagination: {
      pageLinks: ['a[href*="/blog/page/"]'],
      nextButton: [],
      maxPagePattern: [/\/blog\/page\/(\d+)/],
      urlPattern: {
        firstPage: "{baseUrl}",
        otherPages: "{baseUrl}/page/{pageNum}",
      },
    },

    articleLinks: [
      'a[href*="/blog/"]:not([href*="/page/"]):not([href*="/category/"])',
    ],

    // NOTE: An article link is https://interviewing.io/blog/[slug], not followed with /page, /category
    urlPatterns: {
      articlePattern: /^https:\/\/interviewing\.io\/blog\/[a-z0-9-]+\/?$/i,
      excludePatterns: [
        /\/blog\/page\/\d+/,
        /\/blog\/category\//,
        /\/blog\/tag\//,
        /\/blog\/?$/,
      ],
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
