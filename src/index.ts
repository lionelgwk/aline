import { Logger } from "./utils/logger";
import { IntegratedContentScraperService } from "./services";

// Usage example
async function main() {
  const scraper = new IntegratedContentScraperService();

  const sources = [
    // Web sources
    "https://interviewing.io/blog",
    "https://interviewing.io/topics#companies",
    "https://interviewing.io/learn#interview-guides",
    "https://nilmamano.com/blog/category/dsa",
    // PDF sources
    "https://drive.google.com/file/d/1aLUbg2Hif1zG2TcN_ldVQZbygcvtW9Hr/view",
    "https://drive.google.com/file/d/1khcqC5NvkefOmG9pAEPIopT9Vi6cUk_4/view",
    // SPA sources
    "https://quill.co/blog",
    // Bonus
    "https://shreycation.substack.com",
  ];

  try {
    const result = await scraper.scrapeContent(sources, "aline123", "user123");

    console.log("Integrated scraping completed!");
    console.log(`Total items: ${result.items.length}`);

    // Save results
    const fs = require("fs-extra");
    await fs.writeJSON("./temp/integrated-scraped-content.json", result, {
      spaces: 2,
    });
    console.log("Results saved to ./temp/integrated-scraped-content.json");
  } catch (error) {
    Logger.error("Integrated scraping failed", error);
  }
}

if (require.main === module) {
  main();
}
