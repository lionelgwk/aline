import { RuleBasedScraper } from "../scrapers";
import { Logger } from "../utils";
import { ContentItem, ScrapingResult } from "../types";

export class IntegratedContentScraperService {
  private scraper: RuleBasedScraper;

  constructor() {
    this.scraper = new RuleBasedScraper();
  }

  async scrapeContent(
    sources: string[],
    teamId: string,
    userId: string = ""
  ): Promise<ScrapingResult> {
    Logger.info(`Starting integrated scrape for team: ${teamId}`);
    Logger.info(`Sources: ${sources.join(", ")}`);

    const allItems: ContentItem[] = [];

    for (const source of sources) {
      try {
        if (!this.scraper.canHandle(source)) {
          Logger.warn(`No configuration found for: ${source}`);
          continue;
        }

        const items = await this.scraper.scrape(source, userId);
        allItems.push(...items);
        Logger.info(`Scraped ${items.length} items from ${source}`);
      } catch (error) {
        Logger.error(`Failed to scrape ${source}`, error);
      }
    }

    return {
      team_id: teamId,
      items: allItems,
    };
  }
}
