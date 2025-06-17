import puppeteer from "puppeteer";
import { RuleBasedScraper } from "./rule-based.scraper";
import { ContentItem } from "../types/content.types";
import { Logger } from "../utils/logger";

export class SPAScraper {
  async scrape(
    url: string,
    userId: string = "",
    config?: any
  ): Promise<ContentItem[]> {
    if (!config) {
      throw new Error("SPA scraper requires config");
    }

    Logger.info(`[SPAScraper] Starting SPA scrape for: ${url}`);
    Logger.info(
      `[SPAScraper] Collection method: ${config.spaConfig?.collectionMethod}`
    );

    // Route to appropriate method based on config
    if (config.spaConfig?.collectionMethod === "extract-links") {
      return this.scrapeExtractLinks(url, userId, config);
    } else {
      return this.scrapeClickThrough(url, userId, config);
    }
  }

  // Click-through method
  private async scrapeClickThrough(
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

      if (config.behavior?.userAgent) {
        await page.setUserAgent(config.behavior.userAgent);
      }

      Logger.info(`[SPAScraper] Navigating to click-through SPA: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });

      // execute pre-actions
      if (config.spaConfig?.preActions?.length > 0) {
        await this.executePreActions(page, config.spaConfig.preActions);
      }

      // Collect URLs by clicking through
      const articleUrls = await this.collectUrlsByClicking(page, config);
      await browser.close();

      // Scrape individual articles
      return this.scrapeIndividualArticles(articleUrls, userId, config);
    } catch (error) {
      try {
        await browser.close();
      } catch (e) {}
      throw error;
    }
  }

  // Extract-links method (like Substack)
  private async scrapeExtractLinks(
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

      if (config.behavior?.userAgent) {
        await page.setUserAgent(config.behavior.userAgent);
      }

      Logger.info(`[SPAScraper] Navigating to extract-links SPA: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });

      // Execute pre-actions (click "No thanks", "See all", etc.)
      if (config.spaConfig?.preActions?.length > 0) {
        await this.executePreActions(page, config.spaConfig.preActions);
      }

      // Handle lazy loading
      if (config.spaConfig?.enableLazyLoading) {
        await this.handleLazyLoading(page, config);
      }

      // Extract all links at once
      const articleUrls = await this.extractAllLinks(page, config);
      await browser.close();

      // Scrape individual articles
      return this.scrapeIndividualArticles(articleUrls, userId, config);
    } catch (error) {
      try {
        await browser.close();
      } catch (e) {}
      throw error;
    }
  }

  // Reusable methods
  private async executePreActions(page: any, preActions: any[]): Promise<void> {
    for (let i = 0; i < preActions.length; i++) {
      const action = preActions[i];
      Logger.info(
        `[SPAScraper] Executing action ${i + 1}/${preActions.length}: ${
          action.description
        }`
      );

      try {
        switch (action.action) {
          case "click":
            await this.performClick(page, action);
            break;
          case "wait":
            await this.performWait(page, action);
            break;
          case "scroll":
            await this.performScroll(page, action);
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        if (action.optional) {
          Logger.warn(
            `[SPAScraper] Optional action failed: ${action.description}`,
            error
          );
        } else {
          throw error;
        }
      }
    }
  }

  private async performClick(page: any, action: any): Promise<void> {
    try {
      await page.waitForSelector(action.selector, {
        timeout: action.timeout || 5000,
      });
      await page.click(action.selector);

      if (action.waitFor) {
        if (typeof action.waitFor === "string") {
          await page.waitForSelector(action.waitFor, {
            timeout: action.timeout || 5000,
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, action.waitFor));
        }
      }
    } catch (error) {
      // Try XPath for text-based selectors
      if (action.selector.includes(":contains(")) {
        const text = action.selector.match(/:contains\("([^"]+)"\)/)?.[1];
        if (text) {
          const elements = await page.$x(
            `//button[contains(text(), '${text}')]`
          );
          if (elements.length > 0) {
            await elements[0].click();
          } else {
            throw new Error(`No button found with text: ${text}`);
          }
        }
      } else {
        throw error;
      }
    }
  }

  private async performWait(page: any, action: any): Promise<void> {
    if (action.waitFor) {
      if (typeof action.waitFor === "string") {
        await page.waitForSelector(action.waitFor, {
          timeout: action.timeout || 5000,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, action.waitFor));
      }
    }
  }

  private async performScroll(page: any, action: any): Promise<void> {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    if (action.waitFor) {
      if (typeof action.waitFor === "string") {
        await page.waitForSelector(action.waitFor, {
          timeout: action.timeout || 5000,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, action.waitFor));
      }
    }
  }

  private async handleLazyLoading(page: any, config: any): Promise<void> {
    const lazyConfig = config.spaConfig.lazyLoadConfig;
    const maxAttempts = lazyConfig?.maxScrollAttempts || 10;
    const scrollDelay = lazyConfig?.scrollDelay || 2000;

    Logger.info(
      `[SPAScraper] Starting lazy loading with ${maxAttempts} max attempts`
    );

    let previousLinkCount = 0;
    let noNewLinksCount = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, scrollDelay));

      const currentLinkCount = await page.$$eval(
        config.spaConfig.buttonSelector || 'a[href*="/p/"]',
        (links: Element[]) => links.length
      );

      Logger.info(
        `[SPAScraper] Scroll ${attempt}/${maxAttempts}: ${currentLinkCount} links`
      );

      if (currentLinkCount === previousLinkCount) {
        noNewLinksCount++;
        if (noNewLinksCount >= 3) {
          Logger.info(`[SPAScraper] No new links for 3 attempts, stopping`);
          break;
        }
      } else {
        noNewLinksCount = 0;
      }

      previousLinkCount = currentLinkCount;
    }
  }

  private async collectUrlsByClicking(
    page: any,
    config: any
  ): Promise<string[]> {
    const urls: string[] = [];
    const listingUrl = page.url();
    const buttonSelector =
      config.spaConfig.buttonSelector || config.selectors.articleLinks[0];

    try {
      const totalButtons = await page.$$eval(
        buttonSelector,
        (buttons: Element[]) => buttons.length
      );
      Logger.info(`[SPAScraper] Found ${totalButtons} buttons to click`);

      for (let i = 0; i < totalButtons; i++) {
        try {
          if (page.url() !== listingUrl) {
            await page.goto(listingUrl, { waitUntil: "networkidle2" });
            await page.waitForSelector(buttonSelector, { timeout: 5000 });
          }

          const buttons = await page.$$(buttonSelector);
          if (i < buttons.length) {
            await buttons[i].click();
            await page.waitForNavigation({
              waitUntil: "networkidle2",
              timeout: 10000,
            });

            const articleUrl = page.url();
            if (config.selectors.urlPatterns.articlePattern.test(articleUrl)) {
              urls.push(articleUrl);
              Logger.info(`[SPAScraper] Collected: ${articleUrl}`);
            }
          }
        } catch (error) {
          Logger.error(
            `[SPAScraper] Failed to collect URL from button ${i}`,
            error
          );
        }
      }
    } catch (error) {
      Logger.error("[SPAScraper] Error in click-through collection", error);
    }

    return [...new Set(urls)];
  }

  // Fixed version - avoid RegExp serialization
  private async extractAllLinks(page: any, config: any): Promise<string[]> {
    const buttonSelector = config.spaConfig.buttonSelector;

    const links = await page.evaluate(
      (selector: string, patternSource: string, patternFlags: string) => {
        const elements = document.querySelectorAll(selector);
        const urls = new Set();

        // Recreate the RegExp inside page.evaluate()
        const pattern = new RegExp(patternSource, patternFlags);

        elements.forEach((element) => {
          const href = (element as HTMLAnchorElement).href;
          if (href && pattern.test(href)) {
            urls.add(href);
          }
        });

        return Array.from(urls);
      },
      buttonSelector,
      config.selectors.urlPatterns.articlePattern.source,
      config.selectors.urlPatterns.articlePattern.flags || "i"
    );

    Logger.info(`[SPAScraper] Extracted ${links.length} article links`);
    return links;
  }

  private async scrapeIndividualArticles(
    urls: string[],
    userId: string,
    config: any
  ): Promise<ContentItem[]> {
    // Import the rule-based scraper to reuse its single page scraping
    const ruleScraper = new RuleBasedScraper();

    const allItems: ContentItem[] = [];

    for (let i = 0; i < urls.length; i++) {
      const articleUrl = urls[i];
      try {
        Logger.info(
          `[SPAScraper] Scraping article ${i + 1}/${urls.length}: ${articleUrl}`
        );

        // Use the rule-based scraper's single page method
        const items = await ruleScraper.scrapeSinglePage(
          articleUrl,
          userId,
          config
        );
        allItems.push(...items);

        await new Promise((resolve) =>
          setTimeout(resolve, config.behavior?.delayBetweenRequests || 2000)
        );
      } catch (error) {
        Logger.error(
          `[SPAScraper] Failed to scrape article: ${articleUrl}`,
          error
        );
      }
    }

    return allItems;
  }
}
