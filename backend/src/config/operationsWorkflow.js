'use strict';

module.exports = {
  table: 'controller_operational_plans',
  initialStatus: 'draft',
  statuses: ['draft', 'feed_validated', 'conflict_checked', 'controller_review', 'approved', 'withdrawn'],
  editableStatuses: ['draft', 'feed_validated', 'conflict_checked'],
  transitions: {
    draft: ['feed_validated', 'withdrawn'], feed_validated: ['draft', 'conflict_checked', 'withdrawn'],
    conflict_checked: ['feed_validated', 'controller_review', 'withdrawn'],
    controller_review: ['conflict_checked', 'approved', 'withdrawn'], approved: ['withdrawn'], withdrawn: [],
  },
  approvalStatuses: ['approved'],
  approverRoles: ['controller', 'supervisor', 'admin'],
  evidenceRoles: ['integration', 'controller', 'supervisor', 'admin'],
  syncRoles: ['integration', 'admin'],
  requiredFields: ['planningWindow', 'flightReferences', 'gatePlan', 'runwayPlan', 'degradedMode'],
  requiredEvidence: ['flight_feed', 'weather', 'notam', 'runway_state', 'gate_state'],
  deterministicChecks: [
    { code: 'CONFLICTS_ZERO', test: (p) => Number.isInteger(p.unresolvedConflicts) && p.unresolvedConflicts === 0 },
    { code: 'CAPACITY_WITHIN_LIMIT', test: (p) => p.capacityWithinLimit === true },
    { code: 'FAIL_SAFE_DEFINED', test: (p) => Boolean(p.failSafeProcedure) },
  ],
  providers: ['flight_feed', 'weather_feed', 'notam_feed', 'surface_feed', 'airport_ops'],
  providerEnv: {
    flight_feed: 'FLIGHT_FEED_API_URL', weather_feed: 'WEATHER_FEED_API_URL', notam_feed: 'NOTAM_FEED_API_URL',
    surface_feed: 'SURFACE_FEED_API_URL', airport_ops: 'AIRPORT_OPS_API_URL',
  },
};
