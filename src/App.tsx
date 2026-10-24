import React, { useState } from 'react';
import { Header } from './components/Header';
import { FetcherStudio } from './components/FetcherStudio';
import { AdaptiveParserStudio } from './components/AdaptiveParserStudio';
import { SpiderCrawlerStudio } from './components/SpiderCrawlerStudio';
import { ScraplingShell } from './components/ScraplingShell';
import { DocsViewer } from './components/DocsViewer';
import { CodeExportModal } from './components/CodeExportModal';
import { FetchResponseData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'fetcher' | 'adaptive' | 'spider' | 'shell' | 'docs'>('fetcher');
  const [currentResponse, setCurrentResponse] = useState<FetchResponseData | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const handleSendToAdaptive = (html: string) => {
    setHtmlContent(html);
    setActiveTab('adaptive');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCodeModal={() => setIsCodeModalOpen(true)}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'fetcher' && (
          <FetcherStudio
            currentResponse={currentResponse}
            setCurrentResponse={(resp) => {
              setCurrentResponse(resp);
              if (resp?.html) {
                setHtmlContent(resp.html);
              }
            }}
            onSendToAdaptive={handleSendToAdaptive}
          />
        )}

        {activeTab === 'adaptive' && (
          <AdaptiveParserStudio
            html={htmlContent || currentResponse?.html || ''}
            setHtml={setHtmlContent}
          />
        )}

        {activeTab === 'spider' && <SpiderCrawlerStudio />}

        {activeTab === 'shell' && <ScraplingShell />}

        {activeTab === 'docs' && <DocsViewer />}
      </main>

      {/* Code Export Modal */}
      <CodeExportModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />
    </div>
  );
}
