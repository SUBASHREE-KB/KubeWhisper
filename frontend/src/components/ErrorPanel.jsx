import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Server,
  Code,
  Wrench,
  Zap,
  CheckCircle,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Target,
  ArrowRight,
  History,
  Lightbulb
} from 'lucide-react';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function ErrorPanel({
  analysis,
  generatedFix,
  isAnalyzing,
  isGeneratingFix,
  onGenerateFix,
  onDismiss
}) {
  const [showCode, setShowCode] = useState(false);
  const [showFix, setShowFix] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [applyStatus, setApplyStatus] = useState(null);

  // State for targeted fix
  const [targetedFix, setTargetedFix] = useState(null);
  const [isGeneratingTargetedFix, setIsGeneratingTargetedFix] = useState(false);
  const [targetedFixError, setTargetedFixError] = useState(null);
  const [showDiff, setShowDiff] = useState(true);

  // State for similar resolutions (learning from past fixes)
  const [similarResolutions, setSimilarResolutions] = useState([]);
  const [showSimilarResolutions, setShowSimilarResolutions] = useState(false);

  // Fetch similar resolutions when analysis changes
  useEffect(() => {
    if (analysis?.analysis?.rootCause || analysis?.errorLog?.message) {
      fetchSimilarResolutions();
    }
  }, [analysis]);

  const fetchSimilarResolutions = async () => {
    try {
      const message = analysis?.analysis?.rootCause || analysis?.errorLog?.message || '';
      const service = analysis?.analysis?.originService || '';

      const params = new URLSearchParams({
        message,
        service,
        limit: '5'
      });

      const res = await fetch(`${API_URL}/api/resolutions/similar?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSimilarResolutions(data);
      }
    } catch (e) {
      console.log('Could not fetch similar resolutions');
    }
  };

  // Store resolution when fix is applied
  const storeResolution = async (fixData) => {
    try {
      await fetch(`${API_URL}/api/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorMessage: analysis?.errorLog?.message || '',
          rootCause: analysis?.analysis?.rootCause || '',
          fixApplied: fixData.newCode || fixData.fixedCode || '',
          fixDescription: fixData.explanation || 'Applied fix',
          service: analysis?.analysis?.originService || '',
          filePath: fixData.filePath || '',
          wasSuccessful: true
        })
      });
      console.log('[Resolution] Stored for future learning');
    } catch (e) {
      console.log('Could not store resolution:', e.message);
    }
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

  // Generate targeted fix
  const generateTargetedFix = async () => {
    setIsGeneratingTargetedFix(true);
    setTargetedFixError(null);
    setTargetedFix(null);

    try {
      const response = await fetch(`${API_URL}/api/generate-targeted-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTargetedFix(data);
        setApplyStatus(null);
      } else {
        const errorMsg = data.error || data.suggestion || 'Could not generate targeted fix';
        setTargetedFixError(errorMsg);
        console.error('[SmartFix] Error:', errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error - check if backend is running';
      setTargetedFixError(errorMsg);
      console.error('[SmartFix] Exception:', err);
    } finally {
      setIsGeneratingTargetedFix(false);
    }
  };

  // Apply targeted fix
  const applyTargetedFix = async () => {
    if (!targetedFix) return;

    setIsApplying(true);
    setApplyStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/apply-targeted-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: targetedFix.filePath,
          oldCode: targetedFix.oldCode,
          newCode: targetedFix.newCode
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setApplyStatus('success');
        console.log('[ApplyFix] Success:', data.message);

        // Store resolution for learning
        storeResolution(targetedFix);
      } else {
        setApplyStatus('error');
        console.error('[ApplyFix] Failed:', data.error);
      }
    } catch (err) {
      setApplyStatus('error');
      console.error('[ApplyFix] Exception:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const applyFix = async () => {
    if (!generatedFix?.fixedCode) return;

    setIsApplying(true);
    setApplyStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixedCode: generatedFix.fixedCode,
          serviceName: generatedFix.serviceName || analysis?.analysis?.originService,
          fileName: generatedFix.fileName || 'index.js'
        })
      });

      const data = await response.json();

      if (data.success) {
        setApplyStatus('success');
      } else {
        setApplyStatus('error');
        console.error('Apply failed:', data.error);
      }
    } catch (err) {
      setApplyStatus('error');
      console.error('Apply error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const rebuildService = async () => {
    setIsRebuilding(true);

    try {
      const serviceName = targetedFix?.filePath?.includes('user-service') ? 'user-service' :
                          targetedFix?.filePath?.includes('api-gateway') ? 'api-gateway' :
                          targetedFix?.filePath?.includes('db-service') ? 'db-service' :
                          generatedFix?.serviceName || analysis?.analysis?.originService;

      const response = await fetch(`${API_URL}/api/rebuild-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName })
      });

      const data = await response.json();

      if (data.success) {
        setApplyStatus('rebuilt');
      } else {
        console.error('Rebuild failed:', data.error);
      }
    } catch (err) {
      console.error('Rebuild error:', err);
    } finally {
      setIsRebuilding(false);
    }
  };

  const getSeverityStyles = (severity) => {
    const styles = {
      CRITICAL: 'badge-error',
      HIGH: 'badge-error',
      MEDIUM: 'badge-warning',
      LOW: 'badge-info'
    };
    return styles[severity] || styles.MEDIUM;
  };

  const { analysis: errorAnalysis, codeLocation, correlation } = analysis || {};

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onDismiss} />

      {/* Drawer Panel */}
      <div className="drawer-panel">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-red/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-cyber-red" />
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {isAnalyzing ? 'Analyzing Error...' : 'Error Analysis'}
              </h2>
              {!isAnalyzing && errorAnalysis && (
                <p className="text-xs text-slate-400">
                  {errorAnalysis.originService} - {errorAnalysis.errorType}
                </p>
              )}
            </div>

            {errorAnalysis?.severity && (
              <span className={`badge ${getSeverityStyles(errorAnalysis.severity)}`}>
                {errorAnalysis.severity}
              </span>
            )}
          </div>

          <button
            onClick={onDismiss}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="spinner w-12 h-12 mb-4" />
              <p className="text-white font-medium text-lg">Analyzing error...</p>
              <p className="text-slate-400 text-sm mt-2">Correlating logs and identifying root cause</p>
            </div>
          )}

          {/* Analysis Content */}
          {!isAnalyzing && analysis && (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {!targetedFix && (
                  <button
                    onClick={generateTargetedFix}
                    disabled={isGeneratingTargetedFix}
                    className="btn-primary flex items-center gap-2 flex-1"
                  >
                    {isGeneratingTargetedFix ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        Analyzing Code...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Smart Fix
                      </>
                    )}
                  </button>
                )}

                {targetedFix && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 rounded-xl flex-1">
                    <CheckCircle className="w-4 h-4 text-cyber-green" />
                    <span className="text-sm text-cyber-green">Smart Fix Ready</span>
                  </div>
                )}

                {!generatedFix && !targetedFix && (
                  <button
                    onClick={onGenerateFix}
                    disabled={isGeneratingFix}
                    className="btn-glass flex items-center gap-2"
                  >
                    {isGeneratingFix ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        Template Fix
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Root Cause */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-cyber-red" />
                  <span className="font-medium text-white">Root Cause</span>
                </div>
                <p className="text-slate-300 text-sm">{errorAnalysis?.rootCause || 'Unable to determine root cause'}</p>
              </div>

              {/* Similar Past Resolutions */}
              {similarResolutions.length > 0 && (
                <div className="glass-card p-4 border border-purple-500/30">
                  <button
                    onClick={() => setShowSimilarResolutions(!showSimilarResolutions)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-white">Similar Past Fixes</span>
                      <span className="badge bg-purple-500/20 text-purple-300 border-purple-500/30">
                        {similarResolutions.length} found
                      </span>
                    </div>
                    {showSimilarResolutions ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showSimilarResolutions && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Lightbulb className="w-3 h-3" />
                        <span>These past resolutions may help solve this error:</span>
                      </div>
                      {similarResolutions.map((resolution, idx) => (
                        <div key={idx} className="bg-black/30 rounded-xl p-3 border border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">
                              {resolution.service} - {new Date(resolution.created_at).toLocaleDateString()}
                            </span>
                            {resolution.was_successful && (
                              <span className="badge badge-success text-xs">Worked</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 mb-2 line-clamp-2">
                            {resolution.error_message?.substring(0, 150)}...
                          </p>
                          {resolution.fix_description && (
                            <div className="bg-electric-500/10 border border-electric-500/20 rounded-lg p-2 mt-2">
                              <p className="text-xs text-electric-300">
                                <strong>Fix applied:</strong> {resolution.fix_description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Technical Details */}
              {errorAnalysis?.technicalDetails && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-electric-400" />
                    <span className="font-medium text-white">Technical Details</span>
                  </div>
                  <p className="text-slate-300 text-sm">{errorAnalysis.technicalDetails}</p>
                </div>
              )}

              {/* Propagation Path */}
              {errorAnalysis?.propagationPath?.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="w-4 h-4 text-cyber-yellow" />
                    <span className="font-medium text-white">Error Propagation</span>
                  </div>
                  <div className="space-y-2">
                    {errorAnalysis.propagationPath.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-slate-300 text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Targeted Fix Error */}
              {targetedFixError && (
                <div className={`glass-card p-4 ${
                  targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                    ? 'border-cyber-yellow/30'
                    : 'border-cyber-red/30'
                }`}>
                  <div className={`flex items-center gap-2 mb-2 ${
                    targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                      ? 'text-cyber-yellow'
                      : 'text-cyber-red'
                  }`}>
                    {targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed') ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span className="font-medium">
                      {targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                        ? 'This error type has already been fixed'
                        : 'Could not generate smart fix'
                      }
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{targetedFixError}</p>
                </div>
              )}

              {/* TARGETED FIX - Smart Fix Display */}
              {targetedFix && (
                <div className="glass-card p-4 border-2 border-cyber-green/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-cyber-green" />
                      <span className="font-semibold text-white">Smart Fix</span>
                      <span className={`badge ${
                        targetedFix.confidence === 'high' ? 'badge-success' :
                        targetedFix.confidence === 'medium' ? 'badge-warning' :
                        'badge-error'
                      }`}>
                        {targetedFix.confidence} confidence
                      </span>
                    </div>
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="btn-glass py-1 px-2 text-xs flex items-center gap-1"
                    >
                      {showDiff ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showDiff ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {/* File Info */}
                  <div className="bg-black/30 rounded-xl p-3 mb-4 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1">File to modify:</div>
                    <div className="text-sm text-white font-mono">{targetedFix.filePath}</div>
                    {targetedFix.problemLocation && (
                      <div className="text-xs text-slate-500 mt-1">
                        Lines {targetedFix.problemLocation.startLine}-{targetedFix.problemLocation.endLine}: {targetedFix.problemLocation.description}
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="bg-electric-500/10 border border-electric-500/30 rounded-xl p-3 mb-4">
                    <div className="text-xs text-electric-400 mb-1">What this fix does:</div>
                    <p className="text-slate-300 text-sm">{targetedFix.explanation}</p>
                  </div>

                  {/* Code Diff */}
                  {showDiff && (
                    <div className="space-y-3">
                      {/* Old Code */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-cyber-red"></div>
                          <span className="text-xs text-cyber-red font-medium">Code to Remove:</span>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-cyber-red/30">
                          <SyntaxHighlighter
                            language="javascript"
                            style={oneDark}
                            customStyle={{ margin: 0, fontSize: '11px', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)' }}
                          >
                            {targetedFix.oldCode}
                          </SyntaxHighlighter>
                        </div>
                      </div>

                      {/* New Code */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-cyber-green"></div>
                          <span className="text-xs text-cyber-green font-medium">Code to Add:</span>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-cyber-green/30">
                          <SyntaxHighlighter
                            language="javascript"
                            style={oneDark}
                            customStyle={{ margin: 0, fontSize: '11px', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)' }}
                          >
                            {targetedFix.newCode}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={applyTargetedFix}
                      disabled={isApplying || applyStatus === 'success'}
                      className="btn-primary flex items-center gap-2 flex-1"
                    >
                      {isApplying ? (
                        <>
                          <div className="spinner w-4 h-4" />
                          Applying...
                        </>
                      ) : applyStatus === 'success' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Applied!
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Apply Smart Fix
                        </>
                      )}
                    </button>

                    {applyStatus === 'success' && (
                      <button
                        onClick={rebuildService}
                        disabled={isRebuilding}
                        className="btn-glass flex items-center gap-2"
                      >
                        {isRebuilding ? (
                          <>
                            <div className="spinner w-4 h-4" />
                            Rebuilding...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Rebuild
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => copyToClipboard(targetedFix.newCode)}
                      className="btn-glass p-2"
                    >
                      {copied ? (
                        <CheckCircle className="w-4 h-4 text-cyber-green" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Status Messages */}
                  {applyStatus === 'success' && (
                    <div className="bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-3 mt-4">
                      <div className="flex items-center gap-2 text-cyber-green text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Smart fix applied successfully!</span>
                      </div>
                    </div>
                  )}

                  {applyStatus === 'rebuilt' && (
                    <div className="bg-cyber-green/10 border border-cyber-green/30 rounded-xl p-3 mt-4">
                      <div className="flex items-center gap-2 text-cyber-green text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>Container rebuilt! The fix is now live.</span>
                      </div>
                    </div>
                  )}

                  {applyStatus === 'error' && (
                    <div className="bg-cyber-red/10 border border-cyber-red/30 rounded-xl p-3 mt-4">
                      <div className="flex items-center gap-2 text-cyber-red text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Failed to apply fix. Try regenerating.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Code Location */}
              {codeLocation && !targetedFix && (
                <div className="glass-card p-4">
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-white">Code Location</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {codeLocation.fileName}:{codeLocation.lineNumber}
                      </span>
                    </div>
                    {showCode ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showCode && codeLocation.codeSnippet && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <SyntaxHighlighter
                        language="javascript"
                        style={oneDark}
                        customStyle={{ margin: 0, fontSize: '12px', padding: '1rem' }}
                        showLineNumbers
                      >
                        {codeLocation.codeSnippet}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              )}

              {/* Legacy Generated Fix */}
              {generatedFix && !targetedFix && (
                <div className="glass-card p-4 border border-cyber-green/30">
                  <button
                    onClick={() => setShowFix(!showFix)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-cyber-green" />
                      <span className="font-medium text-white">Template Fix</span>
                      <span className="badge badge-success">
                        {generatedFix.changes?.length || 0} changes
                      </span>
                    </div>
                    {showFix ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showFix && (
                    <div className="space-y-3">
                      {generatedFix.changes?.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 mb-2">Changes Made:</div>
                          <ul className="space-y-1">
                            {generatedFix.changes.map((change, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-3 h-3 text-cyber-green mt-1" />
                                <span className="text-slate-300">{change}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {generatedFix.fixedCode && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">Fixed Code:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(generatedFix.fixedCode)}
                                className="btn-glass py-1 px-2 text-xs flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                              <button onClick={downloadFix} className="btn-glass py-1 px-2 text-xs flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                Download
                              </button>
                              <button
                                onClick={applyFix}
                                disabled={isApplying || applyStatus === 'success'}
                                className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                              >
                                {isApplying ? 'Applying...' : applyStatus === 'success' ? 'Applied!' : 'Apply'}
                              </button>
                            </div>
                          </div>
                          <div className="rounded-xl overflow-hidden max-h-48 overflow-y-auto border border-white/10">
                            <SyntaxHighlighter
                              language="javascript"
                              style={oneDark}
                              customStyle={{ margin: 0, fontSize: '11px', padding: '1rem' }}
                              showLineNumbers
                            >
                              {generatedFix.fixedCode.length > 3000
                                ? generatedFix.fixedCode.substring(0, 3000) + '\n\n// ... (truncated)'
                                : generatedFix.fixedCode
                              }
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Immediate Actions */}
              {errorAnalysis?.immediateActions?.length > 0 && (
                <div className="glass-card p-4">
                  <div className="font-medium text-white mb-3">Immediate Actions</div>
                  <ul className="space-y-2">
                    {errorAnalysis.immediateActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-cyber-yellow mt-0.5">-</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* No analysis state */}
          {!isAnalyzing && !analysis && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg">No analysis available</p>
              <p className="text-slate-500 text-sm mt-2">Click on an error log to analyze it</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ErrorPanel;
