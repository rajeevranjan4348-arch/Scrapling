import React, { useState } from 'react';
import { X, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Database, Tag, Copy, Check, Layers, Code, Sparkles, BookOpen } from 'lucide-react';
import { ScrapedItem } from '../types';

interface CrawledPageDetailModalProps {
  page: ScrapedItem | null;
  onClose: () => void;
}

export const CrawledPageDetailModal: React.FC<CrawledPageDetailModalProps> = ({ page, onClose }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'ui' | 'headings' | 'links' | 'images' | 'metadata' | 'jsonld' | 'markdown'>('content');
  const [copied, setCopied] = useState(false);

  if (!page) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(page.markdown || page.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/50">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${page._status >= 200 && page._status < 400 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/80 text-red-400 border border-red-500/30'}`}>
                HTTP {page._status}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-500/30">
                Depth {page._depth ?? 0}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/30 capitalize">
                {page.pageType || 'General Page'}
              </span>
              {page._responseTimeMs && (
                <span className="text-[11px] font-mono text-slate-400">
                  {page._responseTimeMs}ms
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white truncate" title={page.title}>
              {page.title || 'Untitled Page'}
            </h3>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <a
                href={page._url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 truncate max-w-lg"
              >
                <span>{page._url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'content' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Main Content</span>
          </button>

          <button
            onClick={() => setActiveTab('ui')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'ui' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>UI Components &amp; Controls</span>
          </button>

          <button
            onClick={() => setActiveTab('headings')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'headings' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Headings (H1–H6)</span>
          </button>

          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'links' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Discovered Links ({page.links?.length || page.internalLinksCount || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'images' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images ({page.images?.length || page.imagesCount || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'metadata' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Meta &amp; OpenGraph</span>
          </button>

          <button
            onClick={() => setActiveTab('jsonld')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'jsonld' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Structured Data ({page.structuredData?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-semibold transition shrink-0 ${
              activeTab === 'markdown' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
          {/* 1. Main Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {page.metaDescription && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Meta Description</span>
                  <p className="text-slate-200 leading-relaxed">{page.metaDescription}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">Clean Readable Body Text</span>
                  <span className="text-[10px] font-mono text-slate-500">{page.content?.length || 0} characters</span>
                </div>
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-sans text-slate-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {page.content || 'No readable text content extracted.'}
                </div>
              </div>

              {page.paragraphs && page.paragraphs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300">Extracted Paragraphs ({page.paragraphs.length})</span>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {page.paragraphs.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg text-slate-300 leading-relaxed">
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {page.tables && page.tables.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-300">Extracted Tables ({page.tables.length})</span>
                  {page.tables.map((tbl, tIdx) => (
                    <div key={tIdx} className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                      <table className="w-full text-[11px] text-left border-collapse">
                        {tbl.headers.length > 0 && (
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-300">
                              {tbl.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody className="divide-y divide-slate-800/60">
                          {tbl.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/30">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2 text-slate-300 font-mono">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UI Components & Controls Tab */}
          {activeTab === 'ui' && (
            <div className="space-y-4">
              {/* Layout summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Header Nav</span>
                  <span className={`text-xs font-bold ${page.uiElements?.hasHeader ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {page.uiElements?.hasHeader ? 'Detected' : 'None'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Footer Nav</span>
                  <span className={`text-xs font-bold ${page.uiElements?.hasFooter ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {page.uiElements?.hasFooter ? 'Detected' : 'None'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Sidebar Nav</span>
                  <span className={`text-xs font-bold ${page.uiElements?.hasSidebar ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {page.uiElements?.hasSidebar ? 'Detected' : 'None'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Action Buttons</span>
                  <span className="text-xs font-bold text-sky-400">
                    {page.uiElements?.actionButtons?.length || 0}
                  </span>
                </div>
              </div>

              {/* Action Buttons & CTAs */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">Action Buttons &amp; Call-to-Actions</span>
                  <span className="text-[10px] font-mono text-emerald-400">{page.uiElements?.actionButtons?.length || 0} buttons</span>
                </div>
                {(!page.uiElements?.actionButtons || page.uiElements.actionButtons.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No action buttons detected on this screen.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {page.uiElements.actionButtons.map((btn, idx) => (
                      <div key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] flex items-center gap-1.5">
                        <span className="text-emerald-400 font-bold">&gt;</span>
                        <span>{btn.text}</span>
                        {btn.disabled && <span className="text-[9px] px-1 py-0.2 bg-red-950 text-red-400 rounded">Disabled</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Screen Navigation Links */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">Screen Navigation Menu Links</span>
                  <span className="text-[10px] font-mono text-emerald-400">{page.uiElements?.navigation?.length || 0} links</span>
                </div>
                {(!page.uiElements?.navigation || page.uiElements.navigation.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No dedicated navigation links detected.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                    {page.uiElements.navigation.map((n, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-slate-200 font-medium truncate">{n.text}</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">{n.href}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Forms & Inputs */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">Interactive Forms &amp; Inputs</span>
                  <span className="text-[10px] font-mono text-emerald-400">{page.uiElements?.forms?.length || 0} forms</span>
                </div>
                {(!page.uiElements?.forms || page.uiElements.forms.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No input forms detected on this screen.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {page.uiElements.forms.map((f, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">Form #{idx + 1} {f.id ? `(${f.id})` : ''}</span>
                          <span className="text-slate-400">{f.method} &rarr; {f.action || page._url}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {f.inputs.map((inp, iIdx) => (
                            <span key={iIdx} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] border border-slate-800">
                              {inp.name || 'input'} [{inp.type}] {inp.placeholder ? `"${inp.placeholder}"` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Headings Tab */}
          {activeTab === 'headings' && (
            <div className="space-y-3">
              {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((tag) => {
                const list = page.headings?.[tag] || [];
                return (
                  <div key={tag} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 uppercase">{tag} ({list.length})</span>
                    </div>
                    {list.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">None found</span>
                    ) : (
                      <ul className="space-y-1 pl-2">
                        {list.map((h, i) => (
                          <li key={i} className="text-slate-200 font-medium flex items-start gap-2">
                            <span className="text-slate-500 font-mono select-none">&bull;</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Discovered Links Tab */}
          {activeTab === 'links' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">Links extracted from this page</span>
                <span className="text-[10px] font-mono text-slate-400">
                  Internal: {page.internalLinksCount || 0} | External: {page.externalLinksCount || 0}
                </span>
              </div>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 max-h-96 overflow-y-auto">
                {(page.links || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No links listed</div>
                ) : (
                  (page.links || []).map((link, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-3 text-[11px]">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-slate-200 font-medium truncate">{link.anchorText || '[No anchor text]'}</div>
                        <div className="text-emerald-400 font-mono truncate">{link.url}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] shrink-0 ${link.isInternal ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {link.isInternal ? 'Internal' : 'External'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-3">
              {(page.images || []).length === 0 ? (
                <div className="p-12 text-center text-slate-500">No images extracted on this page</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(page.images || []).map((img, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="h-28 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                        <img
                          src={img.src}
                          alt={img.alt || 'Extracted'}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="text-slate-300 font-sans truncate font-medium" title={img.alt}>
                          Alt: <span className="text-slate-400">{img.alt || 'None'}</span>
                        </div>
                        <div className="text-emerald-400 truncate text-[10px]" title={img.src}>
                          {img.src}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">Canonical URL:</span>
                  <span className="text-emerald-400 max-w-md truncate">{page.canonicalUrl || page._url}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">OpenGraph Title:</span>
                  <span className="text-slate-200">{page.metadata?.ogTitle || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">OpenGraph Type:</span>
                  <span className="text-slate-200">{page.metadata?.ogType || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">OpenGraph Image:</span>
                  <span className="text-emerald-400 max-w-md truncate">{page.metadata?.ogImage || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">Author:</span>
                  <span className="text-slate-200">{page.metadata?.author || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-semibold">Language:</span>
                  <span className="text-slate-200">{page.metadata?.language || 'en'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Crawl Timestamp:</span>
                  <span className="text-slate-400">{page._timestamp}</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. JSON-LD Tab */}
          {activeTab === 'jsonld' && (
            <div className="space-y-3">
              {(page.structuredData || []).length === 0 ? (
                <div className="p-12 text-center text-slate-500">No JSON-LD structured data tags on this page</div>
              ) : (
                (page.structuredData || []).map((json, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Schema @type: {json['@type'] || 'Object'}</span>
                    <pre className="p-3 bg-slate-900 rounded-lg text-emerald-300 font-mono text-[11px] overflow-x-auto leading-normal">
                      {JSON.stringify(json, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 7. Markdown Tab */}
          {activeTab === 'markdown' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300">Clean Turndown Markdown</span>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {page.markdown || page.content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">ID: {page._id}</span>
          <button
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
