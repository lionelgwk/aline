import { ContentItem } from "../types";

export abstract class BaseScraper {
  abstract canHandle(url: string): boolean;
  abstract scrape(url: string, userId?: string): Promise<ContentItem[]>;

  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();
  }

  protected extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }
}
