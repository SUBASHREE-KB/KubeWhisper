import React, { useState, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, FileCode, ArrowRight } from 'lucide-react';

function CodeDiffViewer({ originalCode, fixedCode, fileName }) {
  const [view, setView] = useState('split'); // split, original, fixed
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedFixed, setCopiedFixed] = useState(false);

  // Calculate diff information
  const diffInfo = useMemo(() => {
    if (!originalCode || !fixedCode) {
      return { added: 0, removed: 0, changed: 0 };
    }

    const originalLines = originalCode.split('\n');
    const fixedLines = fixedCode.split('\n');

    let added = 0;
    let removed = 0;

    // Simple line count diff
    if (fixedLines.length > originalLines.length) {
      added = fixedLines.length - originalLines.length;
    } else if (originalLines.length > fixedLines.length) {
      removed = originalLines.length - fixedLines.length;
    }

    // Count changed lines
    let changed = 0;
    const minLength = Math.min(originalLines.length, fixedLines.length);
    for (let i = 0; i < minLength; i++) {
      if (originalLines[i] !== fixedLines[i]) {
        changed++;
      }
    }

    return { added, removed, changed };
  }, [originalCode, fixedCode]);

  // Copy to clipboard
  const copyToClipboard = async (text, isOriginal) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isOriginal) {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedFixed(true);
        setTimeout(() => setCopiedFixed(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download file
  const downloadFile = (content, suffix = '') => {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName?.replace('.js', '')}${suffix}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!originalCode && !fixedCode) {
    return (
      <div className="bg-dark-800 rounded-lg border border-dark-600 p-8 text-center">
        <FileCode className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-400">No code available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileCode className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-white font-medium">{fileName || 'code.js'}</span>

          {/* Diff stats */}
          <div className="flex items-center gap-2 text-xs">
            {diffInfo.added > 0 && (
              <span className="text-green-400">+{diffInfo.added} lines</span>
            )}
            {diffInfo.removed > 0 && (
              <span className="text-red-400">-{diffInfo.removed} lines</span>
            )}
            {diffInfo.changed > 0 && (
              <span className="text-yellow-400">~{diffInfo.changed} changed</span>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => setView('split')}
            className={`px-3 py-1 text-xs rounded ${
              view === 'split'
                ? 'bg-dark-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setView('original')}
            className={`px-3 py-1 text-xs rounded ${
              view === 'original'
                ? 'bg-dark-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setView('fixed')}
            className={`px-3 py-1 text-xs rounded ${
              view === 'fixed'
                ? 'bg-dark-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Fixed
          </button>
        </div>
      </div>

      {/* Code panels */}
      <div className={`grid ${view === 'split' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Original code */}
        {(view === 'split' || view === 'original') && (
          <div className="bg-dark-900 rounded-lg border border-dark-600 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-dark-600 bg-dark-800">
              <span className="text-xs text-red-400 font-medium">Original</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(originalCode, true)}
                  className="p-1 hover:bg-dark-700 rounded text-gray-400 hover:text-white"
                  title="Copy to clipboard"
                >
                  {copiedOriginal ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              <SyntaxHighlighter
                language="javascript"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  fontSize: '12px',
                  padding: '1rem'
                }}
                showLineNumbers
                wrapLines
              >
                {originalCode || '// No original code available'}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        {/* Arrow indicator for split view */}
        {view === 'split' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex">
            <div className="bg-dark-700 rounded-full p-2 border border-dark-600">
              <ArrowRight className="w-4 h-4 text-green-400" />
            </div>
          </div>
        )}

        {/* Fixed code */}
        {(view === 'split' || view === 'fixed') && (
          <div className="bg-dark-900 rounded-lg border border-green-500/30 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-dark-600 bg-dark-800">
              <span className="text-xs text-green-400 font-medium">Fixed</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyToClipboard(fixedCode, false)}
                  className="p-1 hover:bg-dark-700 rounded text-gray-400 hover:text-white"
                  title="Copy to clipboard"
                >
                  {copiedFixed ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => downloadFile(fixedCode, '-fixed')}
                  className="p-1 hover:bg-dark-700 rounded text-gray-400 hover:text-white"
                  title="Download fixed file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              <SyntaxHighlighter
                language="javascript"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  background: 'transparent',
                  fontSize: '12px',
                  padding: '1rem'
                }}
                showLineNumbers
                wrapLines
              >
                {fixedCode || '// No fixed code available'}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => copyToClipboard(fixedCode, false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded text-sm text-white transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy Fixed Code
        </button>
        <button
          onClick={() => downloadFile(fixedCode, '-fixed')}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded text-sm text-green-400 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Fix
        </button>
      </div>
    </div>
  );
}

export default CodeDiffViewer;
