import React, { useState, useRef, useEffect } from 'react';
import {
  Bug,
  Play,
  Square,
  Download,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Eye,
  Layers,
  FileText,
  List,
  FolderTree,
  Code,
  Check,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SpiderLog, ScrapedItem, SpiderRuntimeStats, WebsiteTreeNode } from '../types';
import { RobotsPreviewModal } from './RobotsPreviewModal';
import { CrawledPageDetailModal } from './CrawledPageDetailModal';
import { WebsiteTreeExplorer } from './WebsiteTreeExplorer';

export const SpiderCrawlerStudio: React.FC = () => {
  // Crawler Configuration
  const [spiderName, setSpiderName] = useState('FullWebsiteCrawler');
  const [template, setTemplate] = useState<'crawler' | 'sitemap' | 'shopify' | 'feed' | 'site_to_markdown'>('crawler');
  const [startUrls, setStartUrls] = useState('https://mock.scrapling.local/ecommerce');
  const [concurrency, setConcurrency] = useState(4);
  const [delayMs, setDelayMs] = useState(150);
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(10);
  const [timeout, setTimeoutVal] = useState(15000);
  const [retryCount, setRetryCount] = useState(2);
  const [sameDomainOnly, setSameDomainOnly] = useState(true);
  const [includeSubdomains, setIncludeSubdomains] = useState(false);
  const [respectRobotsTxt, setRespectRobotsTxt] = useState(true);
  const [includeQueryParameters, setIncludeQueryParameters] = useState(true);
  const [excludePatterns, setExcludePatterns] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  const [stealthMode, setStealthMode] = useState(true);
  const [enableJavascript, setEnableJavascript] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Modals & Inspector
  const [isRobotsModalOpen, setIsRobotsModalOpen] = useState(false);
  const [robotsTargetUrl, setRobotsTargetUrl] = useState('https://mock.scrapling.local/ecommerce');
  const [selectedPageForModal, setSelectedPageForModal] = useState<ScrapedItem | null>(null);

  // Crawl Run State
  const [isRunning, setIsRunning] = useState(false);
  const [currentSpiderId, setCurrentSpiderId] = useState<string | null>(null);
  const [stats, setStats] = useState<SpiderRuntimeStats | null>(null);
  const [logs, setLogs] = useState<SpiderLog[]>([]);
  const [items, setItems] = useState<ScrapedItem[]>([]);
  const [websiteTree, setWebsiteTree] = useState<WebsiteTreeNode | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'tree' | 'logs' | 'markdown'>('items');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedMd, setCopiedMd] = useState(false);

  const pollTimerRef = useRef<any>(null);

  // Poll status while crawler is running
  const startPolling = (spiderId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/spider/status/${spiderId}`);
        if (!res.ok) return;
        const data = await res.json();

        setStats({
          id: data.id,
          status: data.status,
          requestsCompleted: data.requestsCompleted,
          requestsFailed: data.requestsFailed,
          itemsExtracted: data.itemsExtracted,
          queueRemaining: data.queueRemaining,
          pagesDiscovered: data.pagesDiscovered,
          pagesQueued: data.pagesQueued,
          pagesScraped: data.pagesScraped,
          currentUrl: data.currentUrl,
          crawlDepth: data.crawlDepth,
          maxDepth: data.maxDepth,
          crawlPercentage: data.crawlPercentage,
          avgLatencyMs: data.avgLatencyMs,
          bytesReceived: data.bytesReceived,
          startedAt: data.startedAt,
          finishedAt: data.finishedAt,
        });

        if (data.logs) setLogs(data.logs);
        if (data.items) setItems(data.items);
        if (data.websiteTree) setWebsiteTree(data.websiteTree);

        if (data.status === 'completed' || data.status === 'cancelled' || data.status === 'failed') {
          clearInterval(pollTimerRef.current);
          setIsRunning(false);
        }
      } catch (e) {
        console.error('Spider polling error', e);
      }
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleStartSpider = async () => {
    setIsRunning(true);
    setLogs([]);
    setItems([]);
    setWebsiteTree(null);

    const spiderId = `spider_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setCurrentSpiderId(spiderId);

    try {
      const urlList = startUrls.split('\n').map((u) => u.trim()).filter(Boolean);
      const res = await fetch('/api/spider/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: spiderId,
          name: spiderName,
          startUrls: urlList.length > 0 ? urlList : ['https://mock.scrapling.local/ecommerce'],
          template,
          concurrency,
          delayMs,
          maxPages,
          maxDepth,
          timeout,
          retryCount,
          sameDomainOnly,
          includeSubdomains,
          respectRobotsTxt,
          includeQueryParameters,
          excludePatterns: excludePatterns.split('\n').map((p) => p.trim()).filter(Boolean),
          includePatterns: includePatterns.split('\n').map((p) => p.trim()).filter(Boolean),
          stealthMode,
          enableJavascript,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStats({
        id: data.id,
        status: data.status,
        requestsCompleted: data.requestsCompleted,
        requestsFailed: data.requestsFailed,
        itemsExtracted: data.itemsExtracted,
        queueRemaining: data.queueRemaining,
        pagesDiscovered: data.pagesDiscovered,
        pagesQueued: data.pagesQueued,
        pagesScraped: data.pagesScraped,
        currentUrl: data.currentUrl,
        crawlDepth: data.crawlDepth,
        maxDepth: data.maxDepth,
        crawlPercentage: data.crawlPercentage,
        avgLatencyMs: data.avgLatencyMs,
        bytesReceived: data.bytesReceived,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt,
      });

      setLogs(data.logs || []);
      setItems(data.items || []);
      if (data.websiteTree) setWebsiteTree(data.websiteTree);

      if (data.status !== 'completed' && data.status !== 'cancelled' && data.status !== 'failed') {
        startPolling(spiderId);
      } else {
        setIsRunning(false);
      }
    } catch (err: any) {
      console.error(err);
      setIsRunning(false);
    }
  };

  const handleStopSpider = async () => {
    if (!currentSpiderId) return;
    try {
      await fetch(`/api/spider/cancel/${currentSpiderId}`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Export handlers
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${spiderName}_crawled_dataset.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportTreeJson = () => {
    if (!websiteTree) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(websiteTree, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${spiderName}_website_tree.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    const headers = ['URL', 'Depth', 'Status', 'Page Type', 'Title', 'Meta Description', 'Internal Links Count', 'External Links Count', 'Images Count', 'Response Time (ms)', 'Content Snippet'];
    const csvRows = [
      headers.join(','),
      ...items.map((row) =>
        [
          `"${(row._url || '').replace(/"/g, '""')}"`,
          row._depth ?? 0,
          row._status ?? 200,
          `"${(row.pageType || 'page').replace(/"/g, '""')}"`,
          `"${(row.title || '').replace(/"/g, '""')}"`,
          `"${(row.metaDescription || '').replace(/"/g, '""')}"`,
          row.internalLinksCount ?? (row.links?.filter((l) => l.isInternal).length || 0),
          row.externalLinksCount ?? (row.links?.filter((l) => !l.isInternal).length || 0),
          row.imagesCount ?? (row.images?.length || 0),
          row._responseTimeMs ?? 0,
          `"${(row.contentSnippet || (row.content ? row.content.substring(0, 200) : '')).replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    const csvStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvStr);
    downloadAnchor.setAttribute('download', `${spiderName}_pages.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportMarkdownArchive = () => {
    if (items.length === 0) return;
    const firstUrl = startUrls.split('\n')[0] || 'Website';
    let mdDoc = `# Website Crawl Archive\n\n- **Target Seed URL:** ${firstUrl}\n- **Total Pages Crawled:** ${items.length}\n- **Generated At:** ${new Date().toISOString()}\n\n---\n\n## Table of Contents\n\n`;
    items.forEach((it, idx) => {
      mdDoc += `${idx + 1}. [${it.title || it._url}](#page-${idx + 1})\n`;
    });
    mdDoc += `\n---\n\n`;

    items.forEach((it, idx) => {
      mdDoc += `### <a id="page-${idx + 1}"></a>Page ${idx + 1}: ${it.title || 'Untitled'}\n\n`;
      mdDoc += `- **URL:** ${it._url}\n`;
      mdDoc += `- **Depth:** ${it._depth ?? 0} | **Status:** ${it._status ?? 200} | **Type:** ${it.pageType || 'page'}\n\n`;
      if (it.metaDescription) {
        mdDoc += `> ${it.metaDescription}\n\n`;
      }
      mdDoc += `#### Extracted Content\n\n`;
      mdDoc += `${it.markdown || it.content || '*(No text extracted)*'}\n\n`;
      mdDoc += `---\n\n`;
    });

    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdDoc);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${spiderName}_full_site_archive.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchFilter ||
      item._url?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.contentSnippet?.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === '200' && item._status === 200) ||
      (statusFilter === 'errors' && item._status && item._status >= 400);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Crawler Studio Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/50 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Full-Website Web Crawler &amp; Recursive Spider Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  Recursive internal discovery
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Discovers and crawls all reachable internal pages across navigation, menus, sitemaps, and deep internal links.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="preview-robots-btn"
              type="button"
              onClick={() => {
                const firstUrl = startUrls.split('\n').map((u) => u.trim()).filter(Boolean)[0] || 'https://mock.scrapling.local/ecommerce';
                setRobotsTargetUrl(firstUrl);
                setIsRobotsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs border border-slate-700/80 shadow-md transition"
              title="Preview robots.txt rules and check route allowances"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Inspect robots.txt</span>
            </button>

            {!isRunning ? (
              <button
                id="start-spider-btn"
                onClick={handleStartSpider}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Full Site Crawl</span>
              </button>
            ) : (
              <button
                id="stop-spider-btn"
                onClick={handleStopSpider}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition active:scale-95 animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Crawl</span>
              </button>
            )}

            {items.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  id="export-spider-json-btn"
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Export complete extracted dataset as JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  id="export-spider-tree-btn"
                  onClick={handleExportTreeJson}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Export hierarchical website tree as JSON"
                >
                  <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tree JSON</span>
                </button>
                <button
                  id="export-spider-csv-btn"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Export dataset as CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  id="export-spider-md-btn"
                  onClick={handleExportMarkdownArchive}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-700/50 transition"
                  title="Export complete site as unified Markdown archive"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Markdown Doc</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Spider Mode</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="crawler">Full-Website Crawler (Recursive)</option>
              <option value="sitemap">Sitemap.xml Auto-Discover</option>
              <option value="shopify">Shopify Catalog Extractor</option>
              <option value="site_to_markdown">Site-to-Markdown Archiver</option>
              <option value="feed">RSS / Atom Feed Parser</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Depth ({maxDepth} levels)</label>
            <input
              type="range"
              min="1"
              max="15"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Concurrent Workers ({concurrency})</label>
            <input
              type="range"
              min="1"
              max="8"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Request Delay ({delayMs}ms)</label>
            <input
              type="range"
              min="0"
              max="1500"
              step="50"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Pages Cap</label>
            <input
              type="number"
              min="1"
              max="500"
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Start URLs Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label className="block text-[11px] font-semibold text-slate-400">
                Starting Target Seed URL (Crawl will follow all internal links)
              </label>
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setStartUrls('https://mock.scrapling.local/ecommerce')}
                className="text-emerald-400 hover:underline"
              >
                Mock Store
              </button>
              <button
                type="button"
                onClick={() => setStartUrls('https://mock.scrapling.local/quotes')}
                className="text-emerald-400 hover:underline"
              >
                Mock Quotes
              </button>
              <button
                type="button"
                onClick={() => setStartUrls('https://mock.scrapling.local/news')}
                className="text-emerald-400 hover:underline"
              >
                Mock News
              </button>
              <button
                type="button"
                onClick={() => setStartUrls('https://example.com')}
                className="text-emerald-400 hover:underline"
              >
                example.com
              </button>
            </div>
          </div>
          <textarea
            rows={2}
            value={startUrls}
            onChange={(e) => setStartUrls(e.target.value)}
            placeholder="https://example.com or https://mock.scrapling.local/ecommerce"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Toggle Advanced Controls Button */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Advanced Crawler Settings' : 'Show Advanced Crawler Settings (Robots.txt, Domain Scope, Exclusions, Retries)'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Advanced Settings Drawer */}
        {showAdvanced && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4 text-xs animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameDomainOnly}
                  onChange={(e) => setSameDomainOnly(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Same Domain Only (Strict internal scope)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubdomains}
                  onChange={(e) => setIncludeSubdomains(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Allow Subdomains (*.domain.com)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={respectRobotsTxt}
                  onChange={(e) => setRespectRobotsTxt(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Respect robots.txt Disallow Rules</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeQueryParameters}
                  onChange={(e) => setIncludeQueryParameters(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Preserve URL Query Parameters</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableJavascript}
                  onChange={(e) => setEnableJavascript(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Enable JavaScript Execution Engine</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stealthMode}
                  onChange={(e) => setStealthMode(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <span className="text-slate-300">Stealth Fingerprint Masking</span>
              </label>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">HTTP Request Timeout ({timeout / 1000}s)</label>
                <input
                  type="number"
                  min="3000"
                  max="60000"
                  step="1000"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Retries per Page</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={retryCount}
                  onChange={(e) => setRetryCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Exclude URL Patterns (one per line, e.g. /cart/*, /login, *.pdf)
                </label>
                <textarea
                  rows={2}
                  value={excludePatterns}
                  onChange={(e) => setExcludePatterns(e.target.value)}
                  placeholder="/admin/*&#10;/cart&#10;*.zip"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Include URL Patterns (Optional whitelist, e.g. /docs/*, /blog/*)
                </label>
                <textarea
                  rows={2}
                  value={includePatterns}
                  onChange={(e) => setIncludePatterns(e.target.value)}
                  placeholder="/blog/*&#10;/products/*"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spider Stats Overview Banner */}
      {stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold block">Pages Scraped</span>
              <div className="flex items-baseline gap-1.5">
                <strong className="text-lg font-mono text-emerald-400">{stats.pagesScraped ?? stats.requestsCompleted}</strong>
                <span className="text-[10px] text-slate-500 font-mono">/ {stats.pagesDiscovered ?? stats.requestsCompleted} found</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold block">Queue Remaining</span>
              <strong className="text-lg font-mono text-amber-400">{stats.queueRemaining}</strong>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold block">Max Crawl Depth</span>
              <strong className="text-lg font-mono text-sky-400">Level {stats.crawlDepth ?? 0}</strong>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold block">Avg Latency</span>
              <strong className="text-lg font-mono text-slate-200">{stats.avgLatencyMs} ms</strong>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 font-semibold block">Data Ingested</span>
              <strong className="text-lg font-mono text-teal-400">{((stats.bytesReceived || 0) / 1024).toFixed(1)} KB</strong>
            </div>
          </div>

          {/* Active Crawl Status & Progress Bar */}
          {isRunning && (
            <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Crawling: <strong className="text-emerald-400">{stats.currentUrl || 'Discovering links...'}</strong></span>
                </span>
                <span className="text-emerald-400 font-mono font-bold">{stats.crawlPercentage ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, stats.crawlPercentage ?? 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Tabs & Explorer Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 pt-3 border-b border-slate-800 bg-slate-950/40 gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('items')}
              className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'items'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Crawled Pages Dataset ({items.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('tree')}
              className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'tree'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-400" />
              <span>Website Hierarchy Tree</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'logs'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Crawler Logs ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('markdown')}
              className={`pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                activeTab === 'markdown'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Combined Site Markdown</span>
            </button>
          </div>

          {/* Search & Filter bar for items table */}
          {activeTab === 'items' && items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter pages..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 font-sans focus:outline-none focus:border-emerald-500 w-36 sm:w-48"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Status ({items.length})</option>
                <option value="200">200 OK</option>
                <option value="errors">Errors (4xx/5xx)</option>
              </select>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  id="tab-export-csv-btn"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Download crawled pages dataset as CSV"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Download CSV</span>
                </button>
                <button
                  id="tab-export-json-btn"
                  onClick={handleExportJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  title="Download full crawled dataset as JSON"
                >
                  <Download className="w-3 h-3 text-sky-400" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 max-h-[540px] overflow-auto">
          {/* TAB 1: Dataset Table */}
          {activeTab === 'items' && (
            items.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No items extracted yet. Click "Start Full Site Crawl" to discover and crawl all reachable internal pages.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 font-mono text-slate-400">
                      <th className="p-2.5 font-semibold">URL / Route</th>
                      <th className="p-2.5 font-semibold">Depth</th>
                      <th className="p-2.5 font-semibold">Status</th>
                      <th className="p-2.5 font-semibold">Type</th>
                      <th className="p-2.5 font-semibold">Title</th>
                      <th className="p-2.5 font-semibold">Internal Links</th>
                      <th className="p-2.5 font-semibold">Content Preview</th>
                      <th className="p-2.5 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition group">
                        <td className="p-2.5 text-emerald-400 font-mono text-[11px] max-w-[220px] truncate" title={item._url}>
                          <a
                            href={item._url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{item._url}</span>
                            <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                          </a>
                        </td>
                        <td className="p-2.5 text-slate-300 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item._depth ?? 0}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded ${item._status >= 200 && item._status < 400 ? 'bg-emerald-950/80 text-emerald-400' : 'bg-red-950/80 text-red-400'}`}>
                            {item._status ?? 200}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40 capitalize">
                            {item.pageType || 'page'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-200 font-medium max-w-[180px] truncate" title={item.title}>
                          {item.title || 'Untitled'}
                        </td>
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                          {item.internalLinksCount ?? (item.links?.filter((l) => l.isInternal).length || 0)}
                        </td>
                        <td className="p-2.5 text-slate-400 font-mono text-[11px] max-w-[220px] truncate" title={item.contentSnippet}>
                          {item.contentSnippet || item.content?.substring(0, 100) || 'N/A'}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedPageForModal(item)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 font-semibold text-[10px] transition ml-auto"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 2: Website Hierarchy Tree */}
          {activeTab === 'tree' && (
            <WebsiteTreeExplorer
              tree={websiteTree}
              onSelectPage={(item) => setSelectedPageForModal(item)}
              items={items}
            />
          )}

          {/* TAB 3: Crawler Logs */}
          {activeTab === 'logs' && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-1.5 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.level === 'SUCCESS'
                        ? 'text-emerald-400'
                        : log.level === 'WARN'
                        ? 'text-amber-400'
                        : log.level === 'ERROR'
                        ? 'text-red-400'
                        : 'text-sky-400'
                    }`}
                  >
                    {log.level}:
                  </span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: Combined Site Markdown */}
          {activeTab === 'markdown' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">
                  Unified Markdown compilation of all {items.length} crawled pages
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (items.length === 0) return;
                      let mdDoc = `# Website Crawl Archive\n\n`;
                      items.forEach((it, idx) => {
                        mdDoc += `## Page ${idx + 1}: ${it.title || it._url}\n- URL: ${it._url}\n- Depth: ${it._depth ?? 0}\n\n${it.markdown || it.content}\n\n---\n\n`;
                      });
                      navigator.clipboard.writeText(mdDoc);
                      setCopiedMd(true);
                      setTimeout(() => setCopiedMd(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{copiedMd ? 'Copied' : 'Copy All Markdown'}</span>
                  </button>
                  <button
                    onClick={handleExportMarkdownArchive}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Run a crawl to compile markdown for all reachable pages.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 max-h-96 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400 font-mono">{idx + 1}. {it.title || 'Untitled'}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{it._url}</span>
                      </div>
                      <pre className="p-3 bg-slate-900/80 rounded-lg text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                        {it.markdown || it.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Crawled Page Inspector Modal */}
      <CrawledPageDetailModal
        page={selectedPageForModal}
        onClose={() => setSelectedPageForModal(null)}
      />

      {/* Robots.txt Preview & Inspector Modal */}
      <RobotsPreviewModal
        isOpen={isRobotsModalOpen}
        onClose={() => setIsRobotsModalOpen(false)}
        targetUrl={robotsTargetUrl}
        onSelectSitemap={(sitemapUrl) => {
          setStartUrls(sitemapUrl);
          setTemplate('sitemap');
        }}
      />
    </div>
  );
};
