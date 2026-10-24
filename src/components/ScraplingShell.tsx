import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, Sparkles } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  content: string;
  timestamp: string;
}

export const ScraplingShell: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      content: 'Scrapling Interactive Python Shell (v0.4.0) [Node.js Runtime Engine]',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-2',
      type: 'system',
      content: 'Type "help" or run commands: fetch(url), css(selector), xpath(query), markdown(), adaptive()',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [currentHtml, setCurrentHtml] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    const time = new Date().toLocaleTimeString();
    const userLine: TerminalLine = {
      id: `in_${Date.now()}`,
      type: 'input',
      content: `>>> ${cmd}`,
      timestamp: time,
    };

    setHistory((prev) => [...prev, userLine]);
    setInput('');

    // Process Shell Command
    if (cmd === 'clear' || cmd === 'cls') {
      setHistory([]);
      return;
    }

    if (cmd === 'help') {
      const helpMsg = `Available Scrapling Shell Commands:
  • fetch("https://example.com" [, stealth=True])  - Fetch web page under the radar
  • fetch("ecommerce" | "quotes" | "news")       - Load sample test fixture
  • css(".product-card")                           - Query DOM using CSS selectors
  • css(".title::text")                            - Extract direct text content
  • xpath("//article//h2")                         - Query DOM using XPath 1.0
  • markdown()                                     - Output clean LLM/RAG markdown
  • adaptive()                                     - Run adaptive self-healing selector
  • clear                                          - Clear terminal window`;
      setHistory((prev) => [
        ...prev,
        { id: `out_${Date.now()}`, type: 'output', content: helpMsg, timestamp: time },
      ]);
      return;
    }

    // Match fetch("url")
    const fetchMatch = cmd.match(/^fetch\s*\(\s*["']([^"']+)["']\s*\)/);
    if (fetchMatch) {
      const target = fetchMatch[1];
      try {
        let fixtureId: string | undefined = undefined;
        let fetchUrl = target;
        if (['ecommerce', 'quotes', 'news', 'tables'].includes(target)) {
          fixtureId = target;
          fetchUrl = `https://mock.scrapling.local/${target}`;
        }

        const res = await fetch('/api/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: fetchUrl,
            fixtureId,
            fetcherType: 'StealthyFetcher',
            stealth: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setCurrentHtml(data.html);
        setCurrentUrl(data.url);

        setHistory((prev) => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            type: 'success',
            content: `[Response 200 OK] Fetched ${data.url} (${data.responseTimeMs}ms, ${(data.contentLength / 1024).toFixed(1)} KB, Title: "${data.title}")\nStealth Turnstile Bypass: Active`,
            timestamp: time,
          },
        ]);
      } catch (err: any) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: `FetchError: ${err.message}`, timestamp: time },
        ]);
      }
      return;
    }

    // Match css("selector")
    const cssMatch = cmd.match(/^css\s*\(\s*["']([^"']+)["']\s*\)/);
    if (cssMatch) {
      const sel = cssMatch[1];
      if (!currentHtml) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: 'Error: No page fetched yet. Run fetch("ecommerce") first.', timestamp: time },
        ]);
        return;
      }

      try {
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: currentHtml, selector: sel, queryType: 'css' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const results = (data.elements || []).map((el: any, i: number) => `[${i}] <${el.tag}> ${el.text.slice(0, 70)}`).join('\n');
        setHistory((prev) => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            type: 'output',
            content: `Found ${data.count} element(s) matching "${sel}":\n${results || '(Empty selection)'}`,
            timestamp: time,
          },
        ]);
      } catch (err: any) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: `ParserError: ${err.message}`, timestamp: time },
        ]);
      }
      return;
    }

    // Match xpath("query")
    const xpathMatch = cmd.match(/^xpath\s*\(\s*["']([^"']+)["']\s*\)/);
    if (xpathMatch) {
      const xp = xpathMatch[1];
      if (!currentHtml) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: 'Error: No page fetched yet. Run fetch("ecommerce") first.', timestamp: time },
        ]);
        return;
      }

      try {
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: currentHtml, selector: xp, queryType: 'xpath' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const results = (data.elements || []).map((el: any, i: number) => `[${i}] <${el.tag}> ${el.text.slice(0, 70)}`).join('\n');
        setHistory((prev) => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            type: 'output',
            content: `Found ${data.count} element(s) matching XPath "${xp}":\n${results || '(Empty selection)'}`,
            timestamp: time,
          },
        ]);
      } catch (err: any) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: `XPathError: ${err.message}`, timestamp: time },
        ]);
      }
      return;
    }

    // Match markdown()
    if (cmd.startsWith('markdown')) {
      if (!currentHtml) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: 'Error: No page fetched yet.', timestamp: time },
        ]);
        return;
      }

      try {
        const res = await fetch('/api/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentUrl || 'ecommerce', fixtureId: 'ecommerce' }),
        });
        const data = await res.json();
        setHistory((prev) => [
          ...prev,
          {
            id: `out_${Date.now()}`,
            type: 'output',
            content: `--- Clean LLM Markdown Output ---\n${data.markdown.slice(0, 1000)}...`,
            timestamp: time,
          },
        ]);
      } catch (err: any) {
        setHistory((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: 'error', content: err.message, timestamp: time },
        ]);
      }
      return;
    }

    // Default unknown command
    setHistory((prev) => [
      ...prev,
      {
        id: `err_${Date.now()}`,
        type: 'error',
        content: `NameError: name '${cmd}' is not defined. Type 'help' for command syntax.`,
        timestamp: time,
      },
    ]);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-slate-950/70 font-mono text-xs flex flex-col h-[550px]">
      {/* Terminal Title Bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-slate-400 font-semibold ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            scrapling shell &mdash; {currentUrl || 'idle'}
          </span>
        </div>

        <button
          onClick={() => setHistory([])}
          className="text-slate-500 hover:text-slate-300 transition p-1"
          title="Clear Terminal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Scroll Area */}
      <div className="flex-1 p-4 overflow-auto space-y-2 bg-slate-950/90 text-slate-200">
        {history.map((item) => (
          <div key={item.id} className="leading-relaxed">
            {item.type === 'input' && (
              <span className="text-emerald-400 font-bold">{item.content}</span>
            )}
            {item.type === 'output' && (
              <pre className="text-slate-300 whitespace-pre-wrap font-mono pl-4">{item.content}</pre>
            )}
            {item.type === 'system' && (
              <span className="text-slate-500 italic">{item.content}</span>
            )}
            {item.type === 'success' && (
              <pre className="text-teal-300 whitespace-pre-wrap font-mono pl-4">{item.content}</pre>
            )}
            {item.type === 'error' && (
              <pre className="text-red-400 whitespace-pre-wrap font-mono pl-4">{item.content}</pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command Input Form */}
      <form onSubmit={handleCommand} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">&gt;&gt;&gt;</span>
        <input
          id="shell-command-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="fetch('ecommerce'), css('.product-card'), help..."
          className="flex-1 bg-transparent text-slate-100 focus:outline-none font-mono text-xs placeholder:text-slate-600"
          autoFocus
        />
        <button
          type="submit"
          className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
