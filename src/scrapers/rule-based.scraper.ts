import { BaseScraper, ConfigurablePDFScraper } from ".";
import { ContentProcessor } from "../processors";
import { ConfigManager } from "../utils";
import { EnhancedScrapingRules } from "../types";
import { ContentItem } from "../types";
import { Logger } from "../utils";
import { DebugSaver } from "../utils";
import * as cheerio from "cheerio";
import * as puppeteer from "puppeteer";

import {
  ScrapingRules,
  SelectorWithProcessor,
} from "../types/scraper-config.types";

export class RuleBasedScraper extends BaseScraper {
  private contentProcessor: ContentProcessor;

  constructor() {
    super();
    this.contentProcessor = new ContentProcessor();
  }

  canHandle(url: string): boolean {
    const config = ConfigManager.getConfigForUrl(url);
    if (!config) return false;

    // Check if it's a PDF config or has PDF rules
    if (this.isPdfConfig(config)) return true;

    // Check if it's a SPA config
    if (this.isSpaConfig(config)) return true;

    // Check if it's a web config with selectors
    return config.selectors !== undefined;
    // return ConfigManager.isPdfUrl(url);
  }

  private isPdfConfig(config: EnhancedScrapingRules): boolean {
    // Check if config has PDF rules
    if (config.pdfRules) return true;

    // Check if it's explicitly marked as PDF
    if (config.contentDetection?.isPdf) return true;

    // Check if config key suggests PDF (like "pdf:bctci")
    const configKey = this.getConfigKey(config);
    if (configKey?.startsWith("pdf:")) return true;

    return false;
  }

  private isSpaConfig(config: EnhancedScrapingRules): boolean {
    // Check if config key starts with "spa:"
    if (config.spaRules) return true;
    const configKey = this.getConfigKey(config);
    return configKey?.startsWith("spa:") || false;
  }

  private getConfigKey(config: EnhancedScrapingRules): string | null {
    // Helper to find the config key - you might need to enhance ConfigManager for this
    // For now, we'll use the domain as a fallback
    return config.domain || null;
  }

  private isPdfUrl(url: string): boolean {
    return (
      url.toLowerCase().endsWith(".pdf") ||
      url.includes("drive.google.com/file") ||
      url.includes("pdf")
    );
  }

  async scrape(
    url: string,
    userId: string = "",
    customConfig?: any
  ): Promise<ContentItem[]> {
    const config = ConfigManager.getConfigForUrl(url) as EnhancedScrapingRules;
    if (!config) {
      throw new Error(`No configuration found for URL: ${url}`);
    }

    // Determine if this should be processed as PDF
    const shouldProcessAsPdf = this.shouldProcessAsPdf(url, config);

    if (shouldProcessAsPdf) {
      return this.scrapePdfWithConfig(url, userId, config, customConfig);
    } else {
      return this.scrapeWebWithConfig(url, userId, config);
    }
  }

  private shouldProcessAsPdf(
    url: string,
    config: EnhancedScrapingRules
  ): boolean {
    // Explicit PDF config
    if (this.isPdfConfig(config)) return true;

    // Auto-detect based on URL if enabled
    if (config.contentDetection?.autoDetect && this.isPdfUrl(url)) return true;

    return false;
  }

  private async scrapePdfWithConfig(
    url: string,
    userId: string,
    config: EnhancedScrapingRules,
    customConfig?: any
  ): Promise<ContentItem[]> {
    Logger.info(`[RuleBasedScraper] Processing PDF with config rules: ${url}`);

    // Create a configured PDF scraper with the rules
    const configuredPdfScraper = new ConfigurablePDFScraper(
      config,
      customConfig
    );
    return configuredPdfScraper.scrape(url, userId);
  }

  private async scrapeWebWithConfig(
    url: string,
    userId: string,
    config: EnhancedScrapingRules
  ): Promise<ContentItem[]> {
    // Use existing web scraping logic
    if (!config.selectors) {
      throw new Error(`Missing selectors in config for URL: ${url}`);
    }

    if (this.isSpaConfig(config)) {
      Logger.info(
        `[EnhancedRuleBasedScraper] Detected SPA site, using SPA scraping method`
      );
      return this.scrapeListPageSPA(url, userId, config);
    }

    if (this.isArticleUrl(url, config)) {
      return this.scrapeSinglePage(url, userId, config);
    } else {
      return this.scrapeListPage(url, userId, config);
    }
  }

  // Keep all existing web scraping methods unchanged
  private isArticleUrl(url: string, config: ScrapingRules): boolean {
    if (!config.selectors) {
      throw new Error(`Missing selectors in config for URL: ${url}`);
    }
    return config.selectors.urlPatterns.articlePattern.test(url);
  }

  // ... (keep all existing web scraping methods: scrapeListPage, scrapeSinglePage, etc.)
  // I'll include the key ones for completeness

  private async scrapeListPage(
    url: string,
    userId: string,
    config: ScrapingRules
  ): Promise<ContentItem[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      if (config.behavior.userAgent) {
        await page.setUserAgent(config.behavior.userAgent);
      }

      Logger.info(`[RuleBasedScraper] Navigating to listing page: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });

      const maxPage = await this.findMaxPage(page, config);
      Logger.info(`[RuleBasedScraper] Found max page: ${maxPage}`);

      const listingUrls = this.generateListingUrls(url, maxPage, config);
      Logger.info(
        `[RuleBasedScraper] Will scrape ${listingUrls.length} listing pages`
      );

      const allArticleUrls = new Set<string>();

      for (const pageUrl of listingUrls) {
        try {
          Logger.info(`[RuleBasedScraper] Scraping listing page: ${pageUrl}`);
          await page.goto(pageUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          const articleUrls = await this.extractArticleUrls(page, config);
          articleUrls.forEach((articleUrl) => allArticleUrls.add(articleUrl));

          Logger.info(
            `[RuleBasedScraper] Found ${articleUrls.length} articles on this page. Total: ${allArticleUrls.size}`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, config.behavior.delayBetweenRequests)
          );
        } catch (error) {
          Logger.error(
            `[RuleBasedScraper] Failed to scrape listing page ${pageUrl}`,
            error
          );
        }
      }

      const allItems: ContentItem[] = [];
      const articleUrlArray = Array.from(allArticleUrls);

      for (let i = 0; i < articleUrlArray.length; i++) {
        const articleUrl = articleUrlArray[i];
        try {
          Logger.info(
            `[RuleBasedScraper] Scraping article ${i + 1}/${
              articleUrlArray.length
            }: ${articleUrl}`
          );

          const items = await this.scrapeSinglePage(articleUrl, userId, config);
          allItems.push(...items);

          await new Promise((resolve) =>
            setTimeout(resolve, config.behavior.delayBetweenRequests)
          );
        } catch (error) {
          Logger.error(
            `[RuleBasedScraper] Failed to scrape article ${articleUrl}`,
            error
          );
        }
      }

      return allItems;
    } finally {
      await browser.close();
    }
  }

  private async scrapeSinglePage(
    url: string,
    userId: string,
    config: ScrapingRules
  ): Promise<ContentItem[]> {
    if (!config.selectors) {
      throw new Error(`Missing selectors in config for URL`);
    }

    const browser = await puppeteer.launch({ headless: true });
    const debugSaver = new DebugSaver();

    try {
      const page = await browser.newPage();

      if (config.behavior.userAgent) {
        await page.setUserAgent(config.behavior.userAgent);
      }

      await page.goto(url, { waitUntil: "networkidle2" });

      const content = await page.content();
      const $ = cheerio.load(content);

      config.processing.cleanupRules.removeSelectors.forEach((selector) => {
        $(selector).remove();
      });

      const title = this.extractBySelectorsWithProcessing(
        $,
        config.selectors.title,
        false,
        "Untitled"
      );

      const contentHtml = this.extractBySelectorsWithProcessing(
        $,
        config.selectors.content,
        true,
        ""
      );

      const author = this.extractBySelectorsWithProcessing(
        $,
        config.selectors.author,
        false,
        ""
      );

      const processedContent =
        this.contentProcessor.processContent(contentHtml);
      debugSaver.save(processedContent, `converted-${title}.md`);

      let cleanedContent = processedContent;
      config.processing.cleanupRules.replacePatterns.forEach((rule) => {
        cleanedContent = cleanedContent.replace(rule.pattern, rule.replacement);
      });

      const item: ContentItem = {
        title,
        content: cleanedContent,
        content_type: config.behavior.contentType as any,
        source_url: url,
        author,
        user_id: userId,
      };

      if (cleanedContent.length >= config.processing.minContentLength) {
        Logger.info(`[RuleBasedScraper] Successfully scraped: ${title}`);
        return [item];
      } else {
        Logger.warn(
          `[RuleBasedScraper] Content too short for: ${title} (${cleanedContent.length} chars)`
        );
        return [];
      }
    } finally {
      await browser.close();
    }
  }

  private async scrapeListPageSPA(
    url: string,
    userId: string,
    config: any
  ): Promise<ContentItem[]> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();

      if (config.behavior.userAgent) {
        await page.setUserAgent(config.behavior.userAgent);
      }

      Logger.info(`[SPA] Navigating to SPA listing page: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });

      // Phase 1: Collect all article URLs by clicking
      const articleUrls = await this.collectSpaArticleUrls(page, config);
      Logger.info(`[SPA] Collected ${articleUrls.length} article URLs`);

      // Phase 2: Scrape each article individually
      const allItems: ContentItem[] = [];

      for (let i = 0; i < articleUrls.length; i++) {
        const articleUrl = articleUrls[i];
        try {
          Logger.info(
            `[SPA] Scraping article ${i + 1}/${
              articleUrls.length
            }: ${articleUrl}`
          );

          const items = await this.scrapeSinglePage(articleUrl, userId, config);
          allItems.push(...items);

          await new Promise((resolve) =>
            setTimeout(resolve, config.behavior.delayBetweenRequests)
          );
        } catch (error) {
          Logger.error(`[SPA] Failed to scrape article ${articleUrl}`, error);
        }
      }

      return allItems;
    } finally {
      await browser.close();
    }
  }

  private async collectSpaArticleUrls(
    page: any,
    config: any
  ): Promise<string[]> {
    Logger.info(`[SPA] Collecting article URLs by clicking buttons`);
    const urls: string[] = [];
    const listingUrl = page.url();

    try {
      // Count total buttons first
      const totalButtons = await page.$$eval(
        config.selectors.articleLinks[0], // Should be 'button:contains("Read more")'
        (buttons: Element[]) => buttons.length
      );

      Logger.info(`[SPA] Found ${totalButtons} buttons to process`);

      for (let i = 0; i < totalButtons; i++) {
        try {
          // Always start fresh from listing page
          if (page.url() !== listingUrl) {
            await page.goto(listingUrl, { waitUntil: "networkidle2" });
            await page.waitForSelector(config.selectors.articleLinks[0], {
              timeout: 5000,
            });
          }

          // Get fresh button references
          const buttons = await page.$$(config.selectors.articleLinks[0]);

          if (i < buttons.length) {
            Logger.info(`[SPA] Processing article ${i + 1}/${totalButtons}`);

            await buttons[i].click();
            await page.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: 10000,
            });

            const articleUrl = page.url();
            if (config.selectors.urlPatterns.articlePattern.test(articleUrl)) {
              urls.push(articleUrl);
              Logger.info(`[SPA] ✓ Collected: ${articleUrl}`);
            }
          }
        } catch (error) {
          Logger.error(`[SPA] Failed to collect article ${i + 1}:`, error);
        }
      }
    } catch (error) {
      Logger.error("[SPA] Error in URL collection:", error);
    }

    Logger.info(`[SPA] Collection complete: ${urls.length} URLs collected`);
    return [...new Set(urls)]; // Remove duplicates
  }

  // Include other helper methods...
  private async findMaxPage(page: any, config: ScrapingRules): Promise<number> {
    if (!config.selectors) throw new Error(`Missing selectors in config`);

    return await page.evaluate(
      (selectors: any, patterns: any) => {
        let maxPage = 1;
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const element of elements) {
            const href = (element as HTMLAnchorElement).href || "";
            const text = element.textContent || "";
            for (const patternStr of patterns) {
              const pattern = new RegExp(patternStr.source, patternStr.flags);
              const hrefMatch = href.match(pattern);
              if (hrefMatch) {
                const pageNum = parseInt(hrefMatch[1], 10);
                if (!isNaN(pageNum)) maxPage = Math.max(maxPage, pageNum);
              }
              const textNum = parseInt(text, 10);
              if (!isNaN(textNum)) maxPage = Math.max(maxPage, textNum);
            }
          }
        }
        return maxPage;
      },
      config.selectors.pagination.pageLinks,
      config.selectors.pagination.maxPagePattern.map((p) => ({
        source: p.source,
        flags: p.flags,
      }))
    );
  }

  private generateListingUrls(
    baseUrl: string,
    maxPage: number,
    config: ScrapingRules
  ): string[] {
    if (!config.selectors) throw new Error(`Missing selectors in config`);

    const urls: string[] = [];
    for (let i = 1; i <= maxPage; i++) {
      let url: string;
      if (i === 1) {
        url = config.selectors.pagination.urlPattern.firstPage.replace(
          "{baseUrl}",
          baseUrl
        );
      } else {
        url = config.selectors.pagination.urlPattern.otherPages
          .replace("{baseUrl}", baseUrl)
          .replace("{pageNum}", i.toString());
      }
      urls.push(url);
    }
    return urls;
  }

  private async extractArticleUrls(
    page: any,
    config: ScrapingRules
  ): Promise<string[]> {
    if (!config.selectors) throw new Error(`Missing selectors in config`);

    return await page.evaluate(
      (selectors: any, patterns: any) => {
        const urls = new Set<string>();
        for (const selector of selectors) {
          const links = Array.from(document.querySelectorAll(selector));
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href;
            if (href) {
              const articlePattern = new RegExp(
                patterns.articlePattern.source,
                patterns.articlePattern.flags
              );
              if (articlePattern.test(href)) {
                const shouldExclude = patterns.excludePatterns.some(
                  (excludePattern: any) => {
                    const pattern = new RegExp(
                      excludePattern.source,
                      excludePattern.flags
                    );
                    return pattern.test(href);
                  }
                );
                if (!shouldExclude) {
                  urls.add(href.replace(/\/$/, ""));
                }
              }
            }
          }
        }
        return Array.from(urls);
      },
      config.selectors.articleLinks,
      {
        articlePattern: {
          source: config.selectors.urlPatterns.articlePattern.source,
          flags: config.selectors.urlPatterns.articlePattern.flags,
        },
        excludePatterns: config.selectors.urlPatterns.excludePatterns.map(
          (p) => ({ source: p.source, flags: p.flags })
        ),
      }
    );
  }

  private extractBySelectorsWithProcessing(
    $: cheerio.CheerioAPI,
    selectors: SelectorWithProcessor[],
    isContentSelector: boolean = true,
    defaultValue: string = ""
  ): string {
    for (const selectorConfig of selectors) {
      const { selector, processor } = selectorConfig;
      const element = $(selector).first();
      if (element.length) {
        let rawValue = isContentSelector
          ? element.html() || ""
          : element.text() || "";
        if (processor) {
          rawValue = processor(rawValue);
        }
        if (rawValue.trim()) {
          return rawValue;
        }
      }
    }
    return defaultValue;
  }
}
