import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, Code2, Download } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({ isOpen, onClose }) => {
  const [fetcherType, setFetcherType] = useState('StealthyFetcher');
  const [url, setUrl] = useState('https://example.com/products');
  const [selector, setSelector] = useState('.product-card');
  const [spiderMode, setSpiderMode] = useState(false);
  const [adaptive, setAdaptive] = useState(true);

  const [pythonCode, setPythonCode] = useState('');
  const [cliCommand, setCliCommand] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateCode();
    }
  }, [isOpen, fetcherType, url, selector, spiderMode, adaptive]);

  const generateCode = async () => {
    try {
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fetcherType,
          url,
          selector,
          spiderMode,
          adaptive,
        }),
      });
      const data = await res.json();
      setPythonCode(data.pythonCode);
      setCliCommand(data.cliCommand);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-slate-950 space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Generate Python Scrapling Code</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Architecture</label>
            <select
              value={spiderMode ? 'spider' : 'single'}
              onChange={(e) => setSpiderMode(e.target.value === 'spider')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            >
              <option value="single">Single Fetcher Request</option>
              <option value="spider">Full Spider Crawler</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Engine Class</label>
            <select
              value={fetcherType}
              onChange={(e) => setFetcherType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
            >
              <option value="StealthyFetcher">StealthyFetcher</option>
              <option value="DynamicFetcher">DynamicFetcher</option>
              <option value="Fetcher">Fetcher</option>
              <option value="AsyncFetcher">AsyncFetcher</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">CSS Selector</label>
            <input
              type="text"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
            />
          </div>
        </div>

        {/* Python Code Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Generated Python Script</span>
            <button
              onClick={() => copyToClipboard(pythonCode)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 max-h-64 overflow-auto whitespace-pre">
            {pythonCode}
          </pre>
        </div>

        {/* CLI Snippet */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Equivalent Scrapling CLI Command</span>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
            <span className="truncate">{cliCommand}</span>
            <button
              onClick={() => copyToClipboard(cliCommand)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
