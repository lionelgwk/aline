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
  static getConfigForUrl(url: string): EnhancedScrapingRules | null {
    const preferredPdfConfig = PDF_URL_MAPPINGS[url];
    console.log(`[ConfigManager] Looking for config for URL: ${url}`);

    if (preferredPdfConfig) {
      console.log(
        `[ConfigManager] Found mapped PDF config: ${preferredPdfConfig}`
      );
    }

    if (this.isPdfUrl(url)) {
      console.log(`[ConfigManager] Detected PDF URL`);

      // If we have a specific mapping for this URL, use it
      if (preferredPdfConfig && ENHANCED_SCRAPER_CONFIGS[preferredPdfConfig]) {
        console.log(
          `[ConfigManager] Using mapped PDF config: ${preferredPdfConfig}`
        );
        return ENHANCED_SCRAPER_CONFIGS[preferredPdfConfig];
      }

      // Fall back to default PDF config
      console.log(
        `[ConfigManager] Using default PDF config: ${DEFAULT_PDF_CONFIG}`
      );
      return ENHANCED_SCRAPER_CONFIGS[DEFAULT_PDF_CONFIG];
    }

    // For web URLs, check exact matches first
    for (const [key, config] of Object.entries(ENHANCED_SCRAPER_CONFIGS)) {
      if (key.startsWith("pdf:")) continue; // Skip PDF configs for web URLs

      if (url.includes(key)) {
        console.log(`[ConfigManager] Found exact match for key: ${key}`);
        return config;
      }
    }

    // Check domain matches for web configs
    for (const [key, config] of Object.entries(ENHANCED_SCRAPER_CONFIGS)) {
      if (key.startsWith("pdf:")) continue; // Skip PDF configs

      if (config.domain && url.includes(config.domain)) {
        console.log(`[ConfigManager] Found domain match for: ${config.domain}`);
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
      // Note: In a real implementation, you'd want to make this mutable
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
