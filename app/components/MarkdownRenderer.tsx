'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-[#333333] my-6 shadow-2xl bg-[#1e1e1e] group/code">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#252526] border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500/30"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500/30"></div>
            <div className="w-2 h-2 rounded-full bg-green-500/30"></div>
          </div>
          {language && (
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] font-mono">
              {language}
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all active:scale-90 border ${
            copied 
              ? 'bg-green-600/10 text-green-400 border-green-600/30' 
              : 'bg-[#1e1e1e] text-zinc-500 hover:text-zinc-300 border-[#333333] hover:border-[#444444]'
          }`}
        >
          <span className="material-symbols-outlined text-[12px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider">
            {copied ? 'Tersalin' : 'Salin'}
          </span>
        </button>
      </div>
      
      <div className="relative">
        <SyntaxHighlighter
          style={atomDark}
          language={language || 'text'}
          PreTag="div"
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            fontSize: '13px',
            lineHeight: '1.7',
            backgroundColor: 'transparent',
            fontFamily: "'Fira Code', 'Courier New', monospace",
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const content = String(children).replace(/\n$/, '');
            
            // In react-markdown v9+, 'inline' prop is removed.
            // We detect inline if there's no language class AND no newlines in content.
            const isInline = !className && !String(children).includes('\n');
            
            if (isInline) {
              return (
                <code className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-zinc-200 font-mono text-[0.9em] font-normal" {...props}>
                  {children}
                </code>
              );
            }

            return <CodeBlock language={language} value={content} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
