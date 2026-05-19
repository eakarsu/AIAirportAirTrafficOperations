import React from 'react';
import RunwayTimeline from '../components/RunwayTimeline';
import SectorLoadHeatmap from '../components/SectorLoadHeatmap';
import FlightPlanPDF from '../components/FlightPlanPDF';
import AirspaceRulesEditor from '../components/AirspaceRulesEditor';

function CustomViewsPage({ token, api }) {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <h1><i className="fas fa-tower-control"></i> ATC Custom Views</h1>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Bespoke ATC dashboards · 2 visual + 2 operational tools
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <RunwayTimeline token={token} api={api} />
        <SectorLoadHeatmap token={token} api={api} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <FlightPlanPDF token={token} api={api} />
        <AirspaceRulesEditor token={token} api={api} />
      </div>
    </div>
  );
}

export default CustomViewsPage;
