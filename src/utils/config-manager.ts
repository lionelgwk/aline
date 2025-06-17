import { EnhancedScrapingRules } from "../types";
import { ENHANCED_SCRAPER_CONFIGS } from "../config";

const DEFAULT_PDF_CONFIG = "pdf:generic"; // Fallback for unmapped PDFs

// Simple mapping: exact URL/path -> config key
const PDF_URL_MAPPINGS: Record<string, string> = {
  // Google Drive URLs
  "https://drive.google.com/file/d/1aLUbg2Hif1zG2TcN_ldVQZbygcvtW9Hr/view":
    "pdf:bctci",
  "https://drive.google.com/file/d/1khcqC5NvkefOmG9pAEPIopT9Vi6cUk_4/view":
    "pdf:bctci",
};

export class ConfigManager {
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  static getConfigForUrl(url: string): EnhancedScrapingRules | null {
    const preferredConfig = PDF_URL_MAPPINGS[url];

    if (preferredConfig) {
      return ENHANCED_SCRAPER_CONFIGS[preferredConfig];
    }

    if (this.isPdfUrl(url)) {
      return ENHANCED_SCRAPER_CONFIGS[DEFAULT_PDF_CONFIG];
    }

    // Extract domain using existing base scraper method
    const domain = ConfigManager.extractDomain(url);
    console.log(`[ConfigManager] Extracted domain: ${domain} from URL: ${url}`);

    // Check for exact matches first (like "interviewing.io/topics")
    for (const [key, config] of Object.entries(ENHANCED_SCRAPER_CONFIGS)) {
      if (key.startsWith("pdf:") || key.startsWith("spa:")) continue;

      if (url.includes(key)) {
        console.log(`[ConfigManager] Found exact path match: ${key}`);
        return config;
      }
    }

    // Check for SPA configs
    for (const [key, config] of Object.entries(ENHANCED_SCRAPER_CONFIGS)) {
      if (key.startsWith("spa:")) {
        const configDomain = key.replace("spa:", "").split("/")[0];
        // Check if extracted domain ends with the config domain
        if (domain.endsWith(configDomain)) {
          console.log(
            `[ConfigManager] Found SPA domain match: ${key} for domain: ${domain}`
          );
          return config;
        }
      }
    }

    // Domain matching for regular web configs (fallback)
    for (const [key, config] of Object.entries(ENHANCED_SCRAPER_CONFIGS)) {
      if (key.startsWith("pdf:") || key.startsWith("spa:")) continue;

      if (config.domain && domain.includes(config.domain)) {
        console.log(
          `[ConfigManager] Found domain fallback match: ${config.domain}`
        );
        return config;
      }
    }

    console.log(`[ConfigManager] No configuration found for URL: ${url}`);
    return null;
  }

  static isPdfUrl(url: string): boolean {
    return (
      url.toLowerCase().endsWith(".pdf") ||
      url.includes("drive.google.com/file") ||
      url.toLowerCase().includes("pdf") ||
      (!url.startsWith("http") && url.toLowerCase().endsWith(".pdf")) // Local PDF files
    );
  }

  // Method to add new URL mappings
  static addPdfUrlMapping(url: string, configKey: string): void {
    PDF_URL_MAPPINGS[url] = configKey;
    console.log(
      `[ConfigManager] Added PDF URL mapping: ${url} -> ${configKey}`
    );
  }

  // Method to remove URL mappings
  static removePdfUrlMapping(url: string): void {
    delete PDF_URL_MAPPINGS[url];
    console.log(`[ConfigManager] Removed PDF URL mapping: ${url}`);
  }

  // Method to get current URL mappings
  static getPdfUrlMappings(): Record<string, string> {
    return { ...PDF_URL_MAPPINGS };
  }

  // Method to set default PDF config
  static setDefaultPdfConfig(configKey: string): void {
    if (ENHANCED_SCRAPER_CONFIGS[configKey]) {
      console.log(
        `[ConfigManager] Would set default PDF config to: ${configKey}`
      );
      console.log(
        `[ConfigManager] (Currently hardcoded as ${DEFAULT_PDF_CONFIG})`
      );
    } else {
      console.warn(`[ConfigManager] Config key not found: ${configKey}`);
    }
  }

  static getAllConfigs(): Record<string, EnhancedScrapingRules> {
    return ENHANCED_SCRAPER_CONFIGS;
  }
}
