import React, { useState, useEffect } from 'react';
import {
  Play,
  Shield,
  Globe,
  Terminal,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Download,
  Copy,
  Check,
  LayoutGrid,
  Monitor,
  ChevronRight,
  ExternalLink,
  Code,
  Search,
  Filter,
  MousePointerClick,
  ArrowUpRight,
  Compass,
  CheckSquare,
  FormInput
} from 'lucide-react';
import { FetcherType, FetchResponseData, FullUiScrapeResult, ScrapedScreenData } from '../types';

interface FetcherStudioProps {
  currentResponse: FetchResponseData | null;
  setCurrentResponse: (resp: FetchResponseData | null) => void;
  onSendToAdaptive: (html: string) => void;
}

export const FetcherStudio: React.FC<FetcherStudioProps> = ({
  currentResponse,
  setCurrentResponse,
  onSendToAdaptive,
}) => {
  // Scraper Mode: Single Screen or Full UI (All Screens)
  const [scrapeMode, setScrapeMode] = useState<'single' | 'full-ui'>('single');
  const [url, setUrl] = useState('https://mock.scrapling.local/ecommerce');
  const [fetcherType, setFetcherType] = useState<FetcherType>('StealthyFetcher');
  const [headless, setHeadless] = useState(true);
  const [networkIdle, setNetworkIdle] = useState(true);
  const [stealth, setStealth] = useState(true);
  const [enableJavascript, setEnableJavascript] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'markdown' | 'headers'>('preview');
  const [copied, setCopied] = useState(false);
  const [fixtures, setFixtures] = useState<any[]>([]);

  // Full UI Multi-Screen Scraping State
  const [maxScreens, setMaxScreens] = useState<number>(10);
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [fullUiLoading, setFullUiLoading] = useState<boolean>(false);
  const [fullUiResult, setFullUiResult] = useState<FullUiScrapeResult | null>(null);
  const [selectedScreenIndex, setSelectedScreenIndex] = useState<number>(0);
  const [screenViewTab, setScreenViewTab] = useState<'ui-elements' | 'preview' | 'markdown' | 'html'>('ui-elements');
  const [fullUiTab, setFullUiTab] = useState<'screens' | 'site-inventory' | 'combined-md'>('screens');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'nav' | 'buttons' | 'forms'>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [copiedFullMd, setCopiedFullMd] = useState(false);

  // Load sample fixtures on mount
  useEffect(() => {
    fetch('/api/fixtures')
      .then((res) => res.json())
      .then((data) => {
        if (data.fixtures) setFixtures(data.fixtures);
      })
      .catch((err) => console.error('Failed to load fixtures', err));

    // Auto-fetch default fixture on initial load if no response
    if (!currentResponse) {
      handleFetchFixture('ecommerce');
    }
  }, []);

  // Fetch Single Screen
  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          fetcherType,
          headless,
          networkIdle,
          stealth,
          enableJavascript,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      setCurrentResponse(data);
      setScrapeMode('single');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Scrape Full Website UI (All Screens, Routes, Nav Menus, Action Buttons, Forms)
  const handleScrapeFullUi = async () => {
    setFullUiLoading(true);
    setError(null);
    setScrapeMode('full-ui');
    try {
      const res = await fetch('/api/scrape-full-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          maxScreens,
          maxDepth,
          fetcherType,
          enableJavascript,
          stealth,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape full website UI');
      }

      setFullUiResult(data);
      setSelectedScreenIndex(0);
      setScrapeMode('full-ui');
    } catch (err: any) {
      setError(err.message || 'Full UI scrape failed');
    } finally {
      setFullUiLoading(false);
    }
  };

  const handleFetchFixture = async (fixtureId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixtureId,
          fetcherType,
          headless,
          networkIdle,
          stealth,
          enableJavascript,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl(`https://mock.scrapling.local/${fixtureId}`);
      setCurrentResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Full UI Dataset as JSON
  const handleDownloadFullUiJson = () => {
    if (!fullUiResult) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullUiResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `full_ui_scrape_${fullUiResult.baseDomain}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Full UI Screens Summary as CSV
  const handleDownloadFullUiCsv = () => {
    if (!fullUiResult || fullUiResult.screens.length === 0) return;
    const headers = [
      'Screen ID',
      'Title',
      'Route Path',
      'Full URL',
      'HTTP Status',
      'Depth',
      'Latency (ms)',
      'Page Type',
      'Nav Links Count',
      'Action Buttons Count',
      'Forms Count',
      'Headings Count',
    ];

    const rows = fullUiResult.screens.map((s) => [
      s.screenId,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      `"${(s.path || '').replace(/"/g, '""')}"`,
      `"${(s.url || '').replace(/"/g, '""')}"`,
      s.status,
      s.depth,
      s.responseTimeMs,
      s.pageType,
      s.uiElements?.navigation?.length || 0,
      s.uiElements?.actionButtons?.length || 0,
      s.uiElements?.forms?.length || 0,
      s.uiElements?.headings?.length || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `full_ui_screens_${fullUiResult.baseDomain}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Consolidated Markdown
  const handleDownloadCombinedMd = () => {
    if (!fullUiResult) return;
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(fullUiResult.consolidatedMarkdown);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `full_ui_report_${fullUiResult.baseDomain}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const selectedScreen: ScrapedScreenData | undefined =
    fullUiResult?.screens && fullUiResult.screens[selectedScreenIndex]
      ? fullUiResult.screens[selectedScreenIndex]
      : undefined;

  // Filter site inventory
  const filteredNavLinks = (fullUiResult?.fullUiInventory?.allNavLinks || []).filter(
    (n) =>
      !inventorySearch ||
      n.text.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      n.href.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      n.foundOnScreen.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredButtons = (fullUiResult?.fullUiInventory?.allActionButtons || []).filter(
    (b) =>
      !inventorySearch ||
      b.text.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      b.foundOnScreen.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredForms = (fullUiResult?.fullUiInventory?.allForms || []).filter(
    (f) =>
      !inventorySearch ||
      (f.action && f.action.toLowerCase().includes(inventorySearch.toLowerCase())) ||
      f.foundOnScreen.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Mode Switcher Banner: Single Screen vs Full UI (All Screens) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Website UI Scraping Scope
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {scrapeMode === 'full-ui' ? 'Multi-Screen & Component Traversal' : 'Single Screen Fetch'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Scrape the entire website UI (menus, screens, forms, action buttons) or inspect an individual URL.
            </p>
          </div>
        </div>

        {/* Scope Pill Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setScrapeMode('single')}
            className={`px-3 py-1.5 rounded-lg transition ${
              scrapeMode === 'single'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Screen
          </button>
          <button
            type="button"
            onClick={() => {
              setScrapeMode('full-ui');
              if (!fullUiResult && !fullUiLoading) {
                handleScrapeFullUi();
              }
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              scrapeMode === 'full-ui'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Full UI (All Screens)</span>
          </button>
        </div>
      </div>

      {/* Top Bar / Fetcher & Full UI Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/50 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            {/* Fetcher Type Select */}
            <div className="sm:w-56">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Engine Class
              </label>
              <select
                id="fetcher-type-select"
                value={fetcherType}
                onChange={(e) => setFetcherType(e.target.value as FetcherType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="StealthyFetcher">StealthyFetcher (Anti-Bot Bypass)</option>
                <option value="DynamicFetcher">DynamicFetcher (Headless Chrome)</option>
                <option value="Fetcher">Fetcher (Fast HTTP/Static)</option>
                <option value="AsyncFetcher">AsyncFetcher (Async Coroutine)</option>
              </select>
            </div>

            {/* Target URL Input */}
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Target URL (Seed URL for full UI traversal)
              </label>
              <div className="relative">
                <input
                  id="target-url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com or select testbed fixture below..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500 transition pr-4"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Fetch Single & Scrape Full UI */}
          <div className="flex items-center gap-2 pt-1 lg:pt-5">
            <button
              id="fetch-single-btn"
              onClick={handleFetch}
              disabled={loading || fullUiLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-slate-700 disabled:opacity-50"
              title="Scrape only this URL/screen"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{loading ? 'Fetching...' : 'Fetch Single Screen'}</span>
            </button>

            <button
              id="scrape-full-ui-btn"
              onClick={handleScrapeFullUi}
              disabled={loading || fullUiLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              title="Recursively scrape all screens, navigation routes, buttons, and forms"
            >
              {fullUiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{fullUiLoading ? 'Scraping Full UI...' : '⚡ Scrape Full UI (All Screens)'}</span>
            </button>
          </div>
        </div>

        {/* Full UI Settings (Screens Cap & Depth) */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Max Screens:</span>
              <select
                value={maxScreens}
                onChange={(e) => setMaxScreens(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="5">5 Screens</option>
                <option value="8">8 Screens</option>
                <option value="10">10 Screens</option>
                <option value="15">15 Screens</option>
                <option value="20">20 Screens</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Max Depth:</span>
              <select
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="1">Depth 1 (Direct Links)</option>
                <option value="2">Depth 2 (Sub-pages & Categories)</option>
                <option value="3">Depth 3 (Deep Hierarchy)</option>
              </select>
            </div>

            {/* Toggles */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableJavascript}
                onChange={(e) => setEnableJavascript(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
              />
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Enable JavaScript
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stealth}
                onChange={(e) => setStealth(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
              />
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Stealth Turnstile Bypass
              </span>
            </label>
          </div>

          {/* Preset Testbeds */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px] font-semibold">Testbeds:</span>
            {fixtures.map((f) => (
              <button
                key={f.id}
                onClick={() => handleFetchFixture(f.id)}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition"
              >
                {f.category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* FULL UI MULTI-SCREEN SCRAPING VIEW                    */}
      {/* ---------------------------------------------------- */}
      {scrapeMode === 'full-ui' && fullUiResult && (
        <div className="space-y-5">
          {/* Summary Metric Ribbon & Export Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/50 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    ⚡ Full Website UI Scraped
                  </span>
                  <span className="text-xs font-mono text-slate-400">{fullUiResult.baseDomain}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                  Discovered {fullUiResult.totalScreensScraped} Screens with Full UI Inventory
                </h2>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadFullUiJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleDownloadFullUiCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleDownloadCombinedMd}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>

            {/* Metric Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  Screens Scraped
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {fullUiResult.totalScreensScraped}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  Nav Links Menus
                </span>
                <span className="text-xl font-bold font-mono text-sky-400">
                  {fullUiResult.fullUiInventory.allNavLinks.length}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                  Action Buttons &amp; CTAs
                </span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {fullUiResult.fullUiInventory.allActionButtons.length}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FormInput className="w-3.5 h-3.5 text-purple-400" />
                  Interactive Forms
                </span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {fullUiResult.fullUiInventory.allForms.length}
                </span>
              </div>
            </div>
          </div>

          {/* Full UI Workspace Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
            {/* Top Workspace Bar */}
            <div className="p-3 px-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFullUiTab('screens')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                    fullUiTab === 'screens'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Screens Explorer ({fullUiResult.screens.length})</span>
                </button>

                <button
                  onClick={() => setFullUiTab('site-inventory')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                    fullUiTab === 'site-inventory'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Site-Wide UI Inventory</span>
                </button>

                <button
                  onClick={() => setFullUiTab('combined-md')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                    fullUiTab === 'combined-md'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Consolidated Markdown</span>
                </button>
              </div>

              {selectedScreen && (
                <button
                  onClick={() => onSendToAdaptive(selectedScreen.html)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-semibold text-xs transition border border-slate-700"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send Active Screen to Adaptive Studio</span>
                </button>
              )}
            </div>

            {/* TAB 1: Screens Explorer */}
            {fullUiTab === 'screens' && (
              <div>
                {/* Horizontal Screen Selector Strip */}
                <div className="p-3 bg-slate-950 border-b border-slate-800 overflow-x-auto">
                  <div className="flex items-center gap-2.5 min-w-max pb-1">
                    {fullUiResult.screens.map((screen, idx) => (
                      <button
                        key={screen.screenId}
                        onClick={() => setSelectedScreenIndex(idx)}
                        className={`p-2.5 px-3 rounded-xl border text-left transition flex flex-col gap-1 min-w-[170px] max-w-[210px] ${
                          selectedScreenIndex === idx
                            ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            Screen #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            Depth {screen.depth}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-200 truncate w-full" title={screen.title}>
                          {screen.title || screen.path}
                        </span>
                        <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-500 pt-0.5">
                          <span className="truncate max-w-[90px]">{screen.path}</span>
                          <span className="text-sky-400">
                            {screen.uiElements.interactiveControlsCount} UI items
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Screen Inspector Canvas */}
                {selectedScreen && (
                  <div>
                    {/* Screen Header */}
                    <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            HTTP {selectedScreen.status}
                          </span>
                          <span className="px-2 py-0.5 rounded font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30 capitalize">
                            {selectedScreen.pageType}
                          </span>
                          <span className="text-slate-400 font-mono">
                            Latency: <strong className="text-slate-200">{selectedScreen.responseTimeMs}ms</strong>
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{selectedScreen.title}</span>
                          <span className="text-xs text-slate-400 font-mono font-normal">({selectedScreen.path})</span>
                        </h3>
                        <a
                          href={selectedScreen.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>{selectedScreen.url}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Screen View Subtabs */}
                      <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setScreenViewTab('ui-elements')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                            screenViewTab === 'ui-elements'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>UI Components</span>
                        </button>

                        <button
                          onClick={() => setScreenViewTab('preview')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                            screenViewTab === 'preview'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Monitor className="w-3 h-3" />
                          <span>Rendered Screen</span>
                        </button>

                        <button
                          onClick={() => setScreenViewTab('markdown')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                            screenViewTab === 'markdown'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>AI Markdown</span>
                        </button>

                        <button
                          onClick={() => setScreenViewTab('html')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                            screenViewTab === 'html'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          <span>Raw HTML</span>
                        </button>
                      </div>
                    </div>

                    {/* Subtab 1: UI Elements on this Screen */}
                    {screenViewTab === 'ui-elements' && (
                      <div className="p-4 sm:p-5 space-y-4">
                        {/* Screen Layout Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Header Bar</span>
                            <span className={`text-xs font-bold ${selectedScreen.uiElements.hasHeader ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {selectedScreen.uiElements.hasHeader ? 'Detected' : 'Not Present'}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Footer Section</span>
                            <span className={`text-xs font-bold ${selectedScreen.uiElements.hasFooter ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {selectedScreen.uiElements.hasFooter ? 'Detected' : 'Not Present'}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Content Cards</span>
                            <span className="text-xs font-bold text-sky-400 font-mono">
                              {selectedScreen.uiElements.cardsCount} cards
                            </span>
                          </div>
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Controls</span>
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              {selectedScreen.uiElements.interactiveControlsCount} elements
                            </span>
                          </div>
                        </div>

                        {/* Navigation Menus on this screen */}
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Compass className="w-3.5 h-3.5 text-emerald-400" />
                              Screen Navigation Links ({selectedScreen.uiElements.navigation.length})
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500">Internal site routes</span>
                          </div>
                          {selectedScreen.uiElements.navigation.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No specific nav menu links detected.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {selectedScreen.uiElements.navigation.map((nav, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                                  <span className="font-medium text-slate-200 truncate">{nav.text}</span>
                                  <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[120px]">{nav.href}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons & CTAs on this screen */}
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                              Action Buttons &amp; Interactive CTAs ({selectedScreen.uiElements.actionButtons.length})
                            </h4>
                          </div>
                          {selectedScreen.uiElements.actionButtons.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No primary action buttons detected on this screen.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {selectedScreen.uiElements.actionButtons.map((btn, idx) => (
                                <div key={idx} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-2">
                                  <span className="text-emerald-400 font-bold">&gt;</span>
                                  <span>{btn.text}</span>
                                  {btn.disabled && <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 text-[10px]">Disabled</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Forms & Inputs on this screen */}
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <FormInput className="w-3.5 h-3.5 text-purple-400" />
                              Interactive Forms &amp; Inputs ({selectedScreen.uiElements.forms.length})
                            </h4>
                          </div>
                          {selectedScreen.uiElements.forms.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No input forms detected on this screen.</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedScreen.uiElements.forms.map((form, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-2">
                                  <div className="flex items-center justify-between font-mono text-[11px]">
                                    <span className="text-emerald-400 font-bold">Form #{idx + 1} {form.id ? `(${form.id})` : ''}</span>
                                    <span className="text-slate-400">{form.method} &rarr; {form.action || selectedScreen.path}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {form.inputs.map((inp, iIdx) => (
                                      <span key={iIdx} className="px-2.5 py-1 rounded bg-slate-950 text-slate-300 font-mono text-[11px] border border-slate-800">
                                        {inp.name || 'input'} <span className="text-slate-500">[{inp.type}]</span> {inp.placeholder ? `"${inp.placeholder}"` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Headings & Sections */}
                        {selectedScreen.uiElements.headings.length > 0 && (
                          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                            <h4 className="text-xs font-bold text-slate-300">Screen Headings Hierarchy</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedScreen.uiElements.headings.map((h, idx) => (
                                <span key={idx} className="px-2 py-1 rounded bg-slate-900 text-slate-300 font-sans text-xs border border-slate-800/80">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Subtab 2: Rendered View */}
                    {screenViewTab === 'preview' && (
                      <div className="p-4 min-h-[440px]">
                        <div className="w-full bg-white rounded-xl overflow-hidden shadow-inner min-h-[440px]">
                          <iframe
                            title={`Preview ${selectedScreen.title}`}
                            srcDoc={selectedScreen.html}
                            sandbox="allow-same-origin"
                            className="w-full min-h-[440px] border-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Subtab 3: AI Markdown */}
                    {screenViewTab === 'markdown' && (
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Markdown compilation of {selectedScreen.title}</span>
                          <button
                            onClick={() => copyContent(selectedScreen.markdown)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-semibold text-xs flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                          {selectedScreen.markdown}
                        </pre>
                      </div>
                    )}

                    {/* Subtab 4: Raw HTML */}
                    {screenViewTab === 'html' && (
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Raw HTML of {selectedScreen.path}</span>
                          <button
                            onClick={() => copyContent(selectedScreen.html)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-semibold text-xs flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                          {selectedScreen.html}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Site-Wide UI Inventory */}
            {fullUiTab === 'site-inventory' && (
              <div className="p-4 sm:p-5 space-y-4">
                {/* Search & Filter bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInventoryFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inventoryFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Controls
                    </button>
                    <button
                      onClick={() => setInventoryFilter('nav')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inventoryFilter === 'nav' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Nav Links ({fullUiResult.fullUiInventory.allNavLinks.length})
                    </button>
                    <button
                      onClick={() => setInventoryFilter('buttons')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inventoryFilter === 'buttons' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Action Buttons ({fullUiResult.fullUiInventory.allActionButtons.length})
                    </button>
                    <button
                      onClick={() => setInventoryFilter('forms')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        inventoryFilter === 'forms' ? 'bg-slate-800 text-purple-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Forms ({fullUiResult.fullUiInventory.allForms.length})
                    </button>
                  </div>

                  <div className="relative sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      placeholder="Filter components..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Inventory Results Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-300">
                          <th className="p-3">Type</th>
                          <th className="p-3">Component / Label</th>
                          <th className="p-3">Target URL / Action</th>
                          <th className="p-3">Origin Screen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(inventoryFilter === 'all' || inventoryFilter === 'nav') &&
                          filteredNavLinks.map((nav, idx) => (
                            <tr key={`nav-${idx}`} className="hover:bg-slate-900/40">
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-mono text-[10px]">
                                  Nav Link
                                </span>
                              </td>
                              <td className="p-2.5 font-medium text-slate-200">{nav.text}</td>
                              <td className="p-2.5 font-mono text-emerald-400 text-[11px] truncate max-w-xs">{nav.href}</td>
                              <td className="p-2.5 text-slate-400">{nav.foundOnScreen}</td>
                            </tr>
                          ))}

                        {(inventoryFilter === 'all' || inventoryFilter === 'buttons') &&
                          filteredButtons.map((btn, idx) => (
                            <tr key={`btn-${idx}`} className="hover:bg-slate-900/40">
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-mono text-[10px]">
                                  Action CTA
                                </span>
                              </td>
                              <td className="p-2.5 font-bold font-mono text-slate-200">{btn.text}</td>
                              <td className="p-2.5 font-mono text-slate-500 text-[11px]">User Trigger / Event</td>
                              <td className="p-2.5 text-slate-400">{btn.foundOnScreen}</td>
                            </tr>
                          ))}

                        {(inventoryFilter === 'all' || inventoryFilter === 'forms') &&
                          filteredForms.map((form, idx) => (
                            <tr key={`form-${idx}`} className="hover:bg-slate-900/40">
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 font-mono text-[10px]">
                                  Form ({form.inputsCount} inputs)
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-slate-200">Interactive Form</td>
                              <td className="p-2.5 font-mono text-emerald-400 text-[11px] truncate max-w-xs">{form.action || 'Default POST'}</td>
                              <td className="p-2.5 text-slate-400">{form.foundOnScreen}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Consolidated Markdown */}
            {fullUiTab === 'combined-md' && (
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">
                    Consolidated markdown report encompassing all {fullUiResult.screens.length} screens
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullUiResult.consolidatedMarkdown);
                      setCopiedFullMd(true);
                      setTimeout(() => setCopiedFullMd(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    {copiedFullMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFullMd ? 'Copied' : 'Copy Combined Markdown'}</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
                  {fullUiResult.consolidatedMarkdown}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SINGLE SCREEN VIEW (Standard Fetcher Response)        */}
      {/* ---------------------------------------------------- */}
      {scrapeMode === 'single' && currentResponse && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
          {/* Metadata Banner */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-md font-mono font-bold ${
                  currentResponse.status >= 200 && currentResponse.status < 300
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {currentResponse.status} {currentResponse.statusText}
              </span>
              <span className="text-slate-400 font-medium">
                Latency: <strong className="text-slate-200">{currentResponse.responseTimeMs}ms</strong>
              </span>
              <span className="text-slate-400 font-medium">
                Size: <strong className="text-slate-200">{(currentResponse.contentLength / 1024).toFixed(1)} KB</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                  currentResponse.javaScriptEnabled !== false
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Cpu className="w-3 h-3" />
                {currentResponse.javaScriptEnabled !== false ? 'JS Active (V8 Engine)' : 'JS Disabled'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="send-to-adaptive-btn"
                onClick={() => onSendToAdaptive(currentResponse.html)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse in Adaptive Studio</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between px-4 pt-3 border-b border-slate-800 bg-slate-950/30">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'preview'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Rendered View
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'html'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Clean HTML
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'markdown'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                AI Markdown (RAG)
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'headers'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Headers &amp; Stealth Fingerprint
              </button>
            </div>

            <div className="flex items-center gap-2 pb-2">
              <button
                onClick={() => copyContent(activeTab === 'markdown' ? currentResponse.markdown : currentResponse.html)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 min-h-[420px] max-h-[600px] overflow-auto">
            {activeTab === 'preview' && (
              <div className="w-full bg-white rounded-xl overflow-hidden shadow-inner min-h-[400px]">
                <iframe
                  title="Page Preview"
                  srcDoc={currentResponse.html}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[420px] border-0"
                />
              </div>
            )}

            {activeTab === 'html' && (
              <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                {currentResponse.html}
              </pre>
            )}

            {activeTab === 'markdown' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Structured Markdown extraction ready for LLM context / RAG pipeline.</span>
                  <span className="font-mono text-emerald-400">{currentResponse.markdown.length} chars</span>
                </div>
                <pre className="text-xs font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                  {currentResponse.markdown}
                </pre>
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-4 text-xs font-mono">
                {currentResponse.stealthFeaturesApplied && currentResponse.stealthFeaturesApplied.length > 0 && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2">
                    <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Active Stealth Defense Protections
                    </h4>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      {currentResponse.stealthFeaturesApplied.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-slate-400 font-semibold mb-2">HTTP Response Headers</h4>
                  <div className="space-y-1 text-slate-300">
                    {Object.entries(currentResponse.headers).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-emerald-400 font-semibold">{k}:</span>
                        <span className="text-slate-300 break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Promo Callout to trigger Full UI Scraping */}
          <div className="p-3 px-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Want to scrape all internal screens, navigation menus, buttons, and forms of this site?
            </span>
            <button
              onClick={handleScrapeFullUi}
              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>⚡ Scrape Full UI Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
