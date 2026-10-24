import React, { useState, useEffect } from 'react';
import { Sparkles, Search, BookmarkCheck, CheckCircle, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert, Cpu, Layers, Tag, Eye } from 'lucide-react';
import { ExtractedElement, ElementFingerprint, AdaptiveMatchResult } from '../types';

interface AdaptiveParserStudioProps {
  html: string;
  setHtml: (html: string) => void;
}

export const AdaptiveParserStudio: React.FC<AdaptiveParserStudioProps> = ({ html, setHtml }) => {
  const [selector, setSelector] = useState('.product-card');
  const [queryType, setQueryType] = useState<'css' | 'xpath' | 'text' | 'regex'>('css');
  const [elements, setElements] = useState<ExtractedElement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Adaptive Storage state
  const [fingerprints, setFingerprints] = useState<ElementFingerprint[]>([]);
  const [selectedFingerprint, setSelectedFingerprint] = useState<ElementFingerprint | null>(null);
  const [adaptiveResult, setAdaptiveResult] = useState<AdaptiveMatchResult | null>(null);
  const [isSimulatingRedesign, setIsSimulatingRedesign] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Run initial parse if HTML is available
  useEffect(() => {
    if (html) {
      handleParse();
    }
    loadFingerprints();
  }, [html]);

  const loadFingerprints = async () => {
    try {
      const res = await fetch('/api/adaptive/list');
      const data = await res.json();
      if (data.fingerprints) setFingerprints(data.fingerprints);
    } catch (e) {
      console.error(e);
    }
  };

  const handleParse = async () => {
    if (!html) return;
    setLoading(true);
    setError(null);
    setAdaptiveResult(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, selector, queryType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setElements(data.elements || []);
    } catch (err: any) {
      setError(err.message);
      setElements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSaveFingerprint = async () => {
    if (!selector || !html) return;
    try {
      const res = await fetch('/api/adaptive/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selector,
          html,
          name: `Adaptive Rule for ${selector}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSaveSuccessMsg(data.message);
      setSelectedFingerprint(data.fingerprint);
      loadFingerprints();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSimulateWebsiteRedesign = async () => {
    setIsSimulatingRedesign(true);
    setError(null);

    try {
      // Fetch the mutated fixture HTML
      const res = await fetch('/api/fixtures/ecommerce');
      const fixtureData = await res.json();
      const mutated = fixtureData.mutatedHtml || fixtureData.html;

      setHtml(mutated);

      // Now run adaptive relocation using the stored fingerprint
      const locateRes = await fetch('/api/adaptive/locate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSelector: selector,
          fingerprintId: selectedFingerprint?.id,
          currentHtml: mutated,
        }),
      });

      const matchData = await locateRes.json();
      if (!locateRes.ok) throw new Error(matchData.error);

      setAdaptiveResult(matchData);
      setElements(matchData.elements || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSimulatingRedesign(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Query Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-slate-950/50">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            {/* Query Mode */}
            <div className="sm:w-36">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Selector Type</label>
              <select
                id="query-type-select"
                value={queryType}
                onChange={(e) => setQueryType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="css">CSS (.class, #id)</option>
                <option value="xpath">XPath (//tag[@attr])</option>
                <option value="text">Text Contains</option>
                <option value="regex">Regex Match</option>
              </select>
            </div>

            {/* Selector Input */}
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Scrapling Query Expression</label>
              <div className="relative">
                <input
                  id="selector-query-input"
                  type="text"
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder="e.g. .product-card, h2::text, a::attr(href)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500 transition pr-20"
                />
                <button
                  id="query-execute-btn"
                  onClick={handleParse}
                  disabled={loading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Execute</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Selectors & Adaptive Actions */}
        <div className="pt-3 mt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 text-[11px] font-semibold">Presets:</span>
            {['.product-card', '.product-title::text', '.price-current', 'a::attr(href)', '.badge', '//article'].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setSelector(preset);
                  setQueryType(preset.startsWith('//') ? 'xpath' : 'css');
                }}
                className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="auto-save-fingerprint-btn"
              onClick={handleAutoSaveFingerprint}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Learn Fingerprint (auto_save=True)</span>
            </button>

            <button
              id="simulate-redesign-btn"
              onClick={handleSimulateWebsiteRedesign}
              disabled={isSimulatingRedesign}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingRedesign ? 'animate-spin' : ''}`} />
              <span>Simulate Website Redesign (adaptive=True)</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Adaptive Relocation Match Result Banner */}
      {adaptiveResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-white">Scrapling Self-Healing Relocation Report</h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Confidence: <strong className="text-emerald-400">{adaptiveResult.confidenceScore}%</strong>
              </span>
              <span className={`px-2 py-0.5 rounded font-bold ${
                !adaptiveResult.foundWithOriginal && adaptiveResult.foundWithAdaptive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                Adaptive: SUCCESS
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            {adaptiveResult.differencesDetected.map((diff, i) => (
              <p key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{diff}</span>
              </p>
            ))}
            <p className="text-slate-400 font-mono pt-1">
              Match Reasons: <span className="text-slate-200">{adaptiveResult.matchReason}</span>
            </p>
          </div>
        </div>
      )}

      {/* Extracted Elements List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/50">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white">Extracted Nodes</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
              {elements.length} matches
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Scrapling Parser v0.4.0</span>
        </div>

        {elements.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No elements matched the current selector. Try adjusting query or click presets above.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-[550px] overflow-auto">
            {elements.map((elem, idx) => (
              <div key={elem.id || idx} className="p-4 hover:bg-slate-800/30 transition space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800/60">
                      &lt;{elem.tag}&gt;
                    </span>
                    <span className="font-mono text-slate-400">{elem.cssPath}</span>
                  </div>
                  {elem.score && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                      Match Score: {elem.score}%
                    </span>
                  )}
                </div>

                {elem.text && (
                  <div className="text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 font-sans">
                    {elem.text}
                  </div>
                )}

                {Object.keys(elem.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(elem.attributes).map(([k, v]) => (
                      <span key={k} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        <strong className="text-slate-300">{k}</strong>="{String(v)}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
