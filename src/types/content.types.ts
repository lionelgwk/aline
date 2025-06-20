export type ContentType = 'blog' | 'podcast_transcript' | 'call_transcript' | 
  'linkedin_post' | 'reddit_comment' | 'book' | 'other';

export interface ContentItem {
  title: string;
  content: string;
  content_type: ContentType;
  source_url?: string;
  author: string;
  user_id: string;
}

export interface ScrapingResult {
  team_id: string;
  items: ContentItem[];
}

export interface ScrapingConfig {
  maxConcurrency: number;
  retryAttempts: number;
  delayBetweenRequests: number;
  timeout: number;
}