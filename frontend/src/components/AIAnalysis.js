import React from 'react';

function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  html = html.replace(/(<li>.*?<\/li>)/gs, (match) => {
    if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
    return match;
  });
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  return '<p>' + html + '</p>';
}

// Renders a structured JSON AI result with nice formatting
function StructuredResult({ data }) {
  const skip = new Set(['timestamp', 'model', 'raw_response']);
  const entries = Object.entries(data).filter(([k]) => !skip.has(k));

  const renderValue = (key, val) => {
    if (Array.isArray(val)) {
      if (val.length === 0) return <span style={{ color: '#475569', fontSize: 13 }}>None</span>;
      // Array of strings
      if (typeof val[0] === 'string') {
        return (
          <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
            {val.map((v, i) => <li key={i} style={{ color: '#94a3b8', fontSize: 13, marginBottom: 2 }}>{v}</li>)}
          </ul>
        );
      }
      // Array of objects
      const keys = Object.keys(val[0]);
      return (
        <div style={{ overflowX: 'auto', marginTop: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{keys.map(k => <th key={k} style={{ padding: '6px 10px', background: 'rgba(30,41,59,0.8)', color: '#64748b', textAlign: 'left', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{k.replace(/_/g, ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {val.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                  {keys.map(k => (
                    <td key={k} style={{ padding: '6px 10px', color: '#94a3b8' }}>
                      {typeof row[k] === 'boolean' ? (row[k] ? 'Yes' : 'No') : String(row[k] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (typeof val === 'object' && val !== null) {
      return (
        <div style={{ paddingLeft: 8, borderLeft: '2px solid rgba(148,163,184,0.15)', marginTop: 4 }}>
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 4 }}>
              <span style={{ color: '#64748b', fontSize: 12, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>
              <span style={{ color: '#e2e8f0', fontSize: 13 }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    if (typeof val === 'boolean') return <span style={{ color: val ? '#22c55e' : '#ef4444' }}>{val ? 'Yes' : 'No'}</span>;
    if (typeof val === 'number') return <span style={{ color: '#38bdf8', fontWeight: 600 }}>{val.toLocaleString()}</span>;
    return <span style={{ color: '#cbd5e1', fontSize: 13 }}>{String(val)}</span>;
  };

  return (
    <div>
      {entries.map(([key, val]) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, fontWeight: 600 }}>
            {key.replace(/_/g, ' ')}
          </div>
          {renderValue(key, val)}
        </div>
      ))}
    </div>
  );
}

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

  const isStructured = data && typeof data === 'object' && !data.analysis;
  const hasMarkdown = data && data.analysis && typeof data.analysis === 'string';

  return (
    <div className="ai-analysis-container">
      <div className="ai-analysis-header">
        <h3><i className="fas fa-robot"></i> AI Analysis</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {data.model && <span className="ai-model"><i className="fas fa-microchip"></i> {data.model}</span>}
          {data.timestamp && <span className="ai-timestamp">{new Date(data.timestamp).toLocaleString()}</span>}
        </div>
      </div>
      <div className="ai-analysis-body">
        {isStructured && <StructuredResult data={data} />}
        {hasMarkdown && (
          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(data.analysis) }} />
        )}
        {data.raw_response && (
          <div>
            <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4, fontWeight: 600 }}>Raw Response</div>
            <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 12 }}>{data.raw_response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIAnalysis;
