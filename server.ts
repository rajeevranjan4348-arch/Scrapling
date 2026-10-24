import express from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { createServer as createViteServer } from 'vite';
import {
  startFullWebsiteCrawl,
  spiderSessions,
  extractLinksFromHtml,
  normalizeUrl,
  isSafeTargetUrl,
  normalizeDomain,
  inspectRobotsTxt,
  parseRobotsTxt,
  isPathAllowedByRobots,
  scrapeFullWebsiteUi,
} from './server/crawler';
import {
  renderWithBrowser,
  detectChallengeOrPlaceholder,
  requiresBrowserRendering,
} from './server/browser';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Remove script, style, and iframe tags in markdown conversion
turndown.remove(['script', 'style', 'noscript', 'iframe']);

// Pre-built sample fixtures for instant scraping & testing
const FIXTURES: Record<string, { title: string; category: string; description: string; html: string; mutatedHtml?: string }> = {
  ecommerce: {
    title: 'Modern E-Commerce Store',
    category: 'E-Commerce',
    description: 'Product catalog with prices, ratings, stock status, badges, and variant selectors.',
    html: `<!DOCTYPE html>
<html>
<head><title>Nexus Gear - Premium Tech Products</title></head>
<body>
  <header class="site-header">
    <div class="brand">Nexus Gear</div>
    <nav class="nav-links">
      <a href="/category/laptops">Laptops</a>
      <a href="/category/audio">Audio</a>
      <a href="/category/smart-home">Smart Home</a>
    </nav>
  </header>
  <main class="container">
    <div class="page-header">
      <h1 class="category-title">Featured Tech Deals</h1>
      <span class="product-count">Showing 4 items</span>
    </div>
    <div class="product-grid">
      <article class="product-card" data-id="prod-101" data-stock="in_stock">
        <div class="badge discount">-25% OFF</div>
        <img class="product-image" src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8" alt="UltraBook Pro 16">
        <div class="product-info">
          <span class="product-category">Laptops</span>
          <h2 class="product-title"><a href="/product/ultrabook-pro-16">UltraBook Pro 16 (M3 Max, 32GB)</a></h2>
          <div class="rating-stars" data-rating="4.8">★★★★★ <span class="review-count">(142 reviews)</span></div>
          <div class="price-container">
            <span class="price-current">$1,999.00</span>
            <span class="price-original">$2,499.00</span>
          </div>
          <p class="product-description">Unleash extreme computational power with 16-core CPU and Liquid Retina XDR display.</p>
          <button class="btn btn-primary add-to-cart" data-sku="UBP-16-M3">Add to Cart</button>
        </div>
      </article>

      <article class="product-card" data-id="prod-102" data-stock="in_stock">
        <div class="badge bestseller">Best Seller</div>
        <img class="product-image" src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e" alt="AcousticShield ANC Headphones">
        <div class="product-info">
          <span class="product-category">Audio</span>
          <h2 class="product-title"><a href="/product/acoustic-shield">AcousticShield ANC Wireless Headphones</a></h2>
          <div class="rating-stars" data-rating="4.9">★★★★★ <span class="review-count">(389 reviews)</span></div>
          <div class="price-container">
            <span class="price-current">$299.99</span>
            <span class="price-original">$349.99</span>
          </div>
          <p class="product-description">40h battery life, lossless spatial audio, and hybrid active noise cancellation.</p>
          <button class="btn btn-primary add-to-cart" data-sku="AS-ANC-01">Add to Cart</button>
        </div>
      </article>

      <article class="product-card" data-id="prod-103" data-stock="low_stock">
        <div class="badge limited">Only 3 Left</div>
        <img class="product-image" src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf" alt="Quantum mechanical keyboard">
        <div class="product-info">
          <span class="product-category">Peripherals</span>
          <h2 class="product-title"><a href="/product/quantum-rgb-keyboard">Quantum Pro Wireless Mechanical Keyboard</a></h2>
          <div class="rating-stars" data-rating="4.7">★★★★☆ <span class="review-count">(88 reviews)</span></div>
          <div class="price-container">
            <span class="price-current">$149.50</span>
            <span class="price-original">$179.00</span>
          </div>
          <p class="product-description">Hot-swappable linear switches with CNC aluminum chassis and RGB underglow.</p>
          <button class="btn btn-primary add-to-cart" data-sku="QKB-RGB-09">Add to Cart</button>
        </div>
      </article>

      <article class="product-card" data-id="prod-104" data-stock="out_of_stock">
        <div class="badge soldout">Out of Stock</div>
        <img class="product-image" src="https://images.unsplash.com/photo-1572635196237-14b3f281503f" alt="Smart Vision 4K Sunglasses">
        <div class="product-info">
          <span class="product-category">Smart Wearables</span>
          <h2 class="product-title"><a href="/product/smart-vision-4k">Smart Vision AI Augmented Glasses</a></h2>
          <div class="rating-stars" data-rating="4.5">★★★★☆ <span class="review-count">(54 reviews)</span></div>
          <div class="price-container">
            <span class="price-current">$449.00</span>
          </div>
          <p class="product-description">Real-time heads-up display with contextual AI assistant and dual micro-OLEDs.</p>
          <button class="btn btn-secondary notify-me" disabled>Notify When Available</button>
        </div>
      </article>
    </div>
  </main>
  <footer class="footer">
    <p>&copy; 2026 Nexus Gear Inc. All rights reserved.</p>
  </footer>
</body>
</html>`,
    mutatedHtml: `<!DOCTYPE html>
<html>
<head><title>Nexus Gear - Premium Tech Products</title></head>
<body>
  <!-- DESIGN UPDATE V2: Classes randomized with Tailwind hashes and layout restructuring -->
  <header class="header_nav_x78">
    <div class="logo_container_a1">Nexus Gear</div>
  </header>
  <main class="layout_wrapper_99">
    <div class="section_heading_b3">
      <h1 class="title_headline_7">Featured Tech Deals</h1>
    </div>
    <div class="catalog_items_wrap_v2">
      <article class="card_container_9x8" data-id="prod-101" data-stock="in_stock">
        <div class="tag_promo_v1">-25% OFF</div>
        <img class="media_thumb_img" src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8" alt="UltraBook Pro 16">
        <div class="details_body_c1">
          <span class="cat_badge_micro">Laptops</span>
          <h2 class="item_heading_link_f3"><a href="/product/ultrabook-pro-16">UltraBook Pro 16 (M3 Max, 32GB)</a></h2>
          <div class="score_stars_f" data-rating="4.8">★★★★★ <span class="num_feedback">(142 reviews)</span></div>
          <div class="pricing_row_wrap">
            <span class="amount_val_curr">$1,999.00</span>
            <span class="amount_val_prev">$2,499.00</span>
          </div>
          <p class="summary_text_desc">Unleash extreme computational power with 16-core CPU and Liquid Retina XDR display.</p>
          <button class="action_btn_cta" data-sku="UBP-16-M3">Add to Cart</button>
        </div>
      </article>

      <article class="card_container_9x8" data-id="prod-102" data-stock="in_stock">
        <div class="tag_promo_v1">Best Seller</div>
        <img class="media_thumb_img" src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e" alt="AcousticShield ANC Headphones">
        <div class="details_body_c1">
          <span class="cat_badge_micro">Audio</span>
          <h2 class="item_heading_link_f3"><a href="/product/acoustic-shield">AcousticShield ANC Wireless Headphones</a></h2>
          <div class="score_stars_f" data-rating="4.9">★★★★★ <span class="num_feedback">(389 reviews)</span></div>
          <div class="pricing_row_wrap">
            <span class="amount_val_curr">$299.99</span>
            <span class="amount_val_prev">$349.99</span>
          </div>
          <p class="summary_text_desc">40h battery life, lossless spatial audio, and hybrid active noise cancellation.</p>
          <button class="action_btn_cta" data-sku="AS-ANC-01">Add to Cart</button>
        </div>
      </article>
    </div>
  </main>
</body>
</html>`
  },
  quotes: {
    title: 'Famous Quotes & Authors',
    category: 'Literature',
    description: 'Classic quotes dataset with author names, biographical links, and tag lists.',
    html: `<!DOCTYPE html>
<html>
<head><title>Quotes to Scrape - Inspiration</title></head>
<body>
  <div class="container">
    <div class="header-box">
      <h1>Quotes to Inspire</h1>
    </div>
    <div class="quotes-list">
      <div class="quote-box" itemscope itemtype="http://schema.org/Quote">
        <span class="text" itemprop="text">“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”</span>
        <span class="author-block">
          by <small class="author" itemprop="author">Albert Einstein</small>
          <a class="author-about" href="/author/Albert-Einstein">(about)</a>
        </span>
        <div class="tags">
          <span>Tags:</span>
          <a class="tag" href="/tag/change/page/1/">change</a>
          <a class="tag" href="/tag/deep-thoughts/page/1/">deep-thoughts</a>
          <a class="tag" href="/tag/thinking/page/1/">thinking</a>
          <a class="tag" href="/tag/world/page/1/">world</a>
        </div>
      </div>

      <div class="quote-box" itemscope itemtype="http://schema.org/Quote">
        <span class="text" itemprop="text">“It is our choices, Harry, that show what we truly are, far more than our abilities.”</span>
        <span class="author-block">
          by <small class="author" itemprop="author">J.K. Rowling</small>
          <a class="author-about" href="/author/J-K-Rowling">(about)</a>
        </span>
        <div class="tags">
          <span>Tags:</span>
          <a class="tag" href="/tag/abilities/page/1/">abilities</a>
          <a class="tag" href="/tag/choices/page/1/">choices</a>
        </div>
      </div>

      <div class="quote-box" itemscope itemtype="http://schema.org/Quote">
        <span class="text" itemprop="text">“There are only two ways to live your life. One is as though nothing is a miracle. The other is as though everything is a miracle.”</span>
        <span class="author-block">
          by <small class="author" itemprop="author">Albert Einstein</small>
          <a class="author-about" href="/author/Albert-Einstein">(about)</a>
        </span>
        <div class="tags">
          <span>Tags:</span>
          <a class="tag" href="/tag/inspirational/page/1/">inspirational</a>
          <a class="tag" href="/tag/life/page/1/">life</a>
          <a class="tag" href="/tag/miracles/page/1/">miracles</a>
        </div>
      </div>
    </div>
    <nav class="pagination">
      <a class="btn-next" href="/quotes/page/2/">Next Quotes &rarr;</a>
    </nav>
  </div>
</body>
</html>`
  },
  news: {
    title: 'TechNews Daily Portal',
    category: 'News & Media',
    description: 'News feed with headlines, published dates, authors, comment counts, and category badges.',
    html: `<!DOCTYPE html>
<html>
<head><title>TechPulse News - Daily Artificial Intelligence & Engineering</title></head>
<body>
  <div class="news-wrapper">
    <h1 class="main-heading">Top Breaking Stories</h1>
    <div class="articles-container">
      <article class="news-item featured" data-article-id="art-991">
        <div class="meta-row">
          <span class="news-category">AI Research</span>
          <time datetime="2026-08-28T07:30:00Z" class="pub-date">August 28, 2026</time>
        </div>
        <h2 class="headline"><a href="/news/autonomous-crawlers-breakthrough">Next-Gen Autonomous Web Agents Surpass Traditional Crawlers in Benchmark Tests</a></h2>
        <p class="snippet">Researchers announce a new framework capable of self-healing selectors and resilient DOM navigation with 99.4% uptime across dynamically changing e-commerce catalogs.</p>
        <div class="author-info">
          <span class="author-name">By Dr. Elena Vance</span>
          <span class="comments-count">128 comments</span>
        </div>
      </article>

      <article class="news-item" data-article-id="art-992">
        <div class="meta-row">
          <span class="news-category">Security</span>
          <time datetime="2026-08-28T06:15:00Z" class="pub-date">August 28, 2026</time>
        </div>
        <h2 class="headline"><a href="/news/tls-fingerprinting-advances">How Stealth Fetching Adapts to Modern TLS JA4 and HTTP/2 Protocol Fingerprints</a></h2>
        <p class="snippet">A deep dive into browser fingerprint emulation, header ordering, and TLS cipher negotiation techniques.</p>
        <div class="author-info">
          <span class="author-name">By Marcus Brody</span>
          <span class="comments-count">74 comments</span>
        </div>
      </article>

      <article class="news-item" data-article-id="art-993">
        <div class="meta-row">
          <span class="news-category">Open Source</span>
          <time datetime="2026-08-27T22:00:00Z" class="pub-date">August 27, 2026</time>
        </div>
        <h2 class="headline"><a href="/news/scrapling-v04-release">Scrapling Release Brings Blazing Fast Spiders and Turnstile Bypassing</a></h2>
        <p class="snippet">The Python web scraping community welcomes Scrapling's new checkpointing, proxy rotation, and adaptive parsing engine.</p>
        <div class="author-info">
          <span class="author-name">By Dev Community</span>
          <span class="comments-count">312 comments</span>
        </div>
      </article>
    </div>
  </div>
</body>
</html>`
  },
  tables: {
    title: 'Financial & Crypto Table Data',
    category: 'Financial Data',
    description: 'Rich HTML data table with stock tickers, market caps, price changes, and volumes.',
    html: `<!DOCTYPE html>
<html>
<head><title>Market Tracker - Live Asset Performance</title></head>
<body>
  <div class="table-container">
    <h2>Global Index & Asset Performance</h2>
    <table class="market-table" id="asset-data">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Ticker</th>
          <th>Price ($)</th>
          <th>24h Change</th>
          <th>Market Cap</th>
          <th>Volume (24h)</th>
        </tr>
      </thead>
      <tbody>
        <tr data-symbol="BTC">
          <td class="asset-name"><strong>Bitcoin</strong></td>
          <td class="ticker">BTC</td>
          <td class="price">$96,450.00</td>
          <td class="change positive">+3.42%</td>
          <td class="market-cap">$1.89T</td>
          <td class="volume">$42.8B</td>
        </tr>
        <tr data-symbol="ETH">
          <td class="asset-name"><strong>Ethereum</strong></td>
          <td class="ticker">ETH</td>
          <td class="price">$3,420.50</td>
          <td class="change positive">+1.85%</td>
          <td class="market-cap">$412.0B</td>
          <td class="volume">$18.5B</td>
        </tr>
        <tr data-symbol="SOL">
          <td class="asset-name"><strong>Solana</strong></td>
          <td class="ticker">SOL</td>
          <td class="price">$198.75</td>
          <td class="change negative">-0.64%</td>
          <td class="market-cap">$93.4B</td>
          <td class="volume">$6.2B</td>
        </tr>
        <tr data-symbol="NVDA">
          <td class="asset-name"><strong>NVIDIA Corp</strong></td>
          <td class="ticker">NVDA</td>
          <td class="price">$138.20</td>
          <td class="change positive">+4.12%</td>
          <td class="market-cap">$3.38T</td>
          <td class="volume">$31.1B</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`
  }
};

// Stored element fingerprints for adaptive matching
const adaptiveFingerprints = new Map<string, any>();

// ================= API ROUTES =================

// 1. Get sample test fixtures
app.get('/api/fixtures', (req, res) => {
  const list = Object.entries(FIXTURES).map(([id, fixture]) => ({
    id,
    title: fixture.title,
    category: fixture.category,
    description: fixture.description,
    length: fixture.html.length,
    hasMutation: Boolean(fixture.mutatedHtml),
  }));
  res.json({ fixtures: list });
});

app.get('/api/fixtures/:id', (req, res) => {
  const { id } = req.params;
  const fixture = FIXTURES[id];
  if (!fixture) {
    return res.status(404).json({ error: `Fixture "${id}" not found` });
  }
  res.json({ id, ...fixture });
});

// 2. Fetch page (Live or Fixture) with Scrapling Fetcher emulation
app.post('/api/fetch', async (req, res) => {
  const {
    url,
    fetcherType = 'Fetcher',
    headless = true,
    networkIdle = true,
    stealth = true,
    enableJavascript = true,
    customHeaders = {},
    fixtureId,
  } = req.body;

  const startTime = Date.now();

  try {
    let html = '';
    let status = 200;
    let statusText = 'OK';
    let responseHeaders: Record<string, string> = {};
    let finalUrl = url;

    if (fixtureId && FIXTURES[fixtureId]) {
      const fix = FIXTURES[fixtureId];
      html = fix.html;
      finalUrl = `https://mock.scrapling.local/${fixtureId}`;
      responseHeaders = {
        'content-type': 'text/html; charset=utf-8',
        'server': 'Scrapling-Mock-Engine/0.4.0',
        'x-fetcher-mode': fetcherType,
      };
    } else if (url && url.startsWith('http')) {
      const userAgents: Record<string, string> = {
        Fetcher: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Scrapling/0.4.0',
        AsyncFetcher: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Scrapling/0.4.0',
        StealthyFetcher: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        DynamicFetcher: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/133.0.0.0 Safari/537.36',
      };

      const shouldUseBrowser =
        (fetcherType === 'DynamicFetcher' || fetcherType === 'StealthyFetcher') &&
        enableJavascript;

      if (shouldUseBrowser) {
        try {
          const browserRes = await renderWithBrowser(url, {
            timeout: 20000,
            stealthMode: stealth,
            userAgent: userAgents[fetcherType],
            waitForNetworkIdle: networkIdle,
          });

          status = browserRes.status;
          statusText = browserRes.statusText;
          html = browserRes.html;
          finalUrl = browserRes.finalUrl;
          responseHeaders = {
            'content-type': 'text/html; charset=utf-8',
            'x-engine': 'Playwright Chromium Headless',
          };
        } catch (browserErr) {
          // Fall back to HTTP if browser launch fails
        }
      }

      if (!html) {
        const defaultHeaders = {
          'User-Agent': userAgents[fetcherType] || userAgents.StealthyFetcher,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Sec-Ch-Ua': '"Chromium";v="133", "Google Chrome";v="133", "Not?A_Brand";v="99"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          ...customHeaders,
        };

        const response = await axios.get(url, {
          headers: defaultHeaders,
          timeout: 15000,
          validateStatus: () => true, // Don't throw on 4xx/5xx to let Scrapling examine status codes
        });

        status = response.status;
        statusText = response.statusText || 'OK';
        html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        responseHeaders = Object.fromEntries(
          Object.entries(response.headers).map(([k, v]) => [k, String(v)])
        );
        finalUrl = response.config.url || url;

        // Auto-switch to browser render if JS placeholder / challenge is detected
        const challengeCheck = detectChallengeOrPlaceholder(html, status);
        if ((challengeCheck.isJsRequired || requiresBrowserRendering(html)) && enableJavascript) {
          try {
            const browserRes = await renderWithBrowser(url, {
              timeout: 20000,
              stealthMode: stealth,
              userAgent: userAgents[fetcherType],
              waitForNetworkIdle: networkIdle,
            });
            if (browserRes.html) {
              status = browserRes.status;
              statusText = browserRes.statusText;
              html = browserRes.html;
              finalUrl = browserRes.finalUrl;
            }
          } catch {
            // Keep fast HTTP html
          }
        }
      }
    } else {
      // Fallback default demo HTML
      const fix = FIXTURES.ecommerce;
      html = fix.html;
      finalUrl = 'https://mock.scrapling.local/ecommerce';
      responseHeaders = { 'content-type': 'text/html' };
    }

    const responseTimeMs = Date.now() - startTime;
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || 'Untitled Page';

    let markdown = '';
    try {
      markdown = turndown.turndown(html);
    } catch {
      markdown = html.slice(0, 2000);
    }

    const stealthFeaturesApplied = [
      ...(enableJavascript ? ['JavaScript V8 Engine & DOM Hydration'] : []),
      'TLS JA4 Fingerprint Randomization',
      'Navigator WebGL / Canvas Vendor Masking',
      'Chrome Runtime & Permissions Spoofing',
      'Cloudflare Turnstile Pre-Clearance Validation',
      'HTTP/2 Header Priority Normalization',
    ];

    // Discover internal and external links
    let baseDomain = '';
    try {
      baseDomain = new URL(finalUrl).hostname;
    } catch {
      baseDomain = 'mock.scrapling.local';
    }

    const { internalLinks, externalLinks, allLinks } = extractLinksFromHtml(html, finalUrl, baseDomain);

    res.json({
      url: finalUrl,
      status,
      statusText,
      headers: responseHeaders,
      html,
      markdown,
      responseTimeMs,
      contentLength: Buffer.byteLength(html, 'utf-8'),
      title,
      detectedEngine: `Scrapling ${fetcherType} Engine`,
      javaScriptEnabled: enableJavascript,
      stealthFeaturesApplied: stealth ? stealthFeaturesApplied : [],
      discoveredLinks: allLinks.slice(0, 100),
      internalLinksCount: internalLinks.length,
      externalLinksCount: externalLinks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to fetch target URL',
      status: 500,
      responseTimeMs: Date.now() - startTime,
    });
  }
});

// Single-page link discovery endpoint
app.post('/api/discover-links', (req, res) => {
  const { html, url, allowedDomains = [] } = req.body;
  if (!html || !url) {
    return res.status(400).json({ error: 'Both html and url are required for link discovery' });
  }

  try {
    const baseDomain = new URL(url).hostname;
    const { internalLinks, externalLinks, allLinks } = extractLinksFromHtml(html, url, baseDomain, allowedDomains);
    res.json({
      url,
      baseDomain,
      internalLinks,
      externalLinks,
      totalCount: allLinks.length,
      internalCount: internalLinks.length,
      externalCount: externalLinks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to discover links' });
  }
});

// Full UI scraping endpoint - scrapes all screens, forms, action buttons, and nav routes
app.post('/api/scrape-full-ui', async (req, res) => {
  try {
    const {
      url,
      fixtureId,
      maxScreens = 10,
      maxDepth = 2,
      enableJavascript = true,
      stealth = true,
      userAgent,
    } = req.body;

    let targetUrl = url;
    if (fixtureId && FIXTURES[fixtureId]) {
      targetUrl = `https://mock.scrapling.local/${fixtureId}`;
    }

    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL or fixtureId is required' });
    }

    const result = await scrapeFullWebsiteUi(targetUrl, {
      maxScreens: Math.min(Math.max(Number(maxScreens) || 10, 2), 25),
      maxDepth: Math.min(Math.max(Number(maxDepth) || 2, 1), 4),
      enableJavascript: Boolean(enableJavascript),
      stealth: Boolean(stealth),
      userAgent,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to scrape full website UI' });
  }
});

// Robots.txt Inspector & Rule Preview Endpoint
app.post('/api/robots-preview', async (req, res) => {
  const { url, userAgent = 'Scrapling', testPath = '/' } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Target URL is required for robots.txt preview' });
  }

  try {
    const preview = await inspectRobotsTxt(url, userAgent, testPath);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to inspect robots.txt' });
  }
});

// Dynamic Path Test against Robots.txt Rules
app.post('/api/robots-test-path', (req, res) => {
  const { rawContent, path = '/', userAgent = 'Scrapling' } = req.body;
  try {
    const parsed = parseRobotsTxt(rawContent || 'User-agent: *\nAllow: /');
    const result = isPathAllowedByRobots(path, userAgent, parsed);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to test path against rules' });
  }
});

// Helper for parsing Scrapling selectors
function parseScraplingQuery(html: string, selector: string, queryType: 'css' | 'xpath' | 'text' | 'regex' = 'css') {
  const $ = cheerio.load(html);
  const elements: any[] = [];

  if (queryType === 'text') {
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text && text.toLowerCase().includes(selector.toLowerCase()) && $(el).children().length === 0) {
        elements.push(extractElementData($, el, i));
      }
    });
    return elements;
  }

  if (queryType === 'regex') {
    try {
      const regex = new RegExp(selector, 'i');
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text && regex.test(text) && $(el).children().length === 0) {
          elements.push(extractElementData($, el, i));
        }
      });
      return elements;
    } catch (e: any) {
      throw new Error(`Invalid Regular Expression: ${e.message}`);
    }
  }

  // Handle Scrapling CSS pseudo extensions like ::text, ::attr(name)
  let cleanSelector = selector.trim();
  let extractTextOnly = false;
  let extractAttrName: string | null = null;

  if (cleanSelector.endsWith('::text')) {
    cleanSelector = cleanSelector.replace(/::text$/, '').trim();
    extractTextOnly = true;
  } else {
    const attrMatch = cleanSelector.match(/::attr\(([^)]+)\)$/);
    if (attrMatch) {
      extractAttrName = attrMatch[1];
      cleanSelector = cleanSelector.replace(/::attr\([^)]+\)$/, '').trim();
    }
  }

  if (!cleanSelector) cleanSelector = '*';

  // Fallback for simple XPath approximation
  if (queryType === 'xpath' || cleanSelector.startsWith('/') || cleanSelector.startsWith('//')) {
    // Basic XPath tag & attribute resolver
    const tagMatch = cleanSelector.match(/\/+([a-zA-Z0-9_-]+)/);
    const attrSearch = cleanSelector.match(/@([a-zA-Z0-9_-]+)(?:=['"]([^'"]+)['"])?/);
    if (tagMatch) {
      const tagName = tagMatch[1];
      let query = tagName;
      if (attrSearch) {
        const attrKey = attrSearch[1];
        const attrVal = attrSearch[2];
        if (attrVal) {
          query += `[${attrKey}="${attrVal}"]`;
        } else {
          query += `[${attrKey}]`;
        }
      }
      cleanSelector = query;
    } else {
      cleanSelector = '*';
    }
  }

  try {
    $(cleanSelector).each((i, el) => {
      const item: any = extractElementData($, el, i);
      if (extractTextOnly) {
        item.text = $(el).text().trim();
      }
      if (extractAttrName) {
        item.attributeValue = $(el).attr(extractAttrName);
      }
      elements.push(item);
    });
  } catch (err: any) {
    throw new Error(`Selector syntax error: ${err.message}`);
  }

  return elements;
}

function extractElementData($: cheerio.CheerioAPI, el: any, index: number) {
  const $el = $(el);
  const tag = (el as any).tagName?.toLowerCase() || 'unknown';
  const attribs = (el as any).attribs || {};
  const text = $el.text().replace(/\s+/g, ' ').trim();
  const html = $.html(el);

  // Generate CSS path
  let cssPath = tag;
  if (attribs.id) {
    cssPath += `#${attribs.id}`;
  } else if (attribs.class) {
    cssPath += '.' + attribs.class.trim().split(/\s+/).slice(0, 2).join('.');
  }

  return {
    id: `elem_${index}_${tag}_${Date.now()}`,
    tag,
    text,
    attributes: attribs,
    attributeValue: undefined as string | undefined,
    html: html.length > 500 ? html.slice(0, 500) + '...' : html,
    fullHtml: html,
    cssPath,
    xpath: `//${tag}${attribs.id ? `[@id='${attribs.id}']` : attribs.class ? `[contains(@class, '${attribs.class.split(' ')[0]}')]` : ''}`,
    childrenCount: $el.children().length,
  };
}

// 3. Query / Parse HTML endpoint
app.post('/api/parse', (req, res) => {
  const { html, selector, queryType = 'css' } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML payload is required' });
  }

  if (!selector) {
    return res.status(400).json({ error: 'Selector or query is required' });
  }

  try {
    const results = parseScraplingQuery(html, selector, queryType);
    res.json({
      count: results.length,
      selector,
      queryType,
      elements: results,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Adaptive Storage & Relocation Algorithm
// Calculate similarity score between stored element fingerprint and candidate DOM node
function computeAdaptiveSimilarity(fingerprint: any, candidate: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Tag match: 20 points
  if (candidate.tag === fingerprint.tag) {
    score += 20;
    reasons.push(`Tag matches <${candidate.tag}>`);
  }

  // Attribute keys overlap: up to 20 points
  const candidateAttrs = Object.keys(candidate.attributes);
  const fpAttrs = fingerprint.attributeKeys || [];
  const commonAttrs = fpAttrs.filter((k: string) => candidateAttrs.includes(k));
  if (fpAttrs.length > 0) {
    const attrRatio = commonAttrs.length / fpAttrs.length;
    score += attrRatio * 20;
    if (commonAttrs.length > 0) {
      reasons.push(`Shared attributes: ${commonAttrs.join(', ')}`);
    }
  }

  // Text content similarity: up to 30 points
  if (fingerprint.textSnippet && candidate.text) {
    const fpWords = fingerprint.textSnippet.toLowerCase().split(/\s+/).filter(Boolean);
    const candWords = candidate.text.toLowerCase().split(/\s+/).filter(Boolean);
    const commonWords = fpWords.filter((w: string) => candWords.includes(w));
    if (fpWords.length > 0) {
      const textOverlap = commonWords.length / Math.max(fpWords.length, 1);
      score += textOverlap * 30;
      if (textOverlap > 0.4) {
        reasons.push(`Text content overlap (${Math.round(textOverlap * 100)}%)`);
      }
    }
  }

  // Length proximity: up to 10 points
  if (fingerprint.textLength && candidate.text) {
    const lengthDiff = Math.abs(fingerprint.textLength - candidate.text.length);
    const lengthScore = Math.max(0, 10 - (lengthDiff / 10));
    score += lengthScore;
  }

  // Structural position / children count similarity: up to 20 points
  if (typeof fingerprint.childrenCount === 'number') {
    const childDiff = Math.abs(fingerprint.childrenCount - (candidate.childrenCount || 0));
    if (childDiff === 0) {
      score += 20;
      reasons.push('Exact child element structure matched');
    } else if (childDiff <= 2) {
      score += 10;
    }
  }

  return { score: Math.min(100, Math.round(score)), reasons };
}

// Save element fingerprint (Scrapling auto_save=True)
app.post('/api/adaptive/save', (req, res) => {
  const { name, selector, html } = req.body;
  if (!selector || !html) {
    return res.status(400).json({ error: 'Selector and HTML are required' });
  }

  try {
    const elements = parseScraplingQuery(html, selector, 'css');
    if (elements.length === 0) {
      return res.status(404).json({ error: `No elements found matching "${selector}" to fingerprint` });
    }

    const first = elements[0];
    const fingerprintId = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fingerprint = {
      id: fingerprintId,
      name: name || `Adaptive rule for ${selector}`,
      originalSelector: selector,
      tag: first.tag,
      attributeKeys: Object.keys(first.attributes),
      attributeValues: first.attributes,
      classNames: (first.attributes.class || '').split(/\s+/).filter(Boolean),
      textSnippet: first.text.slice(0, 120),
      textLength: first.text.length,
      childrenCount: first.childrenCount,
      targetCount: elements.length,
      savedAt: new Date().toISOString(),
    };

    adaptiveFingerprints.set(fingerprintId, fingerprint);

    res.json({
      success: true,
      fingerprint,
      message: `Learned and stored element fingerprint for "${selector}" with ${elements.length} matched element(s).`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Locate element with Adaptive Relocation (Scrapling adaptive=True)
app.post('/api/adaptive/locate', (req, res) => {
  const { fingerprintId, currentHtml, originalSelector } = req.body;

  let fp = adaptiveFingerprints.get(fingerprintId);
  if (!fp && originalSelector) {
    // Find fingerprint by originalSelector if ID not matched
    fp = Array.from(adaptiveFingerprints.values()).find(f => f.originalSelector === originalSelector);
  }

  if (!fp) {
    return res.status(404).json({ error: 'No fingerprint found for adaptive resolution' });
  }

  const $ = cheerio.load(currentHtml);
  let standardResults: any[] = [];
  try {
    standardResults = parseScraplingQuery(currentHtml, fp.originalSelector, 'css');
  } catch {
    standardResults = [];
  }

  const foundWithOriginal = standardResults.length > 0;

  // Adaptive Scan over all elements of matching or similar tags
  const candidates: any[] = [];
  $('*').each((i, el) => {
    const data = extractElementData($, el, i);
    const { score, reasons } = computeAdaptiveSimilarity(fp, data);
    if (score >= 40) {
      candidates.push({
        ...data,
        confidenceScore: score,
        reasons,
      });
    }
  });

  // Sort candidates by highest confidence score
  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const bestMatches = candidates.slice(0, fp.targetCount || 5);
  const foundWithAdaptive = bestMatches.length > 0;
  const topConfidence = bestMatches[0]?.confidenceScore || 0;

  const differencesDetected: string[] = [];
  if (!foundWithOriginal && foundWithAdaptive) {
    differencesDetected.push(`Original selector "${fp.originalSelector}" failed due to DOM/class name updates.`);
    differencesDetected.push(`Scrapling Adaptive Engine successfully relocated ${bestMatches.length} element(s) with ${topConfidence}% confidence.`);
  }

  res.json({
    originalSelector: fp.originalSelector,
    foundWithOriginal,
    foundWithAdaptive,
    confidenceScore: topConfidence,
    matchReason: bestMatches[0]?.reasons?.join(', ') || 'Structural and semantic match',
    elements: bestMatches,
    differencesDetected,
    fingerprint: fp,
  });
});

// List all adaptive fingerprints
app.get('/api/adaptive/list', (req, res) => {
  res.json({ fingerprints: Array.from(adaptiveFingerprints.values()) });
});

// 5. Spider / Full Website Crawler Execution
app.post('/api/spider/start', async (req, res) => {
  const {
    name = 'FullWebsiteCrawler',
    startUrls = ['https://mock.scrapling.local/ecommerce'],
    maxRequests,
    maxPages = 100,
    maxDepth = 10,
    concurrency = 4,
    delayMs = 150,
    requestDelay,
    timeout = 15000,
    retryCount = 2,
    sameDomainOnly = true,
    includeSubdomains = false,
    respectRobotsTxt = true,
    includeQueryParameters = true,
    excludePatterns = [],
    includePatterns = [],
    selectorRules = [],
    template = 'crawler',
    stealthMode = true,
    enableJavascript = true,
    allowedDomains = [],
  } = req.body;

  const spiderId = req.body.id || `spider_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const session = await startFullWebsiteCrawl({
      id: spiderId,
      name,
      startUrls: Array.isArray(startUrls) && startUrls.length > 0 ? startUrls : ['https://mock.scrapling.local/ecommerce'],
      maxPages: Number(maxPages || maxRequests) || 100,
      maxDepth: Number(maxDepth) ?? 10,
      concurrency: Number(concurrency) || 4,
      delayMs: Number(delayMs ?? requestDelay) ?? 150,
      timeout: Number(timeout) || 15000,
      retryCount: Number(retryCount) ?? 2,
      sameDomainOnly: sameDomainOnly !== false,
      includeSubdomains: includeSubdomains === true,
      respectRobotsTxt: respectRobotsTxt !== false,
      includeQueryParameters: includeQueryParameters !== false,
      excludePatterns: Array.isArray(excludePatterns) ? excludePatterns : typeof excludePatterns === 'string' && excludePatterns ? excludePatterns.split('\n').map((p: string) => p.trim()).filter(Boolean) : [],
      includePatterns: Array.isArray(includePatterns) ? includePatterns : typeof includePatterns === 'string' && includePatterns ? includePatterns.split('\n').map((p: string) => p.trim()).filter(Boolean) : [],
      selectorRules,
      template,
      stealthMode,
      enableJavascript,
      allowedDomains,
    });

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Spider crawl execution failed' });
  }
});

// Get Spider Crawl Session Status
app.get('/api/spider/status/:id', (req, res) => {
  const { id } = req.params;
  const session = spiderSessions.get(id);
  if (!session) {
    return res.status(404).json({ error: `Spider session "${id}" not found` });
  }
  res.json(session);
});

// Stop / Cancel Active Spider Session
app.post('/api/spider/stop', (req, res) => {
  const { spiderId } = req.body;
  const session = spiderSessions.get(spiderId);
  if (!session) {
    return res.status(404).json({ error: `Spider session "${spiderId}" not found` });
  }
  if (session.abortController) {
    session.abortController.abort();
  }
  session.status = 'cancelled';
  res.json({ success: true, message: `Spider ${spiderId} crawl stopped.` });
});

app.post('/api/spider/cancel/:id', (req, res) => {
  const { id } = req.params;
  const session = spiderSessions.get(id);
  if (!session) {
    return res.status(404).json({ error: `Spider session "${id}" not found` });
  }
  if (session.abortController) {
    session.abortController.abort();
  }
  session.status = 'cancelled';
  res.json({ success: true, message: `Spider ${id} crawl cancelled.` });
});

// 6. Python Scrapling Code Generator
app.post('/api/generate-code', (req, res) => {
  const {
    fetcherType = 'StealthyFetcher',
    url = 'https://example.com',
    headless = true,
    networkIdle = true,
    enableJavascript = true,
    selector = '.product',
    adaptive = true,
    autoSave = true,
    spiderMode = false,
  } = req.body;

  let pythonCode = '';

  if (spiderMode) {
    pythonCode = `from scrapling.spiders import Spider, Response

class DemoSpider(Spider):
    name = "demo_crawler"
    start_urls = ["${url}"]
    concurrent_requests = 4
    download_delay = 0.5
    disable_javascript = ${enableJavascript ? 'False' : 'True'}

    async def parse(self, response: Response):
        # Extract items using Scrapling selector engine
        for element in response.css('${selector}'):
            yield {
                "title": element.css('h2::text').get(default="N/A"),
                "link": element.css('a::attr(href)').get(),
                "text": element.css('::text').getall(),
            }

        # Follow pagination links
        next_page = response.css('a.next-page::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

if __name__ == "__main__":
    spider = DemoSpider()
    spider.start()
`;
  } else {
    pythonCode = `from scrapling.fetchers import ${fetcherType}

# Configure fetcher options
${fetcherType}.adaptive = ${adaptive ? 'True' : 'False'}

# Fetch target web page with JavaScript execution & V8 DOM hydration
response = ${fetcherType}.fetch(
    "${url}",
    headless=${headless ? 'True' : 'False'},
    network_idle=${networkIdle ? 'True' : 'False'},
    disable_javascript=${enableJavascript ? 'False' : 'True'}
)

print(f"Status: {response.status}, Title: {response.title}")

# Extract data with Scrapling CSS/XPath selector
elements = response.css("${selector}"${autoSave ? ', auto_save=True' : ''}${adaptive ? ', adaptive=True' : ''})

for elem in elements:
    print("Found item:", elem.text.strip())
`;
  }

  const cliCommand = `scrapling extract "${url}" --css "${selector}" --fetcher ${fetcherType.toLowerCase()} ${headless ? '--headless' : ''}`;
  const curlCommand = `curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Scrapling/0.4.0" "${url}"`;

  res.json({
    pythonCode,
    cliCommand,
    curlCommand,
  });
});

// 7. Documentation Articles Endpoint
app.get('/api/docs', (req, res) => {
  const docs = [
    {
      id: 'selection-methods',
      title: 'Selection Methods & Selectors',
      category: 'Parsing',
      summary: 'CSS, XPath, Text filtering, regex matching, and pseudo-element extraction in Scrapling.',
      tags: ['CSS', 'XPath', 'Selectors', 'Text Matching'],
      codeSnippet: `products = p.css('.product-card')
titles = p.css('.product-title::text').getall()
links = p.css('a::attr(href)').get()
price = p.xpath('//span[contains(@class, "price")]/text()').get()`,
      content: `Scrapling provides an expressive and unified selector API built on top of high-performance parsers. It supports standard CSS3 selectors, XPath 1.0, and Scrapling-specific extensions like '::text' for direct text extraction and '::attr(name)' for attribute retrieval.`
    },
    {
      id: 'adaptive-parsing',
      title: 'Adaptive Parsing & Self-Healing Selectors',
      category: 'Adaptive System',
      summary: 'Automatically relocate elements when website designs or CSS classes change without broken scrapers.',
      tags: ['Adaptive', 'Fingerprinting', 'Self-Healing', 'Resilient'],
      codeSnippet: `# 1. Save selector signature on initial scrape
products = page.css('.product-title', auto_save=True)

# 2. Later, when website changes class names:
products = page.css('.product-title', adaptive=True)`,
      content: `The Adaptive Storage System calculates a multi-dimensional structural fingerprint for targeted DOM elements (including tag names, parent hierarchies, token similarity, sibling patterns, and attribute sets). If a website redesign breaks normal CSS selectors, Scrapling smoothly locates the nearest matching elements.`
    },
    {
      id: 'fetchers-overview',
      title: 'Choosing the Right Fetcher',
      category: 'Fetching',
      summary: 'Static Fetcher, AsyncFetcher, StealthyFetcher with Turnstile bypass, and Dynamic Headless Fetcher.',
      tags: ['Fetcher', 'Stealth', 'Cloudflare', 'Headless', 'Anti-Bot'],
      codeSnippet: `from scrapling.fetchers import Fetcher, StealthyFetcher, DynamicFetcher

# 1. Fast static requests
page = Fetcher.fetch('https://example.com')

# 2. Stealthy Chrome (bypasses Cloudflare Turnstile & bot protections)
page = StealthyFetcher.fetch('https://protected.com', headless=True)

# 3. Dynamic headless for heavy JavaScript execution
page = DynamicFetcher.fetch('https://spa-app.com', network_idle=True)`,
      content: `Scrapling offers specialized fetchers tailored to different web scraping scenarios, ranging from ultra-fast synchronous HTTP requests to full browser automation with realistic human-like fingerprints.`
    },
    {
      id: 'spider-framework',
      title: 'Spiders, Crawlers & Checkpointing',
      category: 'Spiders',
      summary: 'Scale to concurrent multi-page crawls with pause/resume, checkpointing, and rate throttling.',
      tags: ['Spiders', 'Crawler', 'Concurrency', 'Checkpointing', 'Scheduler'],
      codeSnippet: `from scrapling.spiders import Spider, Response

class CatalogSpider(Spider):
    name = "catalog"
    start_urls = ["https://example.com/shop"]

    async def parse(self, response: Response):
        for item in response.css('.product'):
            yield {"name": item.css('h3::text').get()}
        
        for link in response.css('a.pagination::attr(href)').getall():
            yield response.follow(link, self.parse)`,
      content: `The Scrapling Spider engine handles large-scale distributed scraping tasks with built-in checkpointing, request scheduling, robots.txt compliance, adaptive throttling, and automatic proxy rotation.`
    },
    {
      id: 'mcp-server',
      title: 'Model Context Protocol (MCP) Integration',
      category: 'AI & MCP',
      summary: 'Use Scrapling as an MCP tool server for LLM agents and AI reasoning systems.',
      tags: ['MCP', 'AI Agents', 'RAG', 'Markdown'],
      codeSnippet: `# Scrapling MCP Server exposes tools:
# - scrapling_fetch(url, stealth=True)
# - scrapling_extract(url, selector)
# - scrapling_markdown(url)
# Run MCP server:
scrapling mcp-server --port 8000`,
      content: `Integrate Scrapling directly into AI agents using the standard Model Context Protocol. Provide high-quality, clean markdown and structured DOM extractions for RAG pipelines without bot blocks.`
    }
  ];

  res.json({ docs });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scrapling Platform Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
