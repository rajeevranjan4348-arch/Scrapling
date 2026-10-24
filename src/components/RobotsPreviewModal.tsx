import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  FileText,
  Code,
  Layers,
  AlertTriangle,
  RefreshCw,
  X,
  Compass,
  Zap,
} from 'lucide-react';
import { RobotsTxtPreviewData, RobotsPathTestResult } from '../types';

interface RobotsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  onSelectSitemap?: (sitemapUrl: string) => void;
}

export const RobotsPreviewModal: React.FC<RobotsPreviewModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  onSelectSitemap,
}) => {
  const [data, setData] = useState<RobotsTxtPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'parsed' | 'raw' | 'tester'>('parsed');
  const [selectedUserAgent, setSelectedUserAgent] = useState<string>('*');
  const [testPath, setTestPath] = useState<string>('/admin');
  const [testResult, setTestResult] = useState<RobotsPathTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Fetch preview on open or targetUrl change
  const fetchPreview = async (urlToFetch: string) => {
    if (!urlToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/robots-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlToFetch,
          userAgent: selectedUserAgent || 'Scrapling',
          testPath: testPath || '/',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to inspect robots.txt');
      setData(result);
      if (result.testResult) {
        setTestResult(result.testResult);
      }
      if (result.groups && result.groups.length > 0) {
        setSelectedUserAgent(result.groups[0].userAgent);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching robots.txt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetUrl) {
      fetchPreview(targetUrl);
    }
  }, [isOpen, targetUrl]);

  // Run path tester dynamically
  const runPathTest = async (pathToTest: string, ua: string) => {
    if (!data?.rawContent) return;
    setTestLoading(true);
    try {
      const res = await fetch('/api/robots-test-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: data.rawContent,
          path: pathToTest,
          userAgent: ua || '*',
        }),
      });
      const resData = await res.json();
      setTestResult(resData);
    } catch (err) {
      console.error(err);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyRaw = () => {
    if (!data?.rawContent) return;
    navigator.clipboard.writeText(data.rawContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentGroup = data?.groups.find(
    (g) => g.userAgent.toLowerCase() === selectedUserAgent.toLowerCase()
  ) || data?.groups[0];

  const totalDisallowed = data?.groups.reduce((acc, g) => acc + g.disallow.length, 0) || 0;
  const totalAllowed = data?.groups.reduce((acc, g) => acc + g.allow.length, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl shadow-slate-950/80 flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">robots.txt Directives Inspector</h3>
                {data && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      data.found
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    HTTP {data.status} {data.found ? 'Directives Found' : 'Permissive (No File)'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">
                {data?.robotsUrl || `${targetUrl.replace(/\/+$/, '')}/robots.txt`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-robots-btn"
              onClick={() => fetchPreview(targetUrl)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-50"
              title="Refresh robots.txt"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="close-robots-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && !data && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-xs font-mono">Fetching and parsing robots.txt from target host...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-1">Failed to inspect robots.txt</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Summary Metric Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">User-Agents</span>
                  <strong className="text-base font-mono text-sky-400">{data.groups.length} groups</strong>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Disallowed Rules</span>
                  <strong className="text-base font-mono text-red-400">{totalDisallowed} paths</strong>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Allowed Rules</span>
                  <strong className="text-base font-mono text-emerald-400">{totalAllowed} paths</strong>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Sitemaps</span>
                  <strong className="text-base font-mono text-teal-400">{data.sitemaps.length} found</strong>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Crawl Delay</span>
                  <strong className="text-base font-mono text-amber-400">
                    {currentGroup?.crawlDelay !== undefined ? `${currentGroup.crawlDelay}s` : 'None specified'}
                  </strong>
                </div>
              </div>

              {/* Interactive Path Permissibility Tester */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Live Route Permissibility Tester</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Simulate scraper path verification before crawl</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-3">
                    <select
                      value={selectedUserAgent}
                      onChange={(e) => {
                        setSelectedUserAgent(e.target.value);
                        runPathTest(testPath, e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    >
                      {data.groups.map((g, idx) => (
                        <option key={idx} value={g.userAgent}>
                          User-agent: {g.userAgent}
                        </option>
                      ))}
                      <option value="Scrapling">User-agent: Scrapling</option>
                    </select>
                  </div>

                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={testPath}
                      onChange={(e) => {
                        setTestPath(e.target.value);
                        runPathTest(e.target.value, selectedUserAgent);
                      }}
                      placeholder="Enter path to test, e.g. /admin, /category/laptops, /checkout"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      id="test-path-btn"
                      onClick={() => runPathTest(testPath, selectedUserAgent)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
                    >
                      <span>Evaluate</span>
                    </button>
                  </div>
                </div>

                {/* Test Verdict Banner */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-3 text-xs transition ${
                      testResult.isAllowed
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-950/40 border-red-500/30 text-red-300'
                    }`}
                  >
                    {testResult.isAllowed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-sm">
                          {testResult.isAllowed ? '✅ Permitted to Crawl' : '🚫 Crawl Restricted / Blocked'}
                        </strong>
                        {testResult.matchedRule && (
                          <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                            {testResult.matchedRule}
                          </code>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90">{testResult.reason}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sitemaps Reference Box */}
              {data.sitemaps.length > 0 && (
                <div className="p-3.5 bg-slate-950 border border-teal-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                      <Compass className="w-4 h-4" />
                      <span>Discovered Sitemap Directives ({data.sitemaps.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Can be used as starting seeds</span>
                  </div>
                  <div className="space-y-1.5">
                    {data.sitemaps.map((sitemap, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono"
                      >
                        <span className="text-slate-300 truncate">{sitemap}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onSelectSitemap && (
                            <button
                              id={`use-sitemap-${i}`}
                              onClick={() => {
                                onSelectSitemap(sitemap);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[11px] font-semibold transition"
                            >
                              Use as Seed
                            </button>
                          )}
                          <a
                            href={sitemap}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    id="tab-parsed-rules"
                    onClick={() => setActiveTab('parsed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeTab === 'parsed'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Parsed Rules by User-Agent</span>
                  </button>

                  <button
                    id="tab-raw-content"
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      activeTab === 'raw'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Raw robots.txt Content</span>
                  </button>
                </div>

                {activeTab === 'parsed' && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Filter rules..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500 w-44"
                    />
                  </div>
                )}

                {activeTab === 'raw' && (
                  <button
                    id="copy-raw-robots-btn"
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Parsed Rules Breakdown */}
              {activeTab === 'parsed' && (
                <div className="space-y-4">
                  {data.groups.map((group, gIdx) => {
                    const disallows = group.disallow.filter((r) =>
                      r.toLowerCase().includes(filterQuery.toLowerCase())
                    );
                    const allows = group.allow.filter((r) =>
                      r.toLowerCase().includes(filterQuery.toLowerCase())
                    );

                    if (filterQuery && disallows.length === 0 && allows.length === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={gIdx}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="text-slate-400">User-agent:</span>
                            <strong className="text-sky-400 bg-sky-950/50 px-2 py-0.5 rounded border border-sky-500/20">
                              {group.userAgent}
                            </strong>
                          </div>
                          {group.crawlDelay !== undefined && (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              <span>Crawl-delay: {group.crawlDelay}s</span>
                            </span>
                          )}
                        </div>

                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Disallow column */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-red-400">
                              <span>Disallowed Paths ({group.disallow.length})</span>
                            </div>
                            {disallows.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No disallow directives matching.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                                {disallows.map((rule, rIdx) => (
                                  <span
                                    key={rIdx}
                                    onClick={() => {
                                      setTestPath(rule);
                                      runPathTest(rule, group.userAgent);
                                    }}
                                    className="cursor-pointer font-mono text-[11px] px-2 py-0.5 rounded bg-red-950/40 border border-red-500/20 text-red-300 hover:border-red-400 transition"
                                    title="Click to test path"
                                  >
                                    {rule}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Allow column */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                              <span>Allowed Paths ({group.allow.length})</span>
                            </div>
                            {allows.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">
                                No explicit allow directives (default permitted if not disallowed).
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                                {allows.map((rule, rIdx) => (
                                  <span
                                    key={rIdx}
                                    onClick={() => {
                                      setTestPath(rule);
                                      runPathTest(rule, group.userAgent);
                                    }}
                                    className="cursor-pointer font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 hover:border-emerald-400 transition"
                                    title="Click to test path"
                                  >
                                    {rule}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Raw robots.txt Content */}
              {activeTab === 'raw' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap leading-relaxed">{data.rawContent}</pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Scrapling automatically honors robots.txt Disallow directives during full crawls.</span>
          </div>
          <button
            id="done-robots-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
