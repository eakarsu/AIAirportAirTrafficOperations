import React from 'react';

function AIAnalysis({ data, loading }) {
  if (loading) {
    return (
      <div className="ai-analysis-container">
        <div className="ai-analysis-header">
          <h3><i className="fas fa-robot"></i> AI Analysis</h3>
        </div>
        <div className="ai-loading">
          <div className="spinner"></div>
          <span>AI is analyzing your data...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Convert markdown-like text to HTML
  const formatAnalysis = (text) => {
    if (!text) return '';
    let html = text
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.+?)`/g, '<code>$1</code>')
      // Bullet points
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br/>');

    // Wrap loose <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
      if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
      return match;
    });
    // Clean up consecutive ul tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    return '<p>' + html + '</p>';
  };

  return (
    <div className="ai-analysis-container">
      <div className="ai-analysis-header">
        <h3><i className="fas fa-robot"></i> AI Analysis</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="ai-model"><i className="fas fa-microchip"></i> {data.model}</span>
          <span className="ai-timestamp">{new Date(data.timestamp).toLocaleString()}</span>
        </div>
      </div>
      <div
        className="ai-analysis-body"
        dangerouslySetInnerHTML={{ __html: formatAnalysis(data.analysis) }}
      />
    </div>
  );
}

export default AIAnalysis;
