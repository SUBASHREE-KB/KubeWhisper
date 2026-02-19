import React, { useState } from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BoltIcon from '@mui/icons-material/Bolt';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import CircularProgress from '@mui/material/CircularProgress';

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showFix, setShowFix] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [applyStatus, setApplyStatus] = useState(null);

  // New state for targeted fix
  const [targetedFix, setTargetedFix] = useState(null);
  const [isGeneratingTargetedFix, setIsGeneratingTargetedFix] = useState(false);
  const [targetedFixError, setTargetedFixError] = useState(null);
  const [showDiff, setShowDiff] = useState(true);

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

  // Generate targeted fix - reads actual source code
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
        setTargetedFixError(data.error || 'Could not generate targeted fix');
      }
    } catch (err) {
      setTargetedFixError(err.message);
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
    <div className={`fixed bottom-0 left-0 right-0 bg-bg-dark border-t border-status-error/50 shadow-2xl z-50 transition-all duration-300 panel-slide-up ${
      isMinimized ? 'h-14' : 'max-h-[60vh]'
    }`}>
      {/* Header - Always visible */}
      <div className="flex items-center justify-between px-6 py-3 bg-bg-medium border-b border-border-dark">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-status-error/10 rounded-lg">
            <WarningAmberIcon sx={{ fontSize: 20, color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              {isAnalyzing ? 'Analyzing Error...' : 'Error Analysis'}
            </h3>
            {!isAnalyzing && errorAnalysis && (
              <p className="text-xs text-text-muted">
                Origin: {errorAnalysis.originService} | Type: {errorAnalysis.errorType}
              </p>
            )}
          </div>

          {/* Severity Badge */}
          {errorAnalysis?.severity && (
            <span className={`badge ${getSeverityStyles(errorAnalysis.severity)}`}>
              {errorAnalysis.severity}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Fix Button */}
          {!isAnalyzing && analysis && !targetedFix && (
            <button
              onClick={generateTargetedFix}
              disabled={isGeneratingTargetedFix}
              className="btn btn-primary flex items-center gap-2"
            >
              {isGeneratingTargetedFix ? (
                <>
                  <CircularProgress size={16} sx={{ color: '#0A0A0A' }} />
                  Analyzing Code...
                </>
              ) : (
                <>
                  <AutoFixHighIcon sx={{ fontSize: 18 }} />
                  Smart Fix
                </>
              )}
            </button>
          )}

          {/* Smart Fix Ready indicator */}
          {targetedFix && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-status-success/10 border border-status-success/30 rounded-lg">
              <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
              <span className="text-sm text-status-success">Smart Fix Ready</span>
            </div>
          )}

          {/* Template Fix Button */}
          {!isAnalyzing && analysis && !generatedFix && !targetedFix && (
            <button
              onClick={onGenerateFix}
              disabled={isGeneratingFix}
              className="btn btn-secondary flex items-center gap-2"
            >
              {isGeneratingFix ? (
                <>
                  <CircularProgress size={16} sx={{ color: '#FAFAFA' }} />
                  Generating...
                </>
              ) : (
                <>
                  <BuildIcon sx={{ fontSize: 18 }} />
                  Template Fix
                </>
              )}
            </button>
          )}

          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            {isMinimized ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
      </div>

      {/* Content - Hidden when minimized */}
      {!isMinimized && (
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(60vh - 60px)' }}>
          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <CircularProgress size={48} sx={{ color: '#FAFAFA', marginBottom: '1rem' }} />
              <p className="text-text-primary font-medium text-lg">Analyzing error...</p>
              <p className="text-text-muted text-sm mt-2">Correlating logs and identifying root cause</p>
            </div>
          )}

          {/* Analysis Content */}
          {!isAnalyzing && analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Summary */}
              <div className="space-y-4">
                {/* Root Cause */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <GpsFixedIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                    <span className="font-medium text-text-primary">Root Cause</span>
                  </div>
                  <p className="text-text-secondary text-sm">{errorAnalysis?.rootCause || 'Unable to determine root cause'}</p>
                </div>

                {/* Technical Details */}
                {errorAnalysis?.technicalDetails && (
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <StorageIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                      <span className="font-medium text-text-primary">Technical Details</span>
                    </div>
                    <p className="text-text-secondary text-sm">{errorAnalysis.technicalDetails}</p>
                  </div>
                )}

                {/* Propagation Path */}
                {errorAnalysis?.propagationPath?.length > 0 && (
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BoltIcon sx={{ fontSize: 16, color: '#EAB308' }} />
                      <span className="font-medium text-text-primary">Error Propagation</span>
                    </div>
                    <div className="space-y-2">
                      {errorAnalysis.propagationPath.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-bg-medium border border-border-light flex items-center justify-center text-xs text-text-muted flex-shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-text-secondary text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Immediate Actions */}
                {errorAnalysis?.immediateActions?.length > 0 && (
                  <div className="card p-4">
                    <div className="font-medium text-text-primary mb-3">Immediate Actions</div>
                    <ul className="space-y-2">
                      {errorAnalysis.immediateActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <span className="text-status-warning mt-0.5">-</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column - Code & Fix */}
              <div className="space-y-4">
                {/* Targeted Fix Error */}
                {targetedFixError && (
                  <div className={`card p-4 ${
                    targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                      ? 'border-status-warning/30'
                      : 'border-status-error/30'
                  }`}>
                    <div className={`flex items-center gap-2 mb-2 ${
                      targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                        ? 'text-status-warning'
                        : 'text-status-error'
                    }`}>
                      {targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed') ? (
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <WarningAmberIcon sx={{ fontSize: 16 }} />
                      )}
                      <span className="font-medium">
                        {targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed')
                          ? 'This error type has already been fixed'
                          : 'Could not generate smart fix'
                        }
                      </span>
                    </div>
                    <p className="text-text-muted text-sm">{targetedFixError}</p>
                    {targetedFixError.includes('already fixed') || targetedFixError.includes('already been fixed') ? (
                      <p className="text-text-muted text-xs mt-2">The fix was applied earlier. Try rebuilding the container if the error persists.</p>
                    ) : (
                      <p className="text-text-muted text-xs mt-2">Try using the "Template Fix" button instead.</p>
                    )}
                  </div>
                )}

                {/* TARGETED FIX - Smart Fix Display */}
                {targetedFix && (
                  <div className="card p-4 border-2 border-status-success/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AutoFixHighIcon sx={{ fontSize: 20, color: '#22C55E' }} />
                        <span className="font-semibold text-text-primary">Smart Fix</span>
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
                        className="btn btn-ghost text-xs flex items-center gap-1"
                      >
                        {showDiff ? (
                          <><VisibilityOffIcon sx={{ fontSize: 14 }} /> Hide</>
                        ) : (
                          <><VisibilityIcon sx={{ fontSize: 14 }} /> Show</>
                        )}
                      </button>
                    </div>

                    {/* File Info */}
                    <div className="bg-bg-darkest rounded-lg p-3 mb-4">
                      <div className="text-xs text-text-muted mb-1">File to modify:</div>
                      <div className="text-sm text-text-primary font-mono">{targetedFix.filePath}</div>
                      {targetedFix.problemLocation && (
                        <div className="text-xs text-text-muted mt-1">
                          Lines {targetedFix.problemLocation.startLine}-{targetedFix.problemLocation.endLine}: {targetedFix.problemLocation.description}
                        </div>
                      )}
                    </div>

                    {/* Explanation */}
                    <div className="bg-status-info/5 border border-status-info/30 rounded-lg p-3 mb-4">
                      <div className="text-xs text-status-info mb-1">What this fix does:</div>
                      <p className="text-text-secondary text-sm">{targetedFix.explanation}</p>
                    </div>

                    {/* Code Diff */}
                    {showDiff && (
                      <div className="space-y-3">
                        {/* Old Code */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-status-error"></div>
                            <span className="text-xs text-status-error font-medium">Code to Remove:</span>
                          </div>
                          <div className="rounded-lg overflow-hidden border border-status-error/30">
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
                            <div className="w-3 h-3 rounded-full bg-status-success"></div>
                            <span className="text-xs text-status-success font-medium">Code to Add:</span>
                          </div>
                          <div className="rounded-lg overflow-hidden border border-status-success/30">
                            <SyntaxHighlighter
                              language="javascript"
                              style={oneDark}
                              customStyle={{ margin: 0, fontSize: '11px', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.05)' }}
                            >
                              {targetedFix.newCode}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-dark">
                      <button
                        onClick={applyTargetedFix}
                        disabled={isApplying || applyStatus === 'success'}
                        className="btn btn-success flex items-center gap-2"
                      >
                        {isApplying ? (
                          <>
                            <CircularProgress size={16} sx={{ color: '#FAFAFA' }} />
                            Applying...
                          </>
                        ) : applyStatus === 'success' ? (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 16 }} />
                            Applied!
                          </>
                        ) : (
                          <>
                            <UploadIcon sx={{ fontSize: 16 }} />
                            Apply Smart Fix
                          </>
                        )}
                      </button>

                      {applyStatus === 'success' && (
                        <button
                          onClick={rebuildService}
                          disabled={isRebuilding}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          {isRebuilding ? (
                            <>
                              <CircularProgress size={16} sx={{ color: '#0A0A0A' }} />
                              Rebuilding...
                            </>
                          ) : (
                            <>
                              <RefreshIcon sx={{ fontSize: 16 }} />
                              Rebuild Container
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => copyToClipboard(targetedFix.newCode)}
                        className="btn btn-secondary flex items-center gap-1"
                      >
                        {copied ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                        ) : (
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        )}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    {/* Status Messages */}
                    {applyStatus === 'success' && (
                      <div className="bg-status-success/10 border border-status-success/30 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-status-success text-sm">
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                          <span>Smart fix applied successfully! The problematic code has been replaced.</span>
                        </div>
                      </div>
                    )}

                    {applyStatus === 'rebuilt' && (
                      <div className="bg-status-success/10 border border-status-success/30 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-status-success text-sm">
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                          <span>Container rebuilt! The fix is now live and the error should not occur again.</span>
                        </div>
                      </div>
                    )}

                    {applyStatus === 'error' && (
                      <div className="bg-status-error/10 border border-status-error/30 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-status-error text-sm">
                          <WarningAmberIcon sx={{ fontSize: 16 }} />
                          <span>Failed to apply fix. The code may have changed. Try regenerating the fix.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Code Location */}
                {codeLocation && !targetedFix && (
                  <div className="card p-4">
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <CodeIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                        <span className="font-medium text-text-primary">Code Location</span>
                        <span className="text-xs text-text-muted font-mono">
                          {codeLocation.fileName}:{codeLocation.lineNumber}
                        </span>
                      </div>
                      {showCode ? (
                        <KeyboardArrowUpIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                      ) : (
                        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                      )}
                    </button>

                    {showCode && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-text-muted">File:</span>
                            <span className="text-text-primary ml-2 font-mono">{codeLocation.fileName}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Function:</span>
                            <span className="text-text-primary ml-2 font-mono">{codeLocation.functionName}</span>
                          </div>
                        </div>

                        {codeLocation.codeSnippet && (
                          <div className="rounded-lg overflow-hidden">
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

                        {codeLocation.explanation && (
                          <p className="text-text-muted text-sm">{codeLocation.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy Generated Fix */}
                {generatedFix && !targetedFix && (
                  <div className="card p-4 border border-status-success/30">
                    <button
                      onClick={() => setShowFix(!showFix)}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
                        <span className="font-medium text-text-primary">Template Fix</span>
                        <span className="badge badge-success">
                          {generatedFix.changes?.length || 0} changes
                        </span>
                      </div>
                      {showFix ? (
                        <KeyboardArrowUpIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                      ) : (
                        <KeyboardArrowDownIcon sx={{ fontSize: 16, color: '#A3A3A3' }} />
                      )}
                    </button>

                    {showFix && (
                      <div className="space-y-3">
                        {/* Changes list */}
                        {generatedFix.changes?.length > 0 && (
                          <div>
                            <div className="text-xs text-text-muted mb-2">Changes Made:</div>
                            <ul className="space-y-1">
                              {generatedFix.changes.map((change, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircleIcon sx={{ fontSize: 14, color: '#22C55E', marginTop: '2px' }} />
                                  <span className="text-text-secondary">{change}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Explanation */}
                        {generatedFix.explanation && (
                          <div>
                            <div className="text-xs text-text-muted mb-1">Explanation:</div>
                            <p className="text-text-secondary text-sm">{generatedFix.explanation}</p>
                          </div>
                        )}

                        {/* Fixed Code */}
                        {generatedFix.fixedCode && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-text-muted">Fixed Code:</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => copyToClipboard(generatedFix.fixedCode)}
                                  className="btn btn-ghost text-xs"
                                >
                                  {copied ? (
                                    <CheckCircleIcon sx={{ fontSize: 14, color: '#22C55E' }} />
                                  ) : (
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  )}
                                  {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button onClick={downloadFix} className="btn btn-ghost text-xs">
                                  <DownloadIcon sx={{ fontSize: 14 }} />
                                  Download
                                </button>
                                <button
                                  onClick={applyFix}
                                  disabled={isApplying || applyStatus === 'success'}
                                  className="btn btn-primary text-xs"
                                >
                                  {isApplying ? (
                                    <CircularProgress size={14} sx={{ color: '#0A0A0A' }} />
                                  ) : applyStatus === 'success' ? (
                                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                                  ) : (
                                    <UploadIcon sx={{ fontSize: 14 }} />
                                  )}
                                  {isApplying ? 'Applying...' : applyStatus === 'success' ? 'Applied!' : 'Apply Fix'}
                                </button>
                                {applyStatus === 'success' && (
                                  <button
                                    onClick={rebuildService}
                                    disabled={isRebuilding}
                                    className="btn btn-success text-xs"
                                  >
                                    {isRebuilding ? (
                                      <CircularProgress size={14} sx={{ color: '#FAFAFA' }} />
                                    ) : (
                                      <RefreshIcon sx={{ fontSize: 14 }} />
                                    )}
                                    {isRebuilding ? 'Rebuilding...' : 'Rebuild Container'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                              <SyntaxHighlighter
                                language="javascript"
                                style={oneDark}
                                customStyle={{ margin: 0, fontSize: '11px', padding: '1rem' }}
                                showLineNumbers
                              >
                                {generatedFix.fixedCode.length > 3000
                                  ? generatedFix.fixedCode.substring(0, 3000) + '\n\n// ... (truncated - download for full code)'
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
              </div>
            </div>
          )}

          {/* No analysis state */}
          {!isAnalyzing && !analysis && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <WarningAmberIcon sx={{ fontSize: 48, color: '#737373', marginBottom: '1rem' }} />
              <p className="text-text-muted text-lg">No analysis available</p>
              <p className="text-text-muted text-sm mt-2">Click on an error log to analyze it</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorPanel;
