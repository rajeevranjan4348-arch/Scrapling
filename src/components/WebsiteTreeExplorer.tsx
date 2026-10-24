import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileCode, ExternalLink, Globe, Layers, Eye } from 'lucide-react';
import { WebsiteTreeNode, ScrapedItem } from '../types';

interface WebsiteTreeExplorerProps {
  tree: WebsiteTreeNode | null;
  onSelectPage: (item: ScrapedItem) => void;
  items: ScrapedItem[];
}

const TreeNodeItem: React.FC<{
  node: WebsiteTreeNode;
  depth: number;
  onSelectPage: (item: ScrapedItem) => void;
  itemsByUrl: Map<string, ScrapedItem>;
}> = ({ node, depth, onSelectPage, itemsByUrl }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);
  const hasChildren = (node.children && node.children.length > 0) || false;
  const isPage = !!node.pageItem || itemsByUrl.has(node.url);
  const pageItem = node.pageItem || itemsByUrl.get(node.url);

  return (
    <div className="select-none font-sans text-xs">
      <div
        className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-800/60 transition group cursor-pointer ${
          isExpanded && hasChildren ? 'bg-slate-900/40' : ''
        }`}
        style={{ paddingLeft: `${Math.max(8, depth * 16)}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          } else if (pageItem) {
            onSelectPage(pageItem);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              className="p-0.5 text-slate-400 group-hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 inline-block" />
          )}

          {depth === 0 ? (
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : hasChildren ? (
            <Folder className={`w-4 h-4 shrink-0 ${isExpanded ? 'text-amber-400' : 'text-amber-500/80'}`} />
          ) : (
            <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          )}

          <span
            className={`font-mono text-[11px] truncate ${
              depth === 0 ? 'font-bold text-white' : isPage ? 'text-slate-200 group-hover:text-emerald-300' : 'text-slate-400'
            }`}
            title={node.url}
          >
            {node.pathSegment || node.name || '/'}
          </span>

          {node.pageType && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-800/40 shrink-0 capitalize">
              {node.pageType}
            </span>
          )}

          {node.status && (
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0 ${
                node.status >= 200 && node.status < 400
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                  : 'bg-red-950 text-red-400 border border-red-800/40'
              }`}
            >
              {node.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {typeof node.depth === 'number' && (
            <span className="text-[10px] font-mono text-slate-500">
              d:{node.depth}
            </span>
          )}

          {pageItem && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPage(pageItem);
              }}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 font-semibold text-[10px] transition"
              title="Inspect extracted page details"
            >
              <Eye className="w-3 h-3" />
              <span>Inspect</span>
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && node.children && (
        <div className="space-y-0.5 border-l border-slate-800/60 ml-3.5">
          {node.children.map((child, idx) => (
            <TreeNodeItem
              key={idx}
              node={child}
              depth={depth + 1}
              onSelectPage={onSelectPage}
              itemsByUrl={itemsByUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const WebsiteTreeExplorer: React.FC<WebsiteTreeExplorerProps> = ({ tree, onSelectPage, items }) => {
  const itemsByUrl = React.useMemo(() => {
    const map = new Map<string, ScrapedItem>();
    items.forEach((item) => {
      if (item._url) map.set(item._url, item);
      if (item.canonicalUrl) map.set(item.canonicalUrl, item);
    });
    return map;
  }, [items]);

  if (!tree) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono">
        Website hierarchy will appear here during and after the crawl.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium">
        <div className="flex items-center gap-2 text-slate-300">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Website Structural Hierarchy Tree</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {items.length} reachable pages indexed
        </span>
      </div>

      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-h-[500px]">
        <TreeNodeItem
          node={tree}
          depth={0}
          onSelectPage={onSelectPage}
          itemsByUrl={itemsByUrl}
        />
      </div>
    </div>
  );
};
