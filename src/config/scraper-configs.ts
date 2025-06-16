import { EnhancedScrapingRules } from "../types/scraper-config.types";
import {
  InterviewingIOBlogConfig,
  InterviewingIOTopicsConfig,
  InterviewingIOLearnConfig,
  NilMamanoBlogDSAConfig,
} from "./web";
import { BTCTIConfig, GenericConfig } from "./pdf";

export const ENHANCED_SCRAPER_CONFIGS: Record<string, EnhancedScrapingRules> = {
  // Web Scraping
  // Domain Specific Configs
  "interviewing.io/blog": InterviewingIOBlogConfig,
  "interviewing.io/topics": InterviewingIOTopicsConfig,
  "interviewing.io/learn": InterviewingIOLearnConfig,
  "nilmamano.com/blog/category/dsa": NilMamanoBlogDSAConfig,
  // PDF Specific Configs
  "pdf:bctci": BTCTIConfig,
  "pdf:generic": GenericConfig,
};
