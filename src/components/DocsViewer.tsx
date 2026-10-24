import React, { useState, useEffect } from 'react';
import { BookOpen, Code, Copy, Check, ExternalLink, Sparkles, Shield, Cpu, Layers } from 'lucide-react';
import { DocArticle } from '../types';

export const DocsViewer: React.FC = () => {
  const [docs, setDocs] = useState<DocArticle[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocArticle | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((data) => {
        if (data.docs && data.docs.length > 0) {
          setDocs(data.docs);
          setSelectedDoc(data.docs[0]);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-950/50 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2">Scrapling Architecture Docs</h3>
        <div className="space-y-1">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full text-left p-3 rounded-xl text-xs transition flex flex-col gap-1 ${
                selectedDoc?.id === doc.id
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
              }`}
            >
              <span className="font-bold">{doc.title}</span>
              <span className="text-[11px] text-slate-400 line-clamp-1">{doc.summary}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Documentation Viewer */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-950/50 space-y-5">
        {selectedDoc ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold">
                  {selectedDoc.category}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{selectedDoc.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{selectedDoc.summary}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedDoc.tags.map((tag) => (
                <span key={tag} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-3 font-sans border-t border-slate-800 pt-4">
              <p>{selectedDoc.content}</p>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Example Usage</span>
                <button
                  onClick={() => copyCode(selectedDoc.id, selectedDoc.codeSnippet)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition"
                >
                  {copiedId === selectedDoc.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === selectedDoc.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                {selectedDoc.codeSnippet}
              </pre>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">Select an article on the left</div>
        )}
      </div>
    </div>
  );
};
