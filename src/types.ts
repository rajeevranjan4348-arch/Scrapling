export type FetcherType = 'Fetcher' | 'AsyncFetcher' | 'StealthyFetcher' | 'DynamicFetcher';

export interface FetchRequestConfig {
  url: string;
  fetcherType: FetcherType;
  headless: boolean;
  networkIdle: boolean;
  stealth: boolean;
  disableResources: boolean;
  customHeaders?: Record<string, string>;
  userAgent?: string;
  proxy?: string;
  timeout?: number;
  fixtureId?: string;
}

export interface DiscoveredLink {
  url: string;
  originalHref: string;
  anchorText: string;
  isInternal: boolean;
}

export interface FetchResponseData {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  html: string;
  markdown: string;
  responseTimeMs: number;
  contentLength: number;
  title: string;
  detectedEngine: string;
  stealthFeaturesApplied?: string[];
  javaScriptEnabled?: boolean;
  cookies?: Record<string, string>;
  discoveredLinks?: DiscoveredLink[];
  internalLinksCount?: number;
  externalLinksCount?: number;
  timestamp: string;
}

export interface ExtractedElement {
  id: string;
  tag: string;
  text: string;
  attributes: Record<string, string>;
  html: string;
  cssPath: string;
  xpath: string;
  childrenCount: number;
  score?: number;
  matchedBy?: string;
}

export interface ElementFingerprint {
  id: string;
  name: string;
  originalSelector: string;
  tag: string;
  attributeKeys: string[];
  attributeValues: Record<string, string>;
  classNames: string[];
  textSnippet: string;
  textLength: number;
  parentTag: string;
  parentClasses: string[];
  siblingTags: string[];
  relativePosition: number;
  savedAt: string;
  targetCount: number;
}

export interface AdaptiveMatchResult {
  originalSelector: string;
  foundWithOriginal: boolean;
  foundWithAdaptive: boolean;
  confidenceScore: number;
  matchReason: string;
  elements: ExtractedElement[];
  differencesDetected: string[];
}

export interface LinkData {
  url: string;
  originalHref?: string;
  anchorText: string;
  isInternal: boolean;
  rel?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ImageData {
  src: string;
  alt: string;
  title?: string;
  width?: string;
  height?: string;
}

export interface HeadingsMap {
  h1: string[];
  h2: string[];
  h3: string[];
  h4?: string[];
  h5?: string[];
  h6?: string[];
}

export interface WebsiteTreeNode {
  id: string;
  name: string;
  path: string;
  pathSegment?: string;
  url: string;
  depth: number;
  status: number;
  pageType: string;
  title: string;
  children: WebsiteTreeNode[];
  internalLinksCount?: number;
  externalLinksCount?: number;
  headingsCount?: number;
  pageItem?: ScrapedItem;
}

export interface SpiderConfig {
  id: string;
  name: string;
  template: 'crawler' | 'sitemap' | 'shopify' | 'feed' | 'site_to_markdown' | 'custom';
  startUrls: string[];
  allowedDomains: string[];
  maxRequests: number;
  maxPages?: number;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  timeout?: number;
  retryCount?: number;
  sameDomainOnly?: boolean;
  includeSubdomains?: boolean;
  respectRobotsTxt?: boolean;
  includeQueryParameters?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  selectorRules: {
    name: string;
    selector: string;
    type: 'text' | 'attr' | 'html' | 'all';
    attributeName?: string;
  }[];
  linkSelector?: string;
  proxyRotation: boolean;
  stealthMode: boolean;
  enableJavascript?: boolean;
}

export interface SpiderLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
  url?: string;
  message: string;
}

export interface ScrapedItem {
  _id: string;
  _url: string;
  _depth: number;
  _status: number;
  _responseTimeMs: number;
  _parentUrl?: string;
  _timestamp: string;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  pageType: 'homepage' | 'product' | 'article' | 'category' | 'documentation' | 'contact' | 'faq' | 'about' | 'general';
  h1: string;
  headings: HeadingsMap;
  content: string;
  contentSnippet: string;
  paragraphs: string[];
  lists: string[];
  tables: TableData[];
  links: LinkData[];
  images: ImageData[];
  imageAltText: string[];
  videos: string[];
  structuredData: any[];
  metadata: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    ogUrl?: string;
    twitterCard?: string;
    twitterTitle?: string;
    author?: string;
    publishedTime?: string;
    language?: string;
    [key: string]: any;
  };
  internalLinksCount: number;
  externalLinksCount: number;
  imagesCount: number;
  markdownSnippet: string;
  markdown: string;
  uiElements?: ScreenUiElements;
  [key: string]: any;
}

export interface SpiderRuntimeStats {
  id?: string;
  status: 'idle' | 'starting' | 'discovering' | 'crawling' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'running' | 'paused' | 'stopped';
  requestsCompleted: number;
  requestsFailed: number;
  itemsExtracted: number;
  queueRemaining: number;
  pagesDiscovered?: number;
  pagesQueued?: number;
  pagesScraped?: number;
  currentUrl?: string;
  crawlDepth?: number;
  maxDepth?: number;
  crawlPercentage?: number;
  avgLatencyMs: number;
  bytesReceived: number;
  startedAt?: string;
  finishedAt?: string;
  websiteTree?: WebsiteTreeNode;
}

export interface DocArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  codeSnippet: string;
  content: string;
  tags: string[];
}

export interface RobotsRuleGroup {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

export interface RobotsPathTestResult {
  isAllowed: boolean;
  matchedRule?: string;
  matchedUserAgent?: string;
  reason: string;
}

export interface RobotsTxtPreviewData {
  targetUrl: string;
  robotsUrl: string;
  status: number;
  statusText?: string;
  found: boolean;
  rawContent: string;
  sitemaps: string[];
  host?: string;
  groups: RobotsRuleGroup[];
  commentsCount: number;
  testResult?: RobotsPathTestResult;
  error?: string;
}

export interface ScreenUiElements {
  navigation: Array<{ text: string; href: string }>;
  actionButtons: Array<{ text: string; type?: string; role?: string; disabled?: boolean; className?: string }>;
  forms: Array<{
    id?: string;
    action?: string;
    method?: string;
    inputs: Array<{ name?: string; type?: string; placeholder?: string; label?: string }>;
  }>;
  headings: string[];
  sections: string[];
  cardsCount: number;
  hasHeader: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasNavigation: boolean;
  interactiveControlsCount: number;
}

export interface ScrapedScreenData {
  screenId: string;
  url: string;
  path: string;
  title: string;
  depth: number;
  status: number;
  responseTimeMs: number;
  html: string;
  markdown: string;
  pageType: string;
  uiElements: ScreenUiElements;
  discoveredLinksCount: number;
  engine?: string;
}

export interface FullUiScrapeResult {
  targetUrl: string;
  baseDomain: string;
  totalScreensScraped: number;
  screens: ScrapedScreenData[];
  fullUiInventory: {
    allNavLinks: Array<{ text: string; href: string; foundOnScreen: string }>;
    allActionButtons: Array<{ text: string; foundOnScreen: string }>;
    allForms: Array<{ action?: string; inputsCount: number; foundOnScreen: string }>;
    totalScreens: number;
  };
  consolidatedMarkdown: string;
  timestamp: string;
}

