import { chromium, Browser, BrowserContext, Page } from 'playwright';

let browserInstance: Browser | null = null;
let isLaunching = false;
const launchWaiters: Array<(b: Browser) => void> = [];

/**
 * Get or lazily initialize the shared Playwright Chromium instance
 */
export async function getPlaywrightBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (isLaunching) {
    return new Promise((resolve) => {
      launchWaiters.push(resolve);
    });
  }

  isLaunching = true;

  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    browserInstance = browser;
    isLaunching = false;

    while (launchWaiters.length > 0) {
      const waiter = launchWaiters.shift();
      if (waiter) waiter(browser);
    }

    return browser;
  } catch (err: any) {
    isLaunching = false;
    throw new Error(`Failed to launch Playwright Chromium: ${err.message}`);
  }
}

/**
 * Anti-Bot Challenge & Placeholder Detection
 */
export interface ChallengeDetectionResult {
  isChallenge: boolean;
  isJsRequired: boolean;
  isCaptcha: boolean;
  reason?: string;
}

const JS_REQUIRED_PATTERNS = [
  /enable javascript and cookies to continue/i,
  /please enable javascript/i,
  /you need to enable javascript/i,
  /javascript is required/i,
  /javascript is disabled/i,
  /turn on javascript/i,
  /requires javascript to be enabled/i,
  /this site requires javascript/i,
  /browser does not support javascript/i,
];

const CAPTCHA_CHALLENGE_PATTERNS = [
  /attention required!\s*\|\s*cloudflare/i,
  /checking your browser before accessing/i,
  /just a moment\.\.\./i,
  /verify you are human/i,
  /security verification/i,
  /cf-turnstile-wrapper/i,
  /cf-challenge-running/i,
  /cf_chl_opt/i,
  /hcaptcha\.com\/1\/api/i,
  /google\.com\/recaptcha/i,
  /datadome/i,
  /perimeterx/i,
  /geo\.captcha/i,
  /access to this page has been denied/i,
];

/**
 * Inspect raw HTML string or rendered text to identify placeholder/challenge pages
 */
export function detectChallengeOrPlaceholder(html: string, status?: number): ChallengeDetectionResult {
  if (!html || typeof html !== 'string') {
    return { isChallenge: false, isJsRequired: false, isCaptcha: false };
  }

  const clean = html.toLowerCase();

  // 1. Check for CAPTCHA / anti-bot challenge
  for (const pattern of CAPTCHA_CHALLENGE_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isChallenge: true,
        isJsRequired: false,
        isCaptcha: true,
        reason: 'Explicit anti-bot verification / CAPTCHA challenge detected',
      };
    }
  }

  // 2. Check for JavaScript-Required placeholders
  for (const pattern of JS_REQUIRED_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isChallenge: true,
        isJsRequired: true,
        isCaptcha: false,
        reason: 'JavaScript execution required placeholder response',
      };
    }
  }

  // 3. Status 403 / 429 with challenge keywords
  if (status === 403 || status === 429 || status === 503) {
    if (clean.includes('cloudflare') || clean.includes('ray id') || clean.includes('ddos') || clean.includes('captcha')) {
      return {
        isChallenge: true,
        isJsRequired: false,
        isCaptcha: true,
        reason: `HTTP ${status} Cloudflare / Security Firewall challenge`,
      };
    }
  }

  return { isChallenge: false, isJsRequired: false, isCaptcha: false };
}

/**
 * Heuristic check if raw HTML is an unhydrated SPA or needs Browser Rendering
 */
export function requiresBrowserRendering(html: string): boolean {
  if (!html) return false;

  const challenge = detectChallengeOrPlaceholder(html);
  if (challenge.isJsRequired) {
    return true;
  }

  // Check for common empty SPA mount points without rendered children
  const emptySpaMounts = [
    /<div id=["']root["']>\s*<\/div>/i,
    /<div id=["']__next["']>\s*<\/div>/i,
    /<div id=["']app["']>\s*<\/div>/i,
    /<main id=["']root["']>\s*<\/main>/i,
    /<main id=["']app["']>\s*<\/main>/i,
    /<noscript>.*enable javascript.*<\/noscript>/i,
  ];

  for (const pattern of emptySpaMounts) {
    if (pattern.test(html)) {
      return true;
    }
  }

  return false;
}

export interface BrowserRenderOptions {
  timeout?: number;
  waitForNetworkIdle?: boolean;
  stealthMode?: boolean;
  userAgent?: string;
  cookies?: Array<{ name: string; value: string; domain: string; path?: string }>;
  context?: BrowserContext;
}

export interface BrowserRenderResult {
  url: string;
  finalUrl: string;
  status: number;
  statusText: string;
  html: string;
  title: string;
  responseTimeMs: number;
  contentLength: number;
  isChallenge: boolean;
  isCaptcha: boolean;
  challengeReason?: string;
  engine: string;
  cookies?: Array<{ name: string; value: string }>;
}

/**
 * Render a web page using real Playwright Chromium browser
 */
export async function renderWithBrowser(
  targetUrl: string,
  options: BrowserRenderOptions = {}
): Promise<BrowserRenderResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeout || 20000;
  const browser = await getPlaywrightBrowser();

  const userAgent =
    options.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

  let localContext: BrowserContext | null = null;
  const context =
    options.context ||
    (localContext = await browser.newContext({
      userAgent,
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="133", "Google Chrome";v="133", "Not?A_Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    }));

  if (options.cookies && options.cookies.length > 0) {
    try {
      await context.addCookies(options.cookies);
    } catch {
      // Ignore cookie errors
    }
  }

  let page: Page | null = null;

  try {
    page = await context.newPage();

    // Apply stealth scripts before page scripts load
    if (options.stealthMode !== false) {
      await page.addInitScript(() => {
        // 1. Pass webdriver test
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // 2. Mock chrome object
        (window as any).chrome = {
          app: { isInstalled: false },
          runtime: {
            PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
            PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          },
          loadTimes: () => ({}),
          csi: () => ({}),
        };

        // 3. Mock languages and plugins
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbicgflfkfknnimmakignwalmcheo', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ],
        });
      });
    }

    // Set page navigation timeout
    page.setDefaultNavigationTimeout(timeoutMs);
    page.setDefaultTimeout(timeoutMs);

    let mainResponse: any = null;

    try {
      mainResponse = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs,
      });
    } catch (navErr: any) {
      // If navigation failed, try waiting for basic load
      if (!navErr.message.includes('timeout') && !navErr.message.includes('ERR_ABORTED')) {
        throw navErr;
      }
    }

    // Wait for network stabilization or client SPA hydration (max 3.5s)
    if (options.waitForNetworkIdle !== false) {
      try {
        await page.waitForLoadState('networkidle', { timeout: 3500 });
      } catch {
        // Network idle timeout is non-blocking (e.g. background polling scripts)
      }
    } else {
      // Short delay for React/Vue hydration
      await page.waitForTimeout(600);
    }

    const finalUrl = page.url() || targetUrl;
    const title = (await page.title()) || '';
    const html = (await page.content()) || '';
    const status = mainResponse?.status() || 200;
    const statusText = mainResponse?.statusText() || 'OK';
    const cookies = await context.cookies();

    const responseTimeMs = Date.now() - startTime;

    // Check challenge detection on the rendered DOM
    const challengeCheck = detectChallengeOrPlaceholder(html, status);

    return {
      url: targetUrl,
      finalUrl,
      status,
      statusText,
      html,
      title,
      responseTimeMs,
      contentLength: Buffer.byteLength(html, 'utf-8'),
      isChallenge: challengeCheck.isChallenge,
      isCaptcha: challengeCheck.isCaptcha,
      challengeReason: challengeCheck.reason,
      engine: 'Playwright Chromium Headless',
      cookies: cookies.map((c) => ({ name: c.name, value: c.value })),
    };
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore page close error
      }
    }

    // If context was locally created, close it
    if (localContext) {
      try {
        await localContext.close();
      } catch {
        // Ignore context close error
      }
    }
  }
}
