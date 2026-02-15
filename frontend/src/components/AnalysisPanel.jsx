import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Server,
  FileCode,
  Wrench,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function AnalysisPanel({
  analysis,
  generatedFix,
  isAnalyzing,
  isGeneratingFix,
  onGenerateFix,
  onClose
}) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    propagation: false,
    code: false,
    fix: true
  });
  const [copied, setCopied] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const downloadFix = () => {
    if (!generatedFix?.fixedCode) return;
    const blob = new Blob([generatedFix.fixedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFix.fileName || 'fix.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      CRITICAL: 'text-red-400 bg-red-500/20',
      HIGH: 'text-orange-400 bg-orange-500/20',
      MEDIUM: 'text-yellow-400 bg-yellow-500/20',
      LOW: 'text-blue-400 bg-blue-500/20'
    };
    return colors[severity] || colors.MEDIUM;
  };

  const { analysis: errorAnalysis, codeLocation, correlation } = analysis || {};

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-white">Analysis</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-dark-600 rounded text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Loading state */}
      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
          <p className="text-white font-medium">Analyzing error...</p>
          <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* No analysis yet */}
      {!isAnalyzing && !analysis && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-500 mb-4" />
          <p className="text-gray-400">No analysis available</p>
          <p className="text-gray-500 text-sm mt-1">Click on an error log or use the Analyze button</p>
        </div>
      )}

      {/* Analysis content */}
      {!isAnalyzing && analysis && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Summary Section */}
          <div className="bg-dark-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('summary')}
              className="w-full flex items-center justify-between p-3 hover:bg-dark-600/50"
            >
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-red-400" />
                <span className="font-medium text-white text-sm">Error Summary</span>
              </div>
              {expandedSections.summary ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {expandedSections.summary && (
              <div className="p-3 border-t border-dark-600 space-y-3">
                {/* Root Cause */}
                <div>
                  <div className="text-xs text-gray-400 mb-1">Root Cause</div>
                  <p className="text-white text-sm">{errorAnalysis?.rootCause || 'Unknown error'}</p>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Origin</div>
                    <div className="text-sm text-white">{errorAnalysis?.originService || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Severity</div>
                    <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(errorAnalysis?.severity)}`}>
                      {errorAnalysis?.severity || 'MEDIUM'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Type</div>
                    <div className="text-sm text-white">{errorAnalysis?.errorType || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Services Affected</div>
                    <div className="text-sm text-white">{errorAnalysis?.affectedServices?.length || correlation?.affectedServices?.length || 1}</div>
                  </div>
                </div>

                {/* Technical Details */}
                {errorAnalysis?.technicalDetails && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Details</div>
                    <p className="text-gray-300 text-xs">{errorAnalysis.technicalDetails}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Propagation Path */}
          {errorAnalysis?.propagationPath?.length > 0 && (
            <div className="bg-dark-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('propagation')}
                className="w-full flex items-center justify-between p-3 hover:bg-dark-600/50"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium text-white text-sm">Error Flow</span>
                </div>
                {expandedSections.propagation ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {expandedSections.propagation && (
                <div className="p-3 border-t border-dark-600 space-y-2">
                  {errorAnalysis.propagationPath.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-dark-600 flex items-center justify-center text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-gray-300 text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Code Location */}
          {codeLocation && (
            <div className="bg-dark-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('code')}
                className="w-full flex items-center justify-between p-3 hover:bg-dark-600/50"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-white text-sm">Code Location</span>
                  <span className="text-xs text-gray-400">{codeLocation.fileName}:{codeLocation.lineNumber}</span>
                </div>
                {expandedSections.code ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {expandedSections.code && (
                <div className="p-3 border-t border-dark-600 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">File:</span>
                      <span className="text-white ml-1">{codeLocation.fileName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Function:</span>
                      <span className="text-white ml-1">{codeLocation.functionName}</span>
                    </div>
                  </div>

                  {codeLocation.codeSnippet && (
                    <div className="rounded-lg overflow-hidden">
                      <SyntaxHighlighter
                        language="javascript"
                        style={oneDark}
                        customStyle={{ margin: 0, fontSize: '11px', padding: '0.75rem' }}
                        showLineNumbers
                      >
                        {codeLocation.codeSnippet}
                      </SyntaxHighlighter>
                    </div>
                  )}

                  {codeLocation.explanation && (
                    <p className="text-gray-300 text-xs">{codeLocation.explanation}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generate Fix Button */}
          {!generatedFix && (
            <button
              onClick={onGenerateFix}
              disabled={isGeneratingFix}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              {isGeneratingFix ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Fix...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  Generate Fix
                </>
              )}
            </button>
          )}

          {/* Generated Fix */}
          {generatedFix && (
            <div className="bg-dark-700 rounded-lg overflow-hidden border border-green-500/30">
              <button
                onClick={() => toggleSection('fix')}
                className="w-full flex items-center justify-between p-3 hover:bg-dark-600/50"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-medium text-white text-sm">Generated Fix</span>
                </div>
                {expandedSections.fix ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {expandedSections.fix && (
                <div className="p-3 border-t border-dark-600 space-y-3">
                  {/* Changes */}
                  {generatedFix.changes?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Changes</div>
                      <div className="space-y-1">
                        {generatedFix.changes.map((change, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-300 text-xs">{change}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {generatedFix.explanation && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Explanation</div>
                      <p className="text-gray-300 text-xs">{generatedFix.explanation}</p>
                    </div>
                  )}

                  {/* Fixed Code Preview */}
                  {generatedFix.fixedCode && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-400">Fixed Code</div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(generatedFix.fixedCode)}
                            className="p-1 hover:bg-dark-600 rounded text-gray-400 hover:text-white"
                            title="Copy"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={downloadFix}
                            className="p-1 hover:bg-dark-600 rounded text-gray-400 hover:text-white"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                        <SyntaxHighlighter
                          language="javascript"
                          style={oneDark}
                          customStyle={{ margin: 0, fontSize: '11px', padding: '0.75rem' }}
                          showLineNumbers
                        >
                          {generatedFix.fixedCode.substring(0, 2000) + (generatedFix.fixedCode.length > 2000 ? '\n// ... (truncated)' : '')}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  )}

                  {/* Prevention Tips */}
                  {generatedFix.preventionTips && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                      <div className="text-xs text-blue-400 mb-1">Prevention Tips</div>
                      <p className="text-gray-300 text-xs">{generatedFix.preventionTips}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalysisPanel;
