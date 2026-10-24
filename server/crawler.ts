import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { BrowserContext } from 'playwright';
import {
  renderWithBrowser,
  detectChallengeOrPlaceholder,
  requiresBrowserRendering,
  getPlaywrightBrowser,
} from './browser';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.remove(['script', 'style', 'noscript', 'iframe']);

export interface DiscoveredLink {
  url: string;
  originalHref: string;
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
  h4: string[];
  h5: string[];
  h6: string[];
}

export interface WebsiteTreeNode {
  id: string;
  name: string;
  path: string;
  url: string;
  depth: number;
  status: number;
  pageType: string;
  title: string;
  children: WebsiteTreeNode[];
  internalLinksCount?: number;
  externalLinksCount?: number;
  headingsCount?: number;
}

export interface CrawledPageData {
  _id: string;
  _url: string;
  requestedUrl?: string;
  finalUrl?: string;
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
  links: DiscoveredLink[];
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

export interface SpiderSessionState {
  id: string;
  name: string;
  status: 'starting' | 'discovering' | 'crawling' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'running' | 'paused' | 'stopped';
  cancellationRequested?: boolean;
  startUrls: string[];
  allowedDomains: string[];
  maxRequests: number;
  maxPages: number;
  maxDepth: number;
  concurrency: number;
  delayMs: number;
  retryCount: number;
  sameDomainOnly: boolean;
  includeSubdomains: boolean;
  respectRobotsTxt: boolean;
  includeQueryParameters: boolean;
  excludePatterns: string[];
  includePatterns: string[];
  enableJavascript: boolean;
  stealthMode: boolean;
  requestsCompleted: number;
  requestsFailed: number;
  itemsExtracted: number;
  queueRemaining: number;
  pagesDiscovered: number;
  pagesQueued: number;
  pagesScraped: number;
  currentUrl: string;
  crawlDepth: number;
  crawlPercentage: number;
  avgLatencyMs: number;
  bytesReceived: number;
  startedAt: string;
  finishedAt?: string;
  websiteTree?: WebsiteTreeNode;
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
    url?: string;
    message: string;
  }>;
  items: CrawledPageData[];
  abortController?: AbortController;
}

export const spiderSessions = new Map<string, SpiderSessionState>();

// Non-page file extensions to ignore during web crawl
const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff', '.avif',
  '.pdf', '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.bz2',
  '.exe', '.dmg', '.pkg', '.apk', '.deb', '.rpm', '.iso',
  '.mp3', '.mp4', '.wav', '.ogg', '.m4a', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
  '.css', '.js', '.mjs', '.map', '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.xml', '.rss', '.atom'
]);

// Analytics and tracking query parameters to strip
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid',
  'msclkid', 'twclid', 'mc_cid', 'mc_eid', '_ga', '_gl', '_hsenc', '_hsmi',
  'ref', 'source', 'ref_src', 'yclid', 'zanpid', 'igshid'
]);

/**
 * SSRF Protection: verify target URL is not a private or loopback IP
 */
export function isSafeTargetUrl(urlStr: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // Allow mock testbed domain for in-app testing
    if (host === 'mock.scrapling.local' || host.endsWith('.scrapling.local')) {
      return { safe: true };
    }

    // Block private/loopback hostnames and IP addresses
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local')
    ) {
      return { safe: false, reason: 'Requests to localhost or loopback are blocked for SSRF security' };
    }

    // Check private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const ipMatch = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [_, a, b] = ipMatch.map(Number);
      if (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 169 && b === 254) ||
        a === 127 ||
        a === 0
      ) {
        return { safe: false, reason: 'Requests to private IP addresses are blocked' };
      }
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    return { safe: true };
  } catch (e: any) {
    return { safe: false, reason: 'Invalid URL' };
  }
}

/**
 * Normalize domain string (e.g. www.example.com -> example.com)
 */
export function normalizeDomain(hostname: string): string {
  const clean = hostname.toLowerCase().trim();
  if (clean.startsWith('www.')) {
    return clean.slice(4);
  }
  return clean;
}

/**
 * Check if a URL matches a wildcard or regex pattern string
 */
export function matchesPattern(urlStr: string, pattern: string): boolean {
  if (!pattern || !pattern.trim()) return false;
  const p = pattern.trim();

  try {
    // Check if regex: /pattern/i
    if (p.startsWith('/') && p.lastIndexOf('/') > 0) {
      const lastSlash = p.lastIndexOf('/');
      const patternBody = p.slice(1, lastSlash);
      const flags = p.slice(lastSlash + 1);
      const regex = new RegExp(patternBody, flags);
      return regex.test(urlStr);
    }

    // Wildcard pattern matching (* matches anything)
    const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(escaped, 'i');
    return regex.test(urlStr);
  } catch {
    return urlStr.toLowerCase().includes(p.toLowerCase());
  }
}

/**
 * Check if a URL matches any pattern in a list
 */
export function matchesAnyPattern(urlStr: string, patterns: string[] = []): boolean {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((pat) => pat && matchesPattern(urlStr, pat));
}

/**
 * Check if a URL belongs to the allowed domain / website scope
 */
export function isSameWebsite(
  targetUrl: string,
  baseDomain: string,
  allowedDomains: string[] = [],
  options?: { sameDomainOnly?: boolean; includeSubdomains?: boolean }
): boolean {
  try {
    const targetHost = new URL(targetUrl).hostname.toLowerCase();
    const cleanTarget = normalizeDomain(targetHost);
    const cleanBase = normalizeDomain(baseDomain);

    const allowSubdomains = options?.includeSubdomains ?? true;

    // Exact root domain match (e.g. example.com == example.com or www.example.com == example.com)
    if (cleanTarget === cleanBase) {
      return true;
    }

    // Subdomain check (e.g. blog.example.com ends with .example.com)
    if (allowSubdomains && cleanTarget.endsWith(`.${cleanBase}`)) {
      return true;
    }

    // Check additional explicitly allowed domains
    for (const allowed of allowedDomains) {
      const cleanAllowed = normalizeDomain(allowed);
      if (cleanTarget === cleanAllowed || (allowSubdomains && cleanTarget.endsWith(`.${cleanAllowed}`))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Clean & Normalize URL for deduplication and crawling
 */
export function normalizeUrl(
  rawUrl: string,
  baseUrl?: string,
  options?: { includeQueryParameters?: boolean }
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return null;
  }

  try {
    const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);

    // Only HTTP / HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip hash fragment
    parsed.hash = '';

    // Filter non-page extensions
    const pathnameLower = parsed.pathname.toLowerCase();
    for (const ext of IGNORED_EXTENSIONS) {
      if (pathnameLower.endsWith(ext)) {
        return null;
      }
    }

    // Handle query parameters
    const includeQuery = options?.includeQueryParameters ?? true;
    if (!includeQuery) {
      parsed.search = '';
    } else {
      const searchParams = new URLSearchParams(parsed.search);
      const keysToDelete: string[] = [];
      for (const [key] of searchParams.entries()) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((k) => searchParams.delete(k));

      // Sort remaining query parameters for consistent deduplication
      searchParams.sort();
      const cleanedSearch = searchParams.toString();
      parsed.search = cleanedSearch ? `?${cleanedSearch}` : '';
    }

    // Normalize trailing slash: remove trailing slash unless it is the root '/'
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Extract all internal & external links, pagination, and navigation links from an HTML document
 */
export function extractLinksFromHtml(
  html: string,
  currentUrl: string,
  baseDomain?: string,
  allowedDomains: string[] = [],
  options?: {
    sameDomainOnly?: boolean;
    includeSubdomains?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
    includeQueryParameters?: boolean;
  }
): {
  internalLinks: DiscoveredLink[];
  externalLinks: DiscoveredLink[];
  allLinks: DiscoveredLink[];
  paginationLinks: DiscoveredLink[];
} {
  const $ = cheerio.load(html);
  const internalMap = new Map<string, DiscoveredLink>();
  const externalMap = new Map<string, DiscoveredLink>();
  const paginationMap = new Map<string, DiscoveredLink>();

  const rootBase = baseDomain || (currentUrl ? new URL(currentUrl).hostname : '');

  // 1. Scan <a>, <area>, <link rel="canonical"|rel="next"|rel="prev">
  $('a[href], area[href], link[rel="canonical"][href], link[rel="next"][href], link[rel="prev"][href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref) return;

    const normalized = normalizeUrl(rawHref, currentUrl, {
      includeQueryParameters: options?.includeQueryParameters ?? true,
    });
    if (!normalized) return;

    // Check exclusion patterns
    if (options?.excludePatterns && options.excludePatterns.length > 0) {
      if (matchesAnyPattern(normalized, options.excludePatterns)) {
        return;
      }
    }

    // Check inclusion patterns if configured
    if (options?.includePatterns && options.includePatterns.length > 0) {
      if (!matchesAnyPattern(normalized, options.includePatterns)) {
        return;
      }
    }

    const anchorText = $(el).text().trim() || $(el).attr('title') || $(el).attr('aria-label') || '';
    const rel = $(el).attr('rel') || '';
    const internal = isSameWebsite(normalized, rootBase, allowedDomains, {
      sameDomainOnly: options?.sameDomainOnly ?? true,
      includeSubdomains: options?.includeSubdomains ?? true,
    });

    const linkObj: DiscoveredLink = {
      url: normalized,
      originalHref: rawHref,
      anchorText: anchorText.slice(0, 120),
      isInternal: internal,
      rel: rel || undefined,
    };

    // Check if this link represents pagination
    const isPaginationLink =
      rel.toLowerCase().includes('next') ||
      rel.toLowerCase().includes('prev') ||
      $(el).closest('.pagination, [class*="pagination"], [aria-label*="pagination" i], nav[role="navigation"]').length > 0 ||
      /[?&](?:page|p|pg)=\d+/i.test(normalized) ||
      /\/(?:page|p)\/\d+/i.test(normalized) ||
      /^(?:next|older|previous|newer|page\s*\d+|\d+)$/i.test(anchorText.trim());

    if (isPaginationLink && internal) {
      paginationMap.set(normalized, linkObj);
    }

    if (internal) {
      if (!internalMap.has(normalized)) {
        internalMap.set(normalized, linkObj);
      }
    } else {
      if (!externalMap.has(normalized)) {
        externalMap.set(normalized, linkObj);
      }
    }
  });

  // 2. Extract embedded JSON-LD or Next.js route links if available
  $('script#__NEXT_DATA__, script[type="application/json"]').each((_, el) => {
    try {
      const text = $(el).text();
      const urlMatches = text.match(/"(\/(?:[a-zA-Z0-9_\-\.]+\/)*[a-zA-Z0-9_\-\.]+)"/g);
      if (urlMatches) {
        for (const match of urlMatches.slice(0, 50)) {
          const rawPath = match.replace(/"/g, '');
          if (rawPath.startsWith('/') && !rawPath.startsWith('/_next') && !rawPath.startsWith('/static')) {
            const normalized = normalizeUrl(rawPath, currentUrl, {
              includeQueryParameters: options?.includeQueryParameters ?? true,
            });
            if (normalized && !internalMap.has(normalized)) {
              internalMap.set(normalized, {
                url: normalized,
                originalHref: rawPath,
                anchorText: '[Hydrated Script Route]',
                isInternal: true,
              });
            }
          }
        }
      }
    } catch {
      // Ignore script extraction errors
    }
  });

  const internalLinks = Array.from(internalMap.values());
  const externalLinks = Array.from(externalMap.values());
  const paginationLinks = Array.from(paginationMap.values());

  return {
    internalLinks,
    externalLinks,
    allLinks: [...internalLinks, ...externalLinks],
    paginationLinks,
  };
}

/**
 * Determine page classification type from URL and DOM heuristics
 */
export function classifyPageType(url: string, $: cheerio.CheerioAPI): 'homepage' | 'product' | 'article' | 'category' | 'documentation' | 'contact' | 'faq' | 'about' | 'general' {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();

    if (path === '/' || path === '' || path === '/index.html' || path === '/home') {
      return 'homepage';
    }

    if (path.includes('/product') || path.includes('/item/') || path.includes('/p/') || $('[itemtype*="schema.org/Product"]').length > 0 || $('.product-detail, .product-item').length > 0) {
      return 'product';
    }

    if (path.includes('/category') || path.includes('/categories') || path.includes('/catalog') || path.includes('/shop') || path.includes('/collection')) {
      return 'category';
    }

    if (path.includes('/blog') || path.includes('/news') || path.includes('/post') || path.includes('/article') || $('article').length > 0 || $('meta[property="og:type"][content="article"]').length > 0) {
      return 'article';
    }

    if (path.includes('/doc') || path.includes('/guide') || path.includes('/api-ref') || path.includes('/reference') || path.includes('/tutorial')) {
      return 'documentation';
    }

    if (path.includes('/contact') || path.includes('/support') || path.includes('/help') || path.includes('/reach-us')) {
      return 'contact';
    }

    if (path.includes('/faq') || path.includes('/frequently-asked-questions') || path.includes('/questions')) {
      return 'faq';
    }

    if (path.includes('/about') || path.includes('/team') || path.includes('/company') || path.includes('/our-story')) {
      return 'about';
    }

    return 'general';
  } catch {
    return 'general';
  }
}

/**
 * Extract comprehensive UI elements (Navigation, Action Buttons & CTAs, Forms & Inputs, Layout Structure)
 */
export function extractScreenUiComponents($: cheerio.CheerioAPI, baseUrl: string): ScreenUiElements {
  // 1. Navigation links
  const navigation: Array<{ text: string; href: string }> = [];
  const seenNav = new Set<string>();
  $('nav a, header a, [role="navigation"] a, .nav a, .menu a, .navbar a, .site-header a').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href') || '';
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      const key = `${text}::${href}`;
      if (!seenNav.has(key)) {
        seenNav.add(key);
        navigation.push({ text: text.slice(0, 60), href });
      }
    }
  });

  // 2. Action Buttons & CTAs
  const actionButtons: Array<{ text: string; type?: string; role?: string; disabled?: boolean; className?: string }> = [];
  const seenBtn = new Set<string>();
  $('button, input[type="submit"], input[type="button"], a[role="button"], .btn, [class*="button"], [class*="btn"]').each((_, el) => {
    const text = ($(el).text() || $(el).attr('value') || $(el).attr('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (text && text.length < 50) {
      if (!seenBtn.has(text)) {
        seenBtn.add(text);
        actionButtons.push({
          text,
          type: $(el).attr('type') || (el.tagName === 'button' ? 'button' : undefined),
          role: $(el).attr('role'),
          disabled: $(el).is(':disabled') || $(el).attr('disabled') !== undefined,
          className: ($(el).attr('class') || '').slice(0, 80),
        });
      }
    }
  });

  // 3. Forms & interactive inputs
  const forms: ScreenUiElements['forms'] = [];
  $('form').each((_, f) => {
    const $f = $(f);
    const formId = $f.attr('id') || $f.attr('name');
    const action = $f.attr('action');
    const method = ($f.attr('method') || 'GET').toUpperCase();
    const inputs: Array<{ name?: string; type?: string; placeholder?: string; label?: string }> = [];

    $f.find('input, select, textarea').each((__, input) => {
      const $inp = $(input);
      const type = $inp.attr('type') || input.tagName;
      if (type !== 'hidden') {
        const name = $inp.attr('name') || $inp.attr('id');
        const placeholder = $inp.attr('placeholder');
        const label = $f.find(`label[for="${$inp.attr('id')}"]`).text().trim();
        inputs.push({
          name: name || undefined,
          type,
          placeholder: placeholder || undefined,
          label: label || undefined,
        });
      }
    });

    forms.push({
      id: formId,
      action: action || undefined,
      method,
      inputs: inputs.slice(0, 15),
    });
  });

  // 4. Sections & layout regions
  const sections: string[] = [];
  $('section, article, main > div, [role="region"]').each((_, el) => {
    const heading = $(el).find('h1, h2, h3, h4').first().text().trim();
    if (heading && heading.length < 70 && !sections.includes(heading)) {
      sections.push(heading);
    }
  });

  const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 15);
  const cardsCount = $('.card, .product-card, article, [class*="card"], [class*="item-card"]').length;
  const hasHeader = $('header, [role="banner"], .header, .site-header').length > 0;
  const hasFooter = $('footer, [role="contentinfo"], .footer, .site-footer').length > 0;
  const hasSidebar = $('aside, [role="complementary"], .sidebar, [class*="sidebar"]').length > 0;
  const hasNavigation = $('nav, [role="navigation"], .nav, .menu').length > 0;

  const interactiveControlsCount = actionButtons.length + $('a').length + $('input, select, textarea').length;

  return {
    navigation: navigation.slice(0, 25),
    actionButtons: actionButtons.slice(0, 25),
    forms: forms.slice(0, 8),
    headings,
    sections: sections.slice(0, 10),
    cardsCount,
    hasHeader,
    hasFooter,
    hasSidebar,
    hasNavigation,
    interactiveControlsCount,
  };
}

/**
 * Extract rich structured content from a crawled page
 */
export function extractPageContent(
  html: string,
  url: string,
  depth: number,
  status: number,
  responseTimeMs: number,
  parentUrl?: string,
  selectorRules?: Array<{ name: string; selector: string; type?: string; attributeName?: string }>,
  finalUrl?: string
): CrawledPageData {
  const $ = cheerio.load(html);
  const uiElements = extractScreenUiComponents($, finalUrl || url);

  // 1. Core Titles & Meta
  const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || 'Untitled Page';
  const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || '';
  const canonicalUrl = $('link[rel="canonical"]').attr('href') || finalUrl || url;
  const h1 = $('h1').first().text().trim() || '';

  // 2. Comprehensive Headings Map H1 to H6
  const headings: HeadingsMap = {
    h1: $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 10),
    h2: $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20),
    h3: $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 30),
    h4: $('h4').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20),
    h5: $('h5').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20),
    h6: $('h6').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20),
  };

  // 3. Paragraphs Extraction
  const paragraphs: string[] = $('p')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter((text) => text.length > 10)
    .slice(0, 50);

  // 4. Lists Extraction
  const lists: string[] = $('ul > li, ol > li')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter((text) => text.length > 2)
    .slice(0, 40);

  // 5. Tables Extraction
  const tables: TableData[] = [];
  $('table').each((_, tableEl) => {
    const $t = $(tableEl);
    const headers = $t.find('th').map((__, th) => $(th).text().trim()).get();
    const rows: string[][] = [];
    $t.find('tr').each((__, tr) => {
      const rowCells = $(tr).find('td').map((___, td) => $(td).text().trim()).get();
      if (rowCells.length > 0) {
        rows.push(rowCells);
      }
    });
    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows: rows.slice(0, 30) });
    }
  });

  // 6. Images Extraction
  const images: ImageData[] = [];
  const imageAltText: string[] = [];
  $('img').each((_, imgEl) => {
    const $img = $(imgEl);
    const src = $img.attr('src') || $img.attr('data-src') || '';
    const alt = $img.attr('alt') || '';
    if (src) {
      const normalizedSrc = normalizeUrl(src, url) || src;
      images.push({
        src: normalizedSrc,
        alt: alt.trim(),
        title: $img.attr('title') || undefined,
        width: $img.attr('width') || undefined,
        height: $img.attr('height') || undefined,
      });
      if (alt.trim()) {
        imageAltText.push(alt.trim());
      }
    }
  });

  // 7. Video Extraction
  const videos: string[] = [];
  $('video source, video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="player"]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const norm = normalizeUrl(src, url) || src;
      videos.push(norm);
    }
  });

  // 8. JSON-LD / Structured Data Extraction
  const structuredData: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text().trim());
      structuredData.push(json);
    } catch {
      // Ignore JSON parse errors
    }
  });

  // 9. OpenGraph & Meta Data
  const metadata: Record<string, any> = {
    ogTitle: $('meta[property="og:title"]').attr('content'),
    ogDescription: $('meta[property="og:description"]').attr('content'),
    ogImage: $('meta[property="og:image"]').attr('content'),
    ogType: $('meta[property="og:type"]').attr('content'),
    ogUrl: $('meta[property="og:url"]').attr('content'),
    twitterCard: $('meta[name="twitter:card"]').attr('content'),
    twitterTitle: $('meta[name="twitter:title"]').attr('content'),
    author: $('meta[name="author"]').attr('content') || $('[rel="author"]').text().trim(),
    publishedTime: $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || $('time').text().trim(),
    language: $('html').attr('lang') || 'en',
  };

  // 10. Clean Main Readable Text
  const $clone = cheerio.load(html);
  $clone('script, style, noscript, nav, footer, header, svg, iframe, form').remove();
  const mainContent = $clone('main, article, #content, .content, [role="main"]').first().text().replace(/\s+/g, ' ').trim();
  const bodyContent = $clone('body').text().replace(/\s+/g, ' ').trim();
  const content = mainContent.length > 50 ? mainContent : bodyContent;
  const contentSnippet = content.slice(0, 350);

  // 11. Full Markdown representation
  let markdown = '';
  try {
    markdown = turndown.turndown(html).slice(0, 8000);
  } catch {
    markdown = content;
  }

  // 12. Page Type Classification
  const pageType = classifyPageType(url, $);

  const result: CrawledPageData = {
    _id: `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    _url: url,
    requestedUrl: url,
    finalUrl: finalUrl || url,
    _depth: depth,
    _status: status,
    _responseTimeMs: responseTimeMs,
    _parentUrl: parentUrl,
    title,
    metaDescription,
    canonicalUrl,
    pageType,
    h1,
    headings,
    content,
    contentSnippet,
    paragraphs,
    lists,
    tables,
    links: [],
    images: images.slice(0, 30),
    imageAltText: imageAltText.slice(0, 30),
    videos: videos.slice(0, 10),
    structuredData,
    metadata,
    internalLinksCount: 0,
    externalLinksCount: 0,
    imagesCount: images.length,
    markdownSnippet: markdown.slice(0, 500),
    markdown,
    uiElements,
    _timestamp: new Date().toISOString(),
  };

  // Apply custom selector rules if provided
  if (selectorRules && selectorRules.length > 0) {
    selectorRules.forEach((rule) => {
      const $el = $(rule.selector);
      if (rule.type === 'attr' && rule.attributeName) {
        result[rule.name] = $el.attr(rule.attributeName) || 'N/A';
      } else if (rule.type === 'html') {
        result[rule.name] = $el.html() || 'N/A';
      } else if (rule.type === 'all') {
        result[rule.name] = $el.map((_, e) => $(e).text().trim()).get().join(' | ');
      } else {
        result[rule.name] = $el.first().text().trim() || 'N/A';
      }
    });
  }

  return result;
}

/**
 * Generate a hierarchical WebsiteTreeNode structure from flat crawled pages
 */
export function generateWebsiteTree(pages: CrawledPageData[], rootDomain: string): WebsiteTreeNode {
  const rootNode: WebsiteTreeNode = {
    id: 'node_root',
    name: rootDomain || 'Website Root',
    path: '/',
    url: pages[0]?._url || `https://${rootDomain}`,
    depth: 0,
    status: pages[0]?._status || 200,
    pageType: 'homepage',
    title: pages[0]?.title || rootDomain,
    children: [],
    internalLinksCount: pages[0]?.internalLinksCount || 0,
    externalLinksCount: pages[0]?.externalLinksCount || 0,
    headingsCount: (pages[0]?.headings?.h1?.length || 0) + (pages[0]?.headings?.h2?.length || 0),
  };

  const pathMap = new Map<string, WebsiteTreeNode>();
  pathMap.set('/', rootNode);

  // Sort pages by depth then path length
  const sortedPages = [...pages].sort((a, b) => a._depth - b._depth);

  for (const page of sortedPages) {
    try {
      const parsed = new URL(page._url);
      const pathname = parsed.pathname || '/';
      if (pathname === '/' || pathname === '') {
        rootNode.title = page.title;
        rootNode.pageType = page.pageType;
        rootNode.status = page._status;
        continue;
      }

      const segments = pathname.split('/').filter(Boolean);
      let currentPath = '';
      let parentNode = rootNode;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        currentPath += `/${seg}`;
        const isLeaf = i === segments.length - 1;

        let existingChild = parentNode.children.find((c) => c.path === currentPath);
        if (!existingChild) {
          const newNode: WebsiteTreeNode = {
            id: `node_${currentPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: seg,
            path: currentPath,
            url: isLeaf ? page._url : `${parsed.origin}${currentPath}`,
            depth: i + 1,
            status: isLeaf ? page._status : 200,
            pageType: isLeaf ? page.pageType : 'category',
            title: isLeaf ? page.title : seg.charAt(0).toUpperCase() + seg.slice(1),
            children: [],
            internalLinksCount: isLeaf ? page.internalLinksCount : undefined,
            externalLinksCount: isLeaf ? page.externalLinksCount : undefined,
            headingsCount: isLeaf ? (page.headings?.h1?.length || 0) + (page.headings?.h2?.length || 0) : undefined,
          };
          parentNode.children.push(newNode);
          parentNode = newNode;
        } else {
          if (isLeaf) {
            existingChild.url = page._url;
            existingChild.title = page.title;
            existingChild.pageType = page.pageType;
            existingChild.status = page._status;
            existingChild.internalLinksCount = page.internalLinksCount;
            existingChild.externalLinksCount = page.externalLinksCount;
            existingChild.headingsCount = (page.headings?.h1?.length || 0) + (page.headings?.h2?.length || 0);
          }
          parentNode = existingChild;
        }
      }
    } catch {
      // Ignore node build errors
    }
  }

  return rootNode;
}

/**
 * Mock Multi-Page Fixture Generator for testing complete website recursive crawls
 */
export function getMockPageHtml(pathname: string): { html: string; status: number; title: string } {
  const cleanPath = pathname.toLowerCase();

  // 1. Robots.txt
  if (cleanPath === '/robots.txt') {
    return {
      status: 200,
      title: 'Robots.txt',
      html: `User-agent: *\nDisallow: /admin\nDisallow: /checkout\nDisallow: /private\nSitemap: https://mock.scrapling.local/sitemap.xml\nSitemap: https://mock.scrapling.local/sitemap-products.xml`,
    };
  }

  // 2. Sitemap.xml
  if (cleanPath === '/sitemap.xml' || cleanPath === '/sitemap_index.xml') {
    return {
      status: 200,
      title: 'Sitemap XML',
      html: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://mock.scrapling.local/ecommerce</loc><priority>1.0</priority></url>
  <url><loc>https://mock.scrapling.local/category/laptops</loc><priority>0.9</priority></url>
  <url><loc>https://mock.scrapling.local/category/audio</loc><priority>0.9</priority></url>
  <url><loc>https://mock.scrapling.local/category/smart-home</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/product/ultrabook-pro-16</loc><priority>0.9</priority></url>
  <url><loc>https://mock.scrapling.local/product/acoustic-shield</loc><priority>0.9</priority></url>
  <url><loc>https://mock.scrapling.local/product/quantum-rgb-keyboard</loc><priority>0.9</priority></url>
  <url><loc>https://mock.scrapling.local/product/smart-vision-4k</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/services</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/services/cloud-scraping</loc><priority>0.7</priority></url>
  <url><loc>https://mock.scrapling.local/services/adaptive-extraction</loc><priority>0.7</priority></url>
  <url><loc>https://mock.scrapling.local/blog</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/blog/future-of-crawling</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/blog/anti-bot-fingerprinting</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/docs</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/docs/getting-started</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/docs/selectors-guide</loc><priority>0.7</priority></url>
  <url><loc>https://mock.scrapling.local/pricing</loc><priority>0.8</priority></url>
  <url><loc>https://mock.scrapling.local/about</loc><priority>0.6</priority></url>
  <url><loc>https://mock.scrapling.local/contact</loc><priority>0.6</priority></url>
  <url><loc>https://mock.scrapling.local/faq</loc><priority>0.6</priority></url>
  <url><loc>https://mock.scrapling.local/quotes</loc><priority>0.7</priority></url>
</urlset>`,
    };
  }

  // 3. Homepage (Ecommerce store)
  if (cleanPath === '/ecommerce' || cleanPath === '/' || cleanPath === '') {
    return {
      status: 200,
      title: 'Nexus Gear - Enterprise Developer Equipment & Smart Hardware',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Nexus Gear - Enterprise Developer Equipment & Smart Hardware</title>
  <meta name="description" content="Discover high-performance workstations, ANC studio headphones, and adaptive smart devices designed for engineers.">
  <meta property="og:title" content="Nexus Gear - Flagship Hardware Store">
  <meta property="og:description" content="Curated hardware for software engineers and computational researchers.">
  <meta property="og:type" content="website">
  <link rel="canonical" href="https://mock.scrapling.local/ecommerce">
</head>
<body>
  <header>
    <nav class="main-navigation">
      <a href="/ecommerce">Home</a> |
      <a href="/category/laptops">Laptops</a> |
      <a href="/category/audio">Audio</a> |
      <a href="/category/smart-home">Smart Home</a> |
      <a href="/services">Services</a> |
      <a href="/blog">Blog</a> |
      <a href="/docs">Docs</a> |
      <a href="/pricing">Pricing</a> |
      <a href="/about">About</a> |
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <h1>Nexus Gear Flagship Hardware Store</h1>
    <p>We build mission-critical hardware and computing rigs engineered for uncompromising performance and developer throughput.</p>
    
    <section class="featured-categories">
      <h2>Featured Categories</h2>
      <ul>
        <li><a href="/category/laptops">Developer Laptops &amp; Mobile Workstations</a></li>
        <li><a href="/category/audio">ANC Studio Headphones &amp; Microphones</a></li>
        <li><a href="/category/smart-home">Automated Smart Home &amp; IoT Hardware</a></li>
      </ul>
    </section>

    <section class="featured-products">
      <h2>Top Trending Hardware</h2>
      <div class="product-cards">
        <article class="product-item">
          <h3><a href="/product/ultrabook-pro-16">UltraBook Pro 16 (M3 Max, 32GB RAM)</a></h3>
          <p class="price">$1,999.00</p>
          <a href="/product/ultrabook-pro-16">Explore Full Specifications &rarr;</a>
        </article>
        <article class="product-item">
          <h3><a href="/product/acoustic-shield">AcousticShield ANC Wireless Headphones</a></h3>
          <p class="price">$299.99</p>
          <a href="/product/acoustic-shield">Explore Acoustic Profile &rarr;</a>
        </article>
        <article class="product-item">
          <h3><a href="/product/quantum-rgb-keyboard">Quantum RGB Mechanical Keyboard</a></h3>
          <p class="price">$179.00</p>
          <a href="/product/quantum-rgb-keyboard">View Switches &rarr;</a>
        </article>
      </div>
    </section>

    <section class="quote-feed">
      <h2>Daily Engineering Wisdom</h2>
      <p>Curated insights from pioneering computer scientists.</p>
      <a href="/quotes">Browse Quotes Directory &rarr;</a>
    </section>
  </main>

  <footer>
    <nav class="footer-links">
      <a href="/about">About Us</a> |
      <a href="/services">Our Services</a> |
      <a href="/blog">Engineering Blog</a> |
      <a href="/docs">Documentation</a> |
      <a href="/pricing">Plans &amp; Pricing</a> |
      <a href="/contact">Support</a> |
      <a href="/faq">FAQ</a>
    </nav>
    <p>&copy; 2026 Nexus Gear Inc. All rights reserved.</p>
  </footer>
</body>
</html>`,
    };
  }

  // 4. Categories
  if (cleanPath.startsWith('/category/laptops')) {
    return {
      status: 200,
      title: 'High-Performance Developer Laptops - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Developer Laptops & Mobile Workstations - Nexus Gear</title>
  <meta name="description" content="Explore cutting-edge M3 Max laptops with high refresh Liquid Retina displays and all-day battery life.">
  <link rel="canonical" href="https://mock.scrapling.local/category/laptops">
</head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/laptops">Laptops</a></nav>
  <main>
    <h1>High Performance Laptops & Mobile Workstations</h1>
    <p>Our curated selection of developer laptops built for extreme throughput and AI model training.</p>
    <div class="products-grid">
      <article class="product-card">
        <h2><a href="/product/ultrabook-pro-16">UltraBook Pro 16 (M3 Max, 32GB RAM)</a></h2>
        <p class="price">$1,999.00</p>
        <p>16-core CPU, 40-core GPU, 1TB NVMe SSD.</p>
        <a href="/product/ultrabook-pro-16">View Details</a>
      </article>
    </div>
  </main>
  <footer>
    <a href="/category/audio">Explore Audio Gear</a> | <a href="/category/smart-home">Smart Home</a> | <a href="/about">About Nexus Gear</a>
  </footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/category/audio')) {
    return {
      status: 200,
      title: 'Studio & ANC Audio Hardware - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Studio Headphones & Audio Gear - Nexus Gear</title></head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/audio">Audio</a></nav>
  <main>
    <h1>Acoustic Precision Audio Devices</h1>
    <div class="products-list">
      <article class="product-card">
        <h2><a href="/product/acoustic-shield">AcousticShield ANC Wireless Headphones</a></h2>
        <p class="price">$299.99</p>
        <a href="/product/acoustic-shield">View Specifications</a>
      </article>
    </div>
  </main>
  <footer><a href="/category/laptops">Laptops</a> | <a href="/faq">FAQ</a> | <a href="/contact">Support</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/category/smart-home')) {
    return {
      status: 200,
      title: 'Smart Home & Vision Automation - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Smart Home & IoT Devices - Nexus Gear</title></head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/smart-home">Smart Home</a></nav>
  <main>
    <h1>Next-Gen Home & Office Automation</h1>
    <article class="product-card">
      <h2><a href="/product/smart-vision-4k">SmartVision 4K AI Hub</a></h2>
      <p class="price">$249.00</p>
      <a href="/product/smart-vision-4k">View Details</a>
    </article>
  </main>
  <footer><a href="/category/laptops">Laptops</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  // 5. Product Detail Pages
  if (cleanPath.startsWith('/product/ultrabook-pro-16')) {
    return {
      status: 200,
      title: 'UltraBook Pro 16 Flagship - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>UltraBook Pro 16 (M3 Max, 32GB RAM, 1TB SSD) - Nexus Gear</title>
  <meta name="description" content="Buy UltraBook Pro 16 with 16-core CPU, 40-core GPU, Liquid Retina XDR display.">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "UltraBook Pro 16",
    "image": "https://mock.scrapling.local/images/ultrabook.jpg",
    "description": "High-performance developer laptop with M3 Max silicon.",
    "brand": { "@type": "Brand", "name": "Nexus Gear" },
    "offers": { "@type": "Offer", "priceCurrency": "USD", "price": "1999.00", "availability": "https://schema.org/InStock" }
  }
  </script>
</head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/laptops">Laptops</a> &gt; UltraBook Pro 16</nav>
  <main>
    <h1>UltraBook Pro 16 (M3 Max, 32GB RAM, 1TB SSD)</h1>
    <div class="rating">★★★★★ (142 verified customer reviews)</div>
    <div class="pricing"><span class="price-current">$1,999.00</span> <span class="price-old">$2,499.00</span></div>
    
    <h2>Hardware Specifications</h2>
    <table class="specs-table">
      <thead><tr><th>Component</th><th>Specification</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td>Processor</td><td>16-Core Ultra M3 Max</td><td>12 Performance + 4 Efficiency cores</td></tr>
        <tr><td>Memory</td><td>32GB Unified LPDDR5X</td><td>400 GB/s bandwidth</td></tr>
        <tr><td>Storage</td><td>1TB PCIe 4.0 NVMe SSD</td><td>7,400 MB/s sequential read</td></tr>
        <tr><td>Battery</td><td>99.6 Wh Lithium-Polymer</td><td>Up to 22 hours continuous work</td></tr>
      </tbody>
    </table>

    <div class="related-products">
      <h3>Frequently Bought Together</h3>
      <a href="/product/acoustic-shield">AcousticShield Headphones</a> |
      <a href="/product/quantum-rgb-keyboard">Quantum RGB Keyboard</a>
    </div>
  </main>
  <footer>
    <a href="/about">About Us</a> | <a href="/contact">Support</a> | <a href="/faq">Return Policy</a>
  </footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/product/acoustic-shield')) {
    return {
      status: 200,
      title: 'AcousticShield ANC Wireless Headphones - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>AcousticShield ANC Headphones - Nexus Gear</title></head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/audio">Audio</a> &gt; AcousticShield</nav>
  <main>
    <h1>AcousticShield Active Noise Cancelling Headphones</h1>
    <p class="price">$299.99</p>
    <p>Engineered with custom 40mm titanium drivers and real-time environment adaptive cancellation.</p>
  </main>
  <footer><a href="/product/ultrabook-pro-16">Matching Laptop</a> | <a href="/ecommerce">Store</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/product/quantum-rgb-keyboard')) {
    return {
      status: 200,
      title: 'Quantum RGB Mechanical Keyboard - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Quantum RGB Mechanical Keyboard - Nexus Gear</title></head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; Accessories &gt; Quantum RGB</nav>
  <main>
    <h1>Quantum RGB Mechanical Keyboard</h1>
    <p class="price">$179.00</p>
    <p>Hot-swappable optical switches with per-key RGB backlighting and CNC aluminum chassis.</p>
  </main>
  <footer><a href="/ecommerce">Store</a> | <a href="/faq">FAQ</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/product/smart-vision-4k')) {
    return {
      status: 200,
      title: 'SmartVision 4K AI Hub - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>SmartVision 4K Hub - Nexus Gear</title></head>
<body>
  <nav class="breadcrumbs"><a href="/ecommerce">Home</a> &gt; <a href="/category/smart-home">Smart Home</a> &gt; SmartVision</nav>
  <main>
    <h1>SmartVision 4K AI Hub</h1>
    <p class="price">$249.00</p>
    <p>Edge neural processing for home security and workspace monitoring.</p>
  </main>
  <footer><a href="/category/smart-home">Smart Home Category</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  // 6. Services Hierarchy
  if (cleanPath === '/services') {
    return {
      status: 200,
      title: 'Enterprise Engineering Services - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Enterprise Services - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/services">Services</a></nav>
  <main>
    <h1>Enterprise Cloud &amp; AI Data Services</h1>
    <p>We help high-scale teams crawl, parse, and analyze millions of unstructured web assets effortlessly.</p>
    <ul>
      <li><a href="/services/cloud-scraping">High-Scale Cloud Scraping Architecture</a></li>
      <li><a href="/services/adaptive-extraction">Adaptive AI Extraction &amp; Self-Healing Parsers</a></li>
    </ul>
  </main>
  <footer><a href="/pricing">View Service Pricing</a> | <a href="/contact">Get in Touch</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/services/cloud-scraping')) {
    return {
      status: 200,
      title: 'Cloud Scraping Infrastructure - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Cloud Scraping Infrastructure - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/services">Services</a> &gt; Cloud Scraping</nav>
  <main>
    <h1>Distributed Cloud Scraping Pipelines</h1>
    <p>Scalable worker pools with residential proxy mesh and dynamic fingerprint rotation.</p>
  </main>
  <footer><a href="/services/adaptive-extraction">Adaptive Extraction</a> | <a href="/services">All Services</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/services/adaptive-extraction')) {
    return {
      status: 200,
      title: 'Adaptive AI Extraction - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Adaptive AI Extraction - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/services">Services</a> &gt; Adaptive Extraction</nav>
  <main>
    <h1>Self-Healing DOM Fingerprinting</h1>
    <p>Our machine-learning heuristics automatically relocate broken selectors when class names change.</p>
  </main>
  <footer><a href="/docs/selectors-guide">Read Selectors Guide</a> | <a href="/services">All Services</a></footer>
</body>
</html>`,
    };
  }

  // 7. Blog & Articles Hierarchy
  if (cleanPath === '/blog') {
    return {
      status: 200,
      title: 'Engineering & Crawling Research Blog - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Nexus Gear Engineering Blog</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/blog">Blog</a></nav>
  <main>
    <h1>Nexus Gear Engineering Research</h1>
    <article class="post-card">
      <h2><a href="/blog/future-of-crawling">The Future of Web Crawling: Autonomous Resilient Spiders</a></h2>
      <time datetime="2026-08-25">August 25, 2026</time>
      <p>How AI-driven element fingerprinters and JA4 TLS emulation redefine automated data acquisition.</p>
      <a href="/blog/future-of-crawling">Read Full Article &rarr;</a>
    </article>
    <article class="post-card">
      <h2><a href="/blog/anti-bot-fingerprinting">Demystifying Modern Anti-Bot Systems &amp; Fingerprints</a></h2>
      <time datetime="2026-08-18">August 18, 2026</time>
      <p>An in-depth breakdown of Canvas, WebGL, AudioContext, and HTTP/2 protocol signatures.</p>
      <a href="/blog/anti-bot-fingerprinting">Read Full Article &rarr;</a>
    </article>
  </main>
  <footer><a href="/docs">Technical Docs</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/blog/future-of-crawling')) {
    return {
      status: 200,
      title: 'The Future of Web Crawling - Nexus Gear Blog',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>The Future of Web Crawling: Autonomous Resilient Spiders</title>
  <meta name="description" content="Explore how recursive graph traversal and adaptive selectors are transforming modern web scrapers.">
  <meta property="og:type" content="article">
</head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/blog">Blog</a> &gt; Future of Crawling</nav>
  <article>
    <h1>The Future of Web Crawling: Autonomous Resilient Spiders</h1>
    <p class="author">By Dr. Elena Vance | Senior Distributed Systems Architect</p>
    <p>Traditional scrapers relied on brittle CSS paths that broke on the slightest frontend update. Modern spiders combine AST token matching with deep visual similarity heuristics.</p>
    <h2>Key Architectural Pillars</h2>
    <ul>
      <li>Recursive breadth-first and depth-first asynchronous queues</li>
      <li>Automatic sitemap and robots.txt evaluation</li>
      <li>DOM tree fingerprinting and adaptive relocation</li>
    </ul>
  </article>
  <footer><a href="/blog/anti-bot-fingerprinting">Next Post: Anti-Bot Fingerprinting</a> | <a href="/blog">All Posts</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/blog/anti-bot-fingerprinting')) {
    return {
      status: 200,
      title: 'Demystifying Modern Anti-Bot Systems - Nexus Gear Blog',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Demystifying Modern Anti-Bot Systems & Fingerprints</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/blog">Blog</a> &gt; Anti-Bot Systems</nav>
  <article>
    <h1>Demystifying Modern Anti-Bot Systems &amp; Fingerprints</h1>
    <p>Modern security suites inspect browser execution environments at the kernel and WebGL level. Stealth scrapers emulate true human user-agent profiles with exact cipher suites.</p>
  </article>
  <footer><a href="/docs/getting-started">Learn How to Configure Stealth Mode</a> | <a href="/blog">All Posts</a></footer>
</body>
</html>`,
    };
  }

  // 8. Documentation Hierarchy
  if (cleanPath === '/docs') {
    return {
      status: 200,
      title: 'Developer Documentation & SDK - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Nexus Gear Documentation Hub</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/docs">Docs</a></nav>
  <main>
    <h1>Documentation &amp; Guides</h1>
    <ul>
      <li><a href="/docs/getting-started">Quick Start: Building Your First Spider</a></li>
      <li><a href="/docs/selectors-guide">Mastering Scrapling Query Selectors &amp; Adaptivity</a></li>
    </ul>
  </main>
  <footer><a href="/ecommerce">Home</a> | <a href="/pricing">Pricing</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/docs/getting-started')) {
    return {
      status: 200,
      title: 'Quick Start Guide - Nexus Gear Docs',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Getting Started with Scrapling Spider</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/docs">Docs</a> &gt; Getting Started</nav>
  <main>
    <h1>Getting Started with Scrapling Spider</h1>
    <p>Initialize a high-throughput crawler with a single seed URL and watch it recursively map the entire domain hierarchy.</p>
    <pre><code>from scrapling.spider import Spider\nspider = Spider(start_urls=['https://example.com'], max_pages=100)\nspider.crawl()</code></pre>
  </main>
  <footer><a href="/docs/selectors-guide">Next: Selectors Guide &rarr;</a> | <a href="/docs">Docs Hub</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/docs/selectors-guide')) {
    return {
      status: 200,
      title: 'Selectors Guide - Nexus Gear Docs',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Selectors & Adaptive Extraction Guide</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/docs">Docs</a> &gt; Selectors Guide</nav>
  <main>
    <h1>Mastering Scrapling Selectors</h1>
    <p>Learn how to use CSS, XPath, and Text selectors with built-in text and attribute extractors like <code>::text</code> and <code>::attr(href)</code>.</p>
  </main>
  <footer><a href="/docs">Docs Hub</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  // 9. Pricing, About, Contact, FAQ
  if (cleanPath.startsWith('/pricing')) {
    return {
      status: 200,
      title: 'Transparent Plans & Enterprise Pricing - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Pricing & Plans - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; Pricing</nav>
  <main>
    <h1>Simple, Predictable Infrastructure Pricing</h1>
    <table class="pricing-table">
      <thead><tr><th>Plan</th><th>Monthly Price</th><th>Concurrency</th><th>Proxy Mesh</th></tr></thead>
      <tbody>
        <tr><td>Developer</td><td>$49/mo</td><td>5 Workers</td><td>Datacenter</td></tr>
        <tr><td>Scale</td><td>$199/mo</td><td>25 Workers</td><td>Residential Mesh</td></tr>
        <tr><td>Enterprise</td><td>Custom</td><td>Unlimited</td><td>Dedicated VIP</td></tr>
      </tbody>
    </table>
  </main>
  <footer><a href="/contact">Contact Sales</a> | <a href="/about">About Us</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/about')) {
    return {
      status: 200,
      title: 'About Nexus Gear & Engineering Team',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>About Us - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; About</nav>
  <main>
    <h1>About Nexus Gear</h1>
    <p>We craft high-performance hardware and developer tools designed for computational excellence.</p>
  </main>
  <footer><a href="/contact">Contact</a> | <a href="/faq">FAQ</a> | <a href="/ecommerce">Store</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/contact')) {
    return {
      status: 200,
      title: 'Contact Support & Enterprise Sales - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Contact Us - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; Contact</nav>
  <main>
    <h1>Contact Nexus Gear Support &amp; Sales</h1>
    <p>Email: support@mock.scrapling.local | Tel: +1 (800) 555-GEAR</p>
  </main>
  <footer><a href="/faq">Frequently Asked Questions</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/faq')) {
    return {
      status: 200,
      title: 'Frequently Asked Questions - Nexus Gear',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>FAQ - Nexus Gear</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; FAQ</nav>
  <main>
    <h1>Frequently Asked Questions</h1>
    <h3>How does recursive website crawling work?</h3>
    <p>The spider extracts all internal navigation links, category routes, product pages, and pagination parameters, then continuously processes them until the entire domain is archived.</p>
  </main>
  <footer><a href="/about">About</a> | <a href="/contact">Contact Support</a></footer>
</body>
</html>`,
    };
  }

  // 10. Quotes with Pagination (/quotes, /quotes/page/2, /quotes/page/3)
  if (cleanPath === '/quotes' || cleanPath === '/quotes/' || cleanPath.startsWith('/quotes/page/1')) {
    return {
      status: 200,
      title: 'Quotes to Inspire Developers - Page 1',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Quotes to Inspire - Page 1</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/quotes">Quotes</a></nav>
  <main>
    <h1>Inspirational Quotes - Page 1</h1>
    <div class="quote-card">
      <p class="quote-text">“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”</p>
      <p class="quote-author">By <a href="/author/albert-einstein">Albert Einstein</a></p>
    </div>
    <nav class="pagination" aria-label="Quotes Pagination">
      <span class="current">Page 1</span> |
      <a href="/quotes/page/2" class="next" rel="next">Page 2 &rarr;</a> |
      <a href="/quotes/page/3">Page 3</a>
    </nav>
  </main>
  <footer><a href="/author/albert-einstein">Albert Einstein Bio</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/quotes/page/2')) {
    return {
      status: 200,
      title: 'Quotes to Inspire Developers - Page 2',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Quotes to Inspire - Page 2</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/quotes">Quotes</a> &gt; Page 2</nav>
  <main>
    <h1>Inspirational Quotes - Page 2</h1>
    <div class="quote-card">
      <p class="quote-text">“The only true wisdom is in knowing you know nothing.”</p>
      <p class="quote-author">By <a href="/author/Socrates">Socrates</a></p>
    </div>
    <nav class="pagination">
      <a href="/quotes/page/1" rel="prev">&larr; Page 1</a> |
      <span class="current">Page 2</span> |
      <a href="/quotes/page/3" class="next" rel="next">Page 3 &rarr;</a>
    </nav>
  </main>
  <footer><a href="/quotes">All Quotes</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/quotes/page/3')) {
    return {
      status: 200,
      title: 'Quotes to Inspire Developers - Page 3',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Quotes to Inspire - Page 3</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/quotes">Quotes</a> &gt; Page 3</nav>
  <main>
    <h1>Inspirational Quotes - Page 3</h1>
    <div class="quote-card">
      <p class="quote-text">“To live is the rarest thing in the world. Most people exist, that is all.”</p>
      <p class="quote-author">By <a href="/author/Oscar-Wilde">Oscar Wilde</a></p>
    </div>
    <nav class="pagination">
      <a href="/quotes/page/2" rel="prev">&larr; Page 2</a> |
      <span class="current">Page 3</span>
    </nav>
  </main>
  <footer><a href="/quotes">Back to Page 1</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/author/albert-einstein')) {
    return {
      status: 200,
      title: 'Albert Einstein - Author Biography',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Albert Einstein Biography & Quotes</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/quotes">Quotes</a> &gt; Albert Einstein</nav>
  <main>
    <h1>Albert Einstein</h1>
    <p>Theoretical physicist who revolutionized modern understanding of space, time, gravity, and the universe.</p>
  </main>
  <footer><a href="/quotes">Quotes Directory</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  if (cleanPath.startsWith('/author/socrates')) {
    return {
      status: 200,
      title: 'Socrates - Classical Greek Philosopher',
      html: `<!DOCTYPE html>
<html lang="en">
<head><title>Socrates Biography</title></head>
<body>
  <nav><a href="/ecommerce">Home</a> &gt; <a href="/quotes">Quotes</a> &gt; Socrates</nav>
  <main>
    <h1>Socrates</h1>
    <p>Classical Greek philosopher credited as one of the founders of Western philosophy.</p>
  </main>
  <footer><a href="/quotes/page/2">Quotes Page 2</a> | <a href="/ecommerce">Home</a></footer>
</body>
</html>`,
    };
  }

  // 11. Fallback 404
  return {
    status: 404,
    title: '404 Page Not Found',
    html: `<!DOCTYPE html><html lang="en"><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested route does not exist.</p><a href="/ecommerce">Return to Home</a></body></html>`,
  };
}

export interface FetchSinglePageOptions {
  timeout?: number;
  stealth?: boolean;
  enableJavascript?: boolean;
  forceBrowser?: boolean;
  userAgent?: string;
  context?: BrowserContext;
}

export interface FetchPageResult {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  html: string;
  responseTimeMs: number;
  contentLength: number;
  isChallenge?: boolean;
  isCaptcha?: boolean;
  isJsRendered?: boolean;
  challengeReason?: string;
  engine?: string;
  retriesUsed?: number;
}

/**
 * Fetch a single page (with Mock testbed support, Fast HTTP mode, and automatic Playwright Browser Render Mode)
 */
export async function fetchSinglePage(
  targetUrl: string,
  options: FetchSinglePageOptions = {}
): Promise<FetchPageResult> {
  const startTime = Date.now();

  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();

    // Check Mock testbed domain
    if (host === 'mock.scrapling.local' || host.endsWith('.scrapling.local')) {
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 60));
      const mock = getMockPageHtml(parsed.pathname);
      return {
        url: targetUrl,
        finalUrl: targetUrl,
        status: mock.status,
        statusText: mock.status === 200 ? 'OK' : 'Not Found',
        html: mock.html,
        responseTimeMs: Date.now() - startTime,
        contentLength: Buffer.byteLength(mock.html, 'utf-8'),
        engine: 'Mock Scrapling Engine',
      };
    }

    // SSRF Check for real internet URLs
    const ssrfCheck = isSafeTargetUrl(targetUrl);
    if (!ssrfCheck.safe) {
      throw new Error(ssrfCheck.reason || 'Blocked URL for security reasons');
    }

    // Direct Browser Render mode if explicitly requested
    if (options.forceBrowser && options.enableJavascript !== false) {
      try {
        const browserRes = await renderWithBrowser(targetUrl, {
          timeout: options.timeout || 20000,
          stealthMode: options.stealth !== false,
          userAgent: options.userAgent,
          context: options.context,
        });

        if (browserRes.isCaptcha) {
          return {
            url: targetUrl,
            finalUrl: browserRes.finalUrl,
            status: 403,
            statusText: 'Blocked: Anti-Bot / CAPTCHA Challenge',
            html: '',
            responseTimeMs: browserRes.responseTimeMs,
            contentLength: 0,
            isChallenge: true,
            isCaptcha: true,
            challengeReason: browserRes.challengeReason,
            engine: 'Playwright Chromium',
          };
        }

        return {
          url: targetUrl,
          finalUrl: browserRes.finalUrl,
          status: browserRes.status,
          statusText: browserRes.statusText,
          html: browserRes.html,
          responseTimeMs: browserRes.responseTimeMs,
          contentLength: browserRes.contentLength,
          isJsRendered: true,
          engine: 'Playwright Chromium',
        };
      } catch (browserErr: any) {
        // Fall back to HTTP if browser launch had unexpected error
      }
    }

    // Fast HTTP (Axios) Request
    const headers: Record<string, string> = {
      'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Not/A)Brand";v="99", "Chromium";v="133", "Google Chrome";v="133"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await axios.get(targetUrl, {
      headers,
      timeout: options.timeout || 15000,
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on 4xx/5xx so crawler handles them gracefully
    });

    const finalUrl = (response.request as any)?.res?.responseUrl || targetUrl;
    const rawHtml = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    // Challenge & Placeholder Inspection on Fast HTTP Response
    const challengeCheck = detectChallengeOrPlaceholder(rawHtml, response.status);

    // 1. Explicit Anti-Bot / CAPTCHA challenge (Do not attempt to bypass, mark as blocked)
    if (challengeCheck.isCaptcha) {
      return {
        url: targetUrl,
        finalUrl,
        status: 403,
        statusText: 'Blocked: Anti-Bot / CAPTCHA Challenge',
        html: '',
        responseTimeMs: Date.now() - startTime,
        contentLength: 0,
        isChallenge: true,
        isCaptcha: true,
        challengeReason: challengeCheck.reason,
        engine: 'Fast HTTP (Blocked by Challenge)',
      };
    }

    // 2. JavaScript execution required OR Unhydrated SPA container detected
    const needsBrowser = challengeCheck.isJsRequired || requiresBrowserRendering(rawHtml);
    if (needsBrowser && options.enableJavascript !== false) {
      try {
        const browserRes = await renderWithBrowser(targetUrl, {
          timeout: options.timeout || 20000,
          stealthMode: options.stealth !== false,
          userAgent: options.userAgent,
          context: options.context,
        });

        if (browserRes.isCaptcha) {
          return {
            url: targetUrl,
            finalUrl: browserRes.finalUrl,
            status: 403,
            statusText: 'Blocked: Anti-Bot / CAPTCHA Challenge',
            html: '',
            responseTimeMs: browserRes.responseTimeMs,
            contentLength: 0,
            isChallenge: true,
            isCaptcha: true,
            challengeReason: browserRes.challengeReason,
            engine: 'Playwright Chromium (Blocked)',
          };
        }

        return {
          url: targetUrl,
          finalUrl: browserRes.finalUrl,
          status: browserRes.status,
          statusText: browserRes.statusText,
          html: browserRes.html,
          responseTimeMs: browserRes.responseTimeMs,
          contentLength: browserRes.contentLength,
          isJsRendered: true,
          engine: 'Playwright Chromium',
        };
      } catch (browserErr: any) {
        // If browser rendering failed, return HTTP response with note
      }
    }

    return {
      url: targetUrl,
      finalUrl,
      status: response.status,
      statusText: response.statusText,
      html: rawHtml,
      responseTimeMs: Date.now() - startTime,
      contentLength: Buffer.byteLength(rawHtml, 'utf-8'),
      engine: 'Fast HTTP (Axios)',
    };
  } catch (err: any) {
    return {
      url: targetUrl,
      finalUrl: targetUrl,
      status: err.response?.status || 500,
      statusText: err.message || 'Request Failed',
      html: '',
      responseTimeMs: Date.now() - startTime,
      contentLength: 0,
      engine: 'Fast HTTP (Error)',
    };
  }
}

/**
 * Fetch a page with configurable retries and exponential backoff
 */
export async function fetchWithRetry(
  targetUrl: string,
  options: FetchSinglePageOptions = {},
  retryCount: number = 2,
  baseDelayMs: number = 300
): Promise<FetchPageResult> {
  let attempt = 0;
  let lastResult: FetchPageResult | null = null;

  while (attempt <= retryCount) {
    lastResult = await fetchSinglePage(targetUrl, options);

    // If explicit challenge / CAPTCHA detected, do NOT retry wastefully; return immediately
    if (lastResult.isCaptcha || lastResult.isChallenge) {
      return { ...lastResult, retriesUsed: attempt };
    }

    // If success or a permanent 404 / 401, don't retry wastefully
    if (lastResult.status === 200 || (lastResult.status >= 200 && lastResult.status < 400)) {
      return { ...lastResult, retriesUsed: attempt };
    }

    if (lastResult.status === 404 || lastResult.status === 401) {
      return { ...lastResult, retriesUsed: attempt };
    }

    // On 429, 500, 502, 503, 504 or network error, retry with backoff
    attempt++;
    if (attempt <= retryCount) {
      const backoffMs = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  return { ...(lastResult as FetchPageResult), retriesUsed: attempt - 1 };
}

export interface RobotsRuleGroup {
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay?: number;
}

export interface ParsedRobotsTxt {
  groups: RobotsRuleGroup[];
  sitemaps: string[];
  host?: string;
  commentsCount: number;
}

/**
 * Parse Robots.txt content into structured groups and directives
 */
export function parseRobotsTxt(rawContent: string): ParsedRobotsTxt {
  const lines = rawContent.split(/\r?\n/);
  const groups: RobotsRuleGroup[] = [];
  const sitemaps: string[] = [];
  let host: string | undefined;
  let commentsCount = 0;

  let currentGroup: RobotsRuleGroup | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      currentGroup = null;
      continue;
    }

    if (line.startsWith('#')) {
      commentsCount++;
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      const ua = value || '*';
      if (!currentGroup || currentGroup.userAgent !== ua) {
        currentGroup = {
          userAgent: ua,
          disallow: [],
          allow: [],
        };
        groups.push(currentGroup);
      }
    } else if (directive === 'disallow') {
      if (!currentGroup) {
        currentGroup = { userAgent: '*', disallow: [], allow: [] };
        groups.push(currentGroup);
      }
      if (value) {
        currentGroup.disallow.push(value);
      }
    } else if (directive === 'allow') {
      if (!currentGroup) {
        currentGroup = { userAgent: '*', disallow: [], allow: [] };
        groups.push(currentGroup);
      }
      if (value) {
        currentGroup.allow.push(value);
      }
    } else if (directive === 'crawl-delay') {
      if (!currentGroup) {
        currentGroup = { userAgent: '*', disallow: [], allow: [] };
        groups.push(currentGroup);
      }
      const delay = parseFloat(value);
      if (!isNaN(delay)) {
        currentGroup.crawlDelay = delay;
      }
    } else if (directive === 'sitemap') {
      if (value && !sitemaps.includes(value)) {
        sitemaps.push(value);
      }
    } else if (directive === 'host') {
      host = value;
    }
  }

  if (groups.length === 0) {
    groups.push({ userAgent: '*', disallow: [], allow: ['/'] });
  }

  return { groups, sitemaps, host, commentsCount };
}

/**
 * Check if a path is allowed by robots.txt rules
 */
export function isPathAllowedByRobots(
  path: string,
  targetUserAgent: string = 'Scrapling',
  parsedRobots: ParsedRobotsTxt
): { isAllowed: boolean; matchedRule?: string; matchedUserAgent?: string; reason: string } {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const cleanUA = targetUserAgent.toLowerCase();

  let matchedGroup: RobotsRuleGroup | undefined = parsedRobots.groups.find(
    (g) => g.userAgent.toLowerCase() === cleanUA
  );

  if (!matchedGroup) {
    matchedGroup = parsedRobots.groups.find((g) => g.userAgent === '*');
  }

  if (!matchedGroup) {
    return { isAllowed: true, reason: 'No matching user-agent rule group; allowed by default' };
  }

  let longestMatchLength = -1;
  let ruleDecision = true;
  let matchedPattern = '';

  for (const pattern of matchedGroup.allow) {
    if (pathMatchesRobotsPattern(cleanPath, pattern)) {
      if (pattern.length > longestMatchLength) {
        longestMatchLength = pattern.length;
        ruleDecision = true;
        matchedPattern = `Allow: ${pattern}`;
      }
    }
  }

  for (const pattern of matchedGroup.disallow) {
    if (pathMatchesRobotsPattern(cleanPath, pattern)) {
      if (pattern.length > longestMatchLength) {
        longestMatchLength = pattern.length;
        ruleDecision = false;
        matchedPattern = `Disallow: ${pattern}`;
      }
    }
  }

  if (longestMatchLength === -1) {
    return {
      isAllowed: true,
      matchedUserAgent: matchedGroup.userAgent,
      reason: `No explicit rule matching "${cleanPath}"; allowed by default`,
    };
  }

  return {
    isAllowed: ruleDecision,
    matchedRule: matchedPattern,
    matchedUserAgent: matchedGroup.userAgent,
    reason: ruleDecision
      ? `Path allowed by rule "${matchedPattern}" (User-agent: ${matchedGroup.userAgent})`
      : `Path blocked by rule "${matchedPattern}" (User-agent: ${matchedGroup.userAgent})`,
  };
}

function pathMatchesRobotsPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern === '/') return true;

  let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  regexStr = regexStr.replace(/\*/g, '.*');
  if (regexStr.endsWith('\\$')) {
    regexStr = regexStr.slice(0, -2) + '$';
  } else {
    regexStr = '^' + regexStr;
  }

  try {
    const reg = new RegExp(regexStr);
    return reg.test(path);
  } catch {
    return path.startsWith(pattern);
  }
}

/**
 * Inspect robots.txt on a target URL
 */
export async function inspectRobotsTxt(
  targetUrl: string,
  userAgent: string = 'Scrapling',
  testPath: string = '/'
) {
  let origin = '';
  try {
    const parsed = new URL(targetUrl);
    origin = `${parsed.protocol}//${parsed.host}`;
  } catch {
    origin = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  }

  const robotsUrl = `${origin.replace(/\/+$/, '')}/robots.txt`;

  try {
    const pageRes = await fetchSinglePage(robotsUrl, { timeout: 8000 });
    const found = pageRes.status >= 200 && pageRes.status < 400 && Boolean(pageRes.html);
    const raw = found
      ? pageRes.html
      : '# No robots.txt found on server\n# Default crawler behavior: all routes allowed\nUser-agent: *\nAllow: /';
    const parsed = parseRobotsTxt(raw);
    const testResult = isPathAllowedByRobots(testPath, userAgent, parsed);

    return {
      targetUrl,
      robotsUrl,
      status: pageRes.status,
      statusText: pageRes.statusText,
      found,
      rawContent: raw,
      sitemaps: parsed.sitemaps,
      host: parsed.host,
      groups: parsed.groups,
      commentsCount: parsed.commentsCount,
      testResult,
    };
  } catch (err: any) {
    const fallbackRaw = '# Failed to fetch robots.txt (Connection / Network error)\nUser-agent: *\nAllow: /';
    const parsed = parseRobotsTxt(fallbackRaw);
    return {
      targetUrl,
      robotsUrl,
      status: 404,
      statusText: err.message || 'Not Found',
      found: false,
      rawContent: fallbackRaw,
      sitemaps: [],
      groups: parsed.groups,
      commentsCount: 0,
      testResult: isPathAllowedByRobots(testPath, userAgent, parsed),
      error: err.message,
    };
  }
}

/**
 * Discover Robots.txt and Sitemap.xml URLs for a domain
 */
export async function discoverRobotsAndSitemaps(
  baseOrigin: string,
  baseDomain: string
): Promise<{ sitemapUrls: string[]; parsedRobots?: ParsedRobotsTxt }> {
  const sitemapUrls: string[] = [];
  let parsedRobots: ParsedRobotsTxt | undefined;

  // 1. Try robots.txt
  try {
    const robotsUrl = `${baseOrigin}/robots.txt`;
    const robotsRes = await fetchSinglePage(robotsUrl, { timeout: 6000 });
    if (robotsRes.status === 200 && robotsRes.html) {
      parsedRobots = parseRobotsTxt(robotsRes.html);
      for (const sitemap of parsedRobots.sitemaps) {
        const norm = normalizeUrl(sitemap);
        if (norm && isSameWebsite(norm, baseDomain)) {
          sitemapUrls.push(norm);
        }
      }
    }
  } catch {
    // Ignore robots.txt errors
  }

  // 2. Default sitemap locations fallback
  if (sitemapUrls.length === 0) {
    sitemapUrls.push(`${baseOrigin}/sitemap.xml`);
    sitemapUrls.push(`${baseOrigin}/sitemap_index.xml`);
  }

  return { sitemapUrls, parsedRobots };
}

/**
 * Parse Sitemap XML content to extract <loc> URLs (handles both URL sets and sitemap indexes)
 */
export async function parseSitemapXml(sitemapUrl: string, baseDomain: string): Promise<string[]> {
  const foundUrls: string[] = [];
  try {
    const res = await fetchSinglePage(sitemapUrl, { timeout: 8000 });
    if (res.status === 200 && res.html) {
      const $ = cheerio.load(res.html, { xmlMode: true });

      // Handle <url><loc>...</loc></url>
      $('url > loc').each((_, el) => {
        const locText = $(el).text().trim();
        const normalized = normalizeUrl(locText);
        if (normalized && isSameWebsite(normalized, baseDomain)) {
          foundUrls.push(normalized);
        }
      });

      // Handle <sitemap><loc>...</loc></sitemap> (sitemap index nested sitemaps)
      $('sitemap > loc').each((_, el) => {
        const locText = $(el).text().trim();
        const normalized = normalizeUrl(locText);
        if (normalized && isSameWebsite(normalized, baseDomain)) {
          foundUrls.push(normalized);
        }
      });
    }
  } catch {
    // Ignore sitemap parse failures
  }
  return foundUrls;
}

/**
 * RECURSIVE FULL-WEBSITE CRAWLER ENGINE
 * Automatically discovers, normalizes, deduplicates, and recursively traverses internal pages.
 */
export async function startFullWebsiteCrawl(config: {
  id?: string;
  name?: string;
  startUrls: string[];
  allowedDomains?: string[];
  maxRequests?: number;
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  delayMs?: number;
  requestTimeout?: number;
  timeout?: number;
  retryCount?: number;
  sameDomainOnly?: boolean;
  includeSubdomains?: boolean;
  respectRobotsTxt?: boolean;
  includeQueryParameters?: boolean;
  excludePatterns?: string[];
  includePatterns?: string[];
  stealthMode?: boolean;
  enableJavascript?: boolean;
  selectorRules?: Array<{ name: string; selector: string; type?: string; attributeName?: string }>;
  template?: string;
  fixtures?: Record<string, any>;
}): Promise<SpiderSessionState> {
  const spiderId = config.id || `spider_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const name = config.name || 'FullWebsiteCrawler';
  const startUrls = (config.startUrls || []).map((u) => u.trim()).filter(Boolean);
  const maxPages = Math.max(1, Math.min(config.maxPages || config.maxRequests || 200, 1000));
  const maxDepth = Math.max(0, config.maxDepth ?? 10);
  const concurrency = Math.max(1, Math.min(config.concurrency || 3, 10));
  const delayMs = Math.max(0, config.delayMs ?? 200);
  const requestTimeout = config.requestTimeout || config.timeout || 15000;
  const retryCount = Math.max(0, Math.min(config.retryCount ?? 2, 5));
  const sameDomainOnly = config.sameDomainOnly !== false;
  const includeSubdomains = config.includeSubdomains === true;
  const respectRobotsTxt = config.respectRobotsTxt !== false;
  const includeQueryParameters = config.includeQueryParameters !== false;
  const excludePatterns = config.excludePatterns || [];
  const includePatterns = config.includePatterns || [];
  const stealthMode = config.stealthMode !== false;
  const enableJavascript = config.enableJavascript !== false;

  if (startUrls.length === 0) {
    throw new Error('At least one starting seed URL is required');
  }

  // Derive initial base domain from the first seed URL
  let baseDomain = '';
  let baseOrigin = '';
  try {
    const u = new URL(startUrls[0]);
    baseDomain = u.hostname;
    baseOrigin = u.origin;
  } catch {
    baseDomain = 'example.com';
    baseOrigin = 'https://example.com';
  }

  const allowedDomains = config.allowedDomains && config.allowedDomains.length > 0
    ? config.allowedDomains
    : [baseDomain];

  const abortController = new AbortController();

  const session: SpiderSessionState = {
    id: spiderId,
    name,
    status: 'starting',
    startUrls,
    allowedDomains,
    maxRequests: maxPages,
    maxPages,
    maxDepth,
    concurrency,
    delayMs,
    retryCount,
    sameDomainOnly,
    includeSubdomains,
    respectRobotsTxt,
    includeQueryParameters,
    excludePatterns,
    includePatterns,
    enableJavascript,
    stealthMode,
    requestsCompleted: 0,
    requestsFailed: 0,
    itemsExtracted: 0,
    queueRemaining: startUrls.length,
    pagesDiscovered: startUrls.length,
    pagesQueued: startUrls.length,
    pagesScraped: 0,
    currentUrl: startUrls[0],
    crawlDepth: 0,
    crawlPercentage: 0,
    avgLatencyMs: 0,
    bytesReceived: 0,
    startedAt: new Date().toISOString(),
    logs: [],
    items: [],
    abortController,
  };

  spiderSessions.set(spiderId, session);

  const addLog = (level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG', message: string, url?: string) => {
    session.logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      url,
      message,
    });
    if (session.logs.length > 600) {
      session.logs.shift();
    }
  };

  // Launch asynchronous crawler execution loop
  (async () => {
    addLog('INFO', `Initializing Full-Website Crawler "${name}" with ${startUrls.length} seed URL(s)`);
    addLog('INFO', `Limits: maxPages=${maxPages}, maxDepth=${maxDepth}, concurrency=${concurrency}, delay=${delayMs}ms, retries=${retryCount}`);
    addLog('INFO', `Domain Scope: ${sameDomainOnly ? 'Same-domain only' : 'Multi-domain'} | Subdomains: ${includeSubdomains ? 'ALLOWED' : 'STRICT ROOT'} | Base: "${baseDomain}"`);
    addLog('INFO', `Robots.txt Safety: ${respectRobotsTxt ? 'ACTIVE (Respecting disallow rules)' : 'BYPASS (Ignored)'}`);

    session.status = 'discovering';

    // Queue item: { url, depth, parentUrl }
    const queue: Array<{ url: string; depth: number; parentUrl?: string }> = [];
    const enqueuedSet = new Set<string>();
    const visitedSet = new Set<string>();
    const failedSet = new Set<string>();
    const canonicalMap = new Map<string, string>(); // canonical -> original

    let parsedRobots: ParsedRobotsTxt | undefined;

    // 1. Enqueue seed URLs
    for (const seed of startUrls) {
      const normalized = normalizeUrl(seed, undefined, { includeQueryParameters });
      if (normalized && !enqueuedSet.has(normalized)) {
        enqueuedSet.add(normalized);
        queue.push({ url: normalized, depth: 0 });
      }
    }

    // 2. Discover Sitemap.xml & Robots.txt
    try {
      addLog('INFO', `Inspecting robots.txt and XML sitemaps at ${baseOrigin}...`);
      const { sitemapUrls, parsedRobots: robots } = await discoverRobotsAndSitemaps(baseOrigin, baseDomain);
      parsedRobots = robots;

      for (const sitemapUrl of sitemapUrls) {
        if (abortController.signal.aborted) break;
        const discoveredSitemapUrls = await parseSitemapXml(sitemapUrl, baseDomain);
        if (discoveredSitemapUrls.length > 0) {
          addLog('INFO', `Discovered ${discoveredSitemapUrls.length} internal URL(s) from sitemap: ${sitemapUrl}`);
          for (const sUrl of discoveredSitemapUrls) {
            if (!enqueuedSet.has(sUrl) && enqueuedSet.size < maxPages * 2) {
              enqueuedSet.add(sUrl);
              queue.push({ url: sUrl, depth: 1, parentUrl: sitemapUrl });
            }
          }
        }
      }
    } catch (e: any) {
      addLog('WARN', `Sitemap notice: ${e.message}`);
    }

    session.status = 'crawling';
    session.pagesDiscovered = enqueuedSet.size;
    session.pagesQueued = queue.length;

    let totalLatency = 0;
    let completedCount = 0;
    let sessionBrowserContext: BrowserContext | null = null;

    if (enableJavascript) {
      try {
        const browser = await getPlaywrightBrowser();
        sessionBrowserContext = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          viewport: { width: 1280, height: 800 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
        });
      } catch (ctxErr: any) {
        addLog('DEBUG', `Browser context initialization note: ${ctxErr.message}`);
      }
    }

    // Asynchronous Worker Loop
    const runWorker = async (workerId: number) => {
      while (
        queue.length > 0 &&
        visitedSet.size < maxPages &&
        !abortController.signal.aborted
      ) {
        const item = queue.shift();
        if (!item) break;

        const { url: currentUrl, depth: currentDepth, parentUrl } = item;

        // Skip if already visited
        if (visitedSet.has(currentUrl)) {
          continue;
        }

        // Apply robots.txt compliance check if enabled
        if (respectRobotsTxt && parsedRobots) {
          try {
            const parsedPath = new URL(currentUrl).pathname;
            const check = isPathAllowedByRobots(parsedPath, 'Scrapling', parsedRobots);
            if (!check.isAllowed) {
              addLog('DEBUG', `Skipped ${currentUrl} (Blocked by robots.txt directive: ${check.matchedRule})`, currentUrl);
              continue;
            }
          } catch {
            // Ignore path parse error
          }
        }

        visitedSet.add(currentUrl);
        session.currentUrl = currentUrl;
        session.crawlDepth = currentDepth;
        session.queueRemaining = queue.length;
        session.pagesQueued = queue.length;

        // Apply rate limit / download delay
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }

        if (abortController.signal.aborted) break;

        try {
          // Fetch the page with retry & exponential backoff
          const fetchRes = await fetchWithRetry(
            currentUrl,
            {
              timeout: requestTimeout,
              stealth: stealthMode,
              enableJavascript,
              context: sessionBrowserContext || undefined,
            },
            retryCount,
            delayMs
          );

          session.bytesReceived += fetchRes.contentLength;
          completedCount++;
          totalLatency += fetchRes.responseTimeMs;
          session.avgLatencyMs = Math.round(totalLatency / completedCount);
          session.requestsCompleted = completedCount;

          // Check if page was blocked by challenge or CAPTCHA
          if (fetchRes.isCaptcha || fetchRes.isChallenge) {
            session.requestsFailed++;
            failedSet.add(currentUrl);
            addLog(
              'WARN',
              `[Blocked/Challenge] ${fetchRes.challengeReason || 'Anti-bot verification required'} on ${currentUrl}. Skipping placeholder response.`,
              currentUrl
            );
            continue;
          }

          if (fetchRes.status >= 200 && fetchRes.status < 400 && fetchRes.html) {
            if (fetchRes.isJsRendered) {
              addLog(
                'INFO',
                `[Browser Render Mode] [${fetchRes.status}] (Depth ${currentDepth}, ${fetchRes.responseTimeMs}ms, JS Hydrated) -> ${currentUrl}`,
                currentUrl
              );
            } else {
              addLog(
                'INFO',
                `[Fast HTTP] [${fetchRes.status}] (Depth ${currentDepth}, ${fetchRes.responseTimeMs}ms) -> ${currentUrl}`,
                currentUrl
              );
            }

            // Extract rich structured page content
            const pageData = extractPageContent(
              fetchRes.html,
              currentUrl,
              currentDepth,
              fetchRes.status,
              fetchRes.responseTimeMs,
              parentUrl,
              config.selectorRules,
              fetchRes.finalUrl
            );

            // Check canonical duplicate
            if (pageData.canonicalUrl && pageData.canonicalUrl !== currentUrl) {
              const canonNorm = normalizeUrl(pageData.canonicalUrl, undefined, { includeQueryParameters });
              if (canonNorm && canonNorm !== currentUrl) {
                canonicalMap.set(currentUrl, canonNorm);
              }
            }

            // Extract internal links, pagination, category links, menus
            const { internalLinks, externalLinks, paginationLinks } = extractLinksFromHtml(
              fetchRes.html,
              currentUrl,
              baseDomain,
              allowedDomains,
              {
                sameDomainOnly,
                includeSubdomains,
                includePatterns,
                excludePatterns,
                includeQueryParameters,
              }
            );

            pageData.links = internalLinks.slice(0, 50);
            pageData.internalLinksCount = internalLinks.length;
            pageData.externalLinksCount = externalLinks.length;

            session.items.push(pageData);
            session.itemsExtracted = session.items.length;
            session.pagesScraped = session.items.length;

            // Enqueue newly discovered internal links recursively
            let newLinksEnqueued = 0;
            if (currentDepth + 1 <= maxDepth && visitedSet.size + queue.length < maxPages * 3) {
              for (const linkObj of internalLinks) {
                const targetLink = linkObj.url;
                if (!visitedSet.has(targetLink) && !enqueuedSet.has(targetLink)) {
                  enqueuedSet.add(targetLink);
                  queue.push({
                    url: targetLink,
                    depth: currentDepth + 1,
                    parentUrl: currentUrl,
                  });
                  newLinksEnqueued++;
                }
              }
            }

            session.pagesDiscovered = enqueuedSet.size;
            session.pagesQueued = queue.length;
            session.crawlPercentage = Math.min(100, Math.round((visitedSet.size / Math.min(maxPages, Math.max(enqueuedSet.size, 1))) * 100));

            if (newLinksEnqueued > 0) {
              addLog('DEBUG', `Discovered ${newLinksEnqueued} new internal link(s) on ${currentUrl} (Queue: ${queue.length})`, currentUrl);
            }
          } else {
            session.requestsFailed++;
            failedSet.add(currentUrl);
            addLog('WARN', `HTTP ${fetchRes.status} (${fetchRes.statusText}) on ${currentUrl} after ${fetchRes.retriesUsed} retries`, currentUrl);
          }
        } catch (err: any) {
          session.requestsFailed++;
          failedSet.add(currentUrl);
          addLog('ERROR', `Failed to crawl ${currentUrl}: ${err.message}`, currentUrl);
        }
      }
    };

    try {
      // Spawn concurrent worker pool
      const activeWorkers = Array.from({ length: concurrency }, (_, i) => runWorker(i + 1));
      await Promise.all(activeWorkers);
    } finally {
      if (sessionBrowserContext) {
        try {
          await sessionBrowserContext.close();
        } catch {
          // Ignore context close error
        }
      }
    }

    session.finishedAt = new Date().toISOString();
    session.queueRemaining = 0;

    // Generate hierarchical website tree
    session.websiteTree = generateWebsiteTree(session.items, baseDomain);

    if (abortController.signal.aborted) {
      session.status = 'cancelled';
      addLog('WARN', `Crawl job was cancelled by user. Preserved ${session.items.length} scraped page(s).`);
    } else {
      session.status = 'completed';
      session.crawlPercentage = 100;
      addLog('SUCCESS', `Full-website crawl completed! Visited ${visitedSet.size} page(s), extracted ${session.items.length} dataset item(s). Failed: ${session.requestsFailed}`);
    }
  })().catch((err) => {
    session.status = 'failed';
    session.finishedAt = new Date().toISOString();
    addLog('ERROR', `Fatal crawler crash: ${err.message}`);
  });

  return session;
}

/**
 * Scrape the Full UI across all connected screens and routes of a website.
 * Recursively traverses internal navigation, extracting rich UI components for each screen.
 */
export async function scrapeFullWebsiteUi(
  targetUrl: string,
  options: {
    maxScreens?: number;
    maxDepth?: number;
    timeout?: number;
    enableJavascript?: boolean;
    stealth?: boolean;
    userAgent?: string;
  } = {}
): Promise<FullUiScrapeResult> {
  const maxScreens = Math.min(Math.max(options.maxScreens || 10, 2), 25);
  const maxDepth = Math.min(Math.max(options.maxDepth || 2, 1), 4);
  const timeout = options.timeout || 12000;
  const enableJavascript = options.enableJavascript ?? true;
  const stealth = options.stealth ?? true;

  const normalizedStartUrl = normalizeUrl(targetUrl) || targetUrl;
  let baseDomain = 'mock.scrapling.local';
  try {
    baseDomain = new URL(normalizedStartUrl).hostname;
  } catch {
    // fallback
  }

  const screens: ScrapedScreenData[] = [];
  const visitedUrls = new Set<string>();
  const queue: Array<{ url: string; depth: number; parentUrl?: string }> = [
    { url: normalizedStartUrl, depth: 0 },
  ];

  let sessionBrowserContext: BrowserContext | null = null;
  if (enableJavascript && !normalizedStartUrl.includes('.scrapling.local')) {
    try {
      const browser = await getPlaywrightBrowser();
      sessionBrowserContext = await browser.newContext({
        userAgent:
          options.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
    } catch {
      // Ignore browser context failure
    }
  }

  try {
    while (queue.length > 0 && screens.length < maxScreens) {
      const current = queue.shift();
      if (!current) break;

      const normUrl = normalizeUrl(current.url) || current.url;
      if (visitedUrls.has(normUrl)) continue;
      visitedUrls.add(normUrl);

      let fetchRes: FetchPageResult;
      try {
        fetchRes = await fetchSinglePage(normUrl, {
          timeout,
          enableJavascript,
          stealth,
          userAgent: options.userAgent,
          context: sessionBrowserContext || undefined,
        });
      } catch {
        continue;
      }

      if (fetchRes.isCaptcha || fetchRes.isChallenge) {
        continue;
      }

      if (fetchRes.status >= 200 && fetchRes.status < 400 && fetchRes.html) {
        const $ = cheerio.load(fetchRes.html);
        const title = $('title').first().text().trim() || $('h1').first().text().trim() || normUrl;
        const pageType = classifyPageType(normUrl, $);
        const uiElements = extractScreenUiComponents($, normUrl);

        let markdown = '';
        try {
          markdown = turndown.turndown(fetchRes.html).slice(0, 8000);
        } catch {
          markdown = $('body').text().replace(/\s+/g, ' ').slice(0, 2000);
        }

        let pathname = '/';
        try {
          pathname = new URL(normUrl).pathname || '/';
        } catch {
          pathname = normUrl;
        }

        const { internalLinks } = extractLinksFromHtml(fetchRes.html, normUrl, baseDomain);

        const screenData: ScrapedScreenData = {
          screenId: `screen_${screens.length + 1}`,
          url: normUrl,
          path: pathname,
          title,
          depth: current.depth,
          status: fetchRes.status,
          responseTimeMs: fetchRes.responseTimeMs,
          html: fetchRes.html,
          markdown,
          pageType,
          uiElements,
          discoveredLinksCount: internalLinks.length,
          engine: fetchRes.engine,
        };

        screens.push(screenData);

        // Queue internal links discovered on this screen if depth permits
        if (current.depth < maxDepth && screens.length + queue.length < maxScreens * 2) {
          for (const link of internalLinks) {
            const linkUrl = normalizeUrl(link.url);
            if (
              linkUrl &&
              !visitedUrls.has(linkUrl) &&
              !queue.some((q) => q.url === linkUrl)
            ) {
              queue.push({
                url: linkUrl,
                depth: current.depth + 1,
                parentUrl: normUrl,
              });
            }
          }
        }
      }
    }
  } finally {
    if (sessionBrowserContext) {
      try {
        await sessionBrowserContext.close();
      } catch {
        // ignore
      }
    }
  }

  // Aggregate Site-Wide Full UI Inventory
  const allNavLinksMap = new Map<string, { text: string; href: string; foundOnScreen: string }>();
  const allButtonsMap = new Map<string, { text: string; foundOnScreen: string }>();
  const allFormsList: Array<{ action?: string; inputsCount: number; foundOnScreen: string }> = [];

  for (const s of screens) {
    for (const nav of s.uiElements.navigation) {
      const key = `${nav.text}::${nav.href}`;
      if (!allNavLinksMap.has(key)) {
        allNavLinksMap.set(key, { text: nav.text, href: nav.href, foundOnScreen: s.title });
      }
    }
    for (const btn of s.uiElements.actionButtons) {
      if (!allButtonsMap.has(btn.text)) {
        allButtonsMap.set(btn.text, { text: btn.text, foundOnScreen: s.title });
      }
    }
    for (const form of s.uiElements.forms) {
      allFormsList.push({
        action: form.action || s.path,
        inputsCount: form.inputs.length,
        foundOnScreen: s.title,
      });
    }
  }

  // Generate Consolidated Full UI Markdown
  let consolidatedMarkdown = `# Full Website UI Scraping Report\n\n`;
  consolidatedMarkdown += `- **Target Host**: ${baseDomain}\n`;
  consolidatedMarkdown += `- **Entry URL**: ${normalizedStartUrl}\n`;
  consolidatedMarkdown += `- **Total Screens Scraped**: ${screens.length}\n`;
  consolidatedMarkdown += `- **Total Discovered Nav Links**: ${allNavLinksMap.size}\n`;
  consolidatedMarkdown += `- **Total Action Buttons / CTAs**: ${allButtonsMap.size}\n`;
  consolidatedMarkdown += `- **Scraped At**: ${new Date().toISOString()}\n\n`;
  consolidatedMarkdown += `---\n\n`;

  screens.forEach((s, idx) => {
    consolidatedMarkdown += `## Screen ${idx + 1}: ${s.title}\n\n`;
    consolidatedMarkdown += `- **Route**: \`${s.path}\`\n`;
    consolidatedMarkdown += `- **URL**: ${s.url}\n`;
    consolidatedMarkdown += `- **Status**: ${s.status} (${s.responseTimeMs}ms)\n`;
    consolidatedMarkdown += `- **Depth**: ${s.depth}\n`;
    consolidatedMarkdown += `- **Interactive Controls**: ${s.uiElements.interactiveControlsCount}\n\n`;

    if (s.uiElements.navigation.length > 0) {
      consolidatedMarkdown += `### Screen Navigation Menus\n`;
      s.uiElements.navigation.forEach((n) => {
        consolidatedMarkdown += `- [${n.text}](${n.href})\n`;
      });
      consolidatedMarkdown += `\n`;
    }

    if (s.uiElements.actionButtons.length > 0) {
      consolidatedMarkdown += `### Action Buttons & CTAs\n`;
      s.uiElements.actionButtons.forEach((b) => {
        consolidatedMarkdown += `- \`${b.text}\`${b.disabled ? ' (Disabled)' : ''}\n`;
      });
      consolidatedMarkdown += `\n`;
    }

    if (s.uiElements.forms.length > 0) {
      consolidatedMarkdown += `### Forms & Input Fields\n`;
      s.uiElements.forms.forEach((f, fIdx) => {
        consolidatedMarkdown += `Form #${fIdx + 1} (${f.method} ${f.action || ''}):\n`;
        f.inputs.forEach((inp) => {
          consolidatedMarkdown += `  - Input: \`${inp.name || 'unnamed'}\` [${inp.type || 'text'}] ${inp.placeholder ? `placeholder: "${inp.placeholder}"` : ''}\n`;
        });
      });
      consolidatedMarkdown += `\n`;
    }

    consolidatedMarkdown += `### Screen Content\n\n${s.markdown}\n\n---\n\n`;
  });

  return {
    targetUrl: normalizedStartUrl,
    baseDomain,
    totalScreensScraped: screens.length,
    screens,
    fullUiInventory: {
      allNavLinks: Array.from(allNavLinksMap.values()),
      allActionButtons: Array.from(allButtonsMap.values()),
      allForms: allFormsList,
      totalScreens: screens.length,
    },
    consolidatedMarkdown,
    timestamp: new Date().toISOString(),
  };
}

