export interface BlogPost {
  title: string;
  content: string;
  link: string;
  date: string;
  source: string;
  selector: string;
  index: number;
}

export interface ScrapingConfig {
  headless: boolean;
  timeout: number;
  delayBetweenRequests: number;
  userAgent: string;
}

export interface ScrapingResult {
  url: string;
  posts: BlogPost[];
  success: boolean;
  error?: string;
}
