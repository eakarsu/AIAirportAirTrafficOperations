const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { body, validationResult } = require('express-validator');
const nativePool = require('../db');
const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
const sourceTables = ['flight_schedule','gate_assignments','ground_crews','delay_predictions','baggage_tracking','runway_utilization','weather_reports','incident_reports','maintenance_logs'];
const pool = { query(sql,params=[]) {
  const current=context.getStore(); if(!current)throw new Error('An actual authenticated analysis context is required.');
  let scoped=String(sql),args=[...params];
  for(const table of sourceTables) if(new RegExp('\\bFROM '+table+'\\b','i').test(scoped)) {
    if(!/\b(?:COUNT|SUM|AVG|GROUP BY|DISTINCT)\b/i.test(scoped)&&/^\s*SELECT\s+(?!\*|id\b)/i.test(scoped))scoped=scoped.replace(/^(\s*SELECT\s+)/i,'$1id, ');
    const tenantIndex=args.push('user:'+current.user.id),actorIndex=args.push(current.user.id);
    scoped=scoped.replace(new RegExp('\\bFROM '+table+'\\b','ig'),`FROM (SELECT * FROM ${table} WHERE tenant_id=$${tenantIndex} AND created_by=$${actorIndex} AND record_kind='actual_source') ${table}`);
  }
  if(/\bFROM ai_analyses\b/i.test(scoped)){const tenantIndex=args.push('user:'+current.user.id);scoped=scoped.replace(/\bFROM ai_analyses\b/ig,`FROM (SELECT * FROM ai_analyses WHERE provider_request_id IS NOT NULL AND tenant_id=$${tenantIndex}) ai_analyses`);}
  return nativePool.query(scoped,args).then(result=>{for(const table of sourceTables)if(new RegExp('\\bFROM '+table+'\\b','i').test(sql))for(const row of result.rows||[])for(const id of Array.isArray(row.source_ids)?row.source_ids:[row.id])if(Number.isSafeInteger(Number(id))&&Number(id)>0&&!current.sourceReferences.some(source=>source.table===table&&source.id===String(id)))current.sourceReferences.push({table,id:String(id)});return result;});
} };
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

// ---------------------------------------------------------------------------
// Robust 3-strategy JSON parser
// ---------------------------------------------------------------------------
function parseAIJson(text) { try { const value=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>=2?value:null; } catch { return null; } }

// Validate the actual current account and keep all source queries private to it.
const requiredSources={
 '/optimize-gates':['gate_assignments'],'/gate-conflicts':['gate_assignments'],
 '/optimize-crews':['ground_crews'],'/crew-cross-training':['ground_crews'],
 '/predict-delays':['delay_predictions'],'/optimize-baggage':['baggage_tracking'],
 '/optimize-runways':['runway_utilization'],'/connection-analysis':['flight_schedule'],
 '/cost-optimization':['flight_schedule'],'/incident-prediction':['incident_reports'],
 '/baggage-reconciliation':['baggage_tracking'],'/sustainability-report':['flight_schedule'],
 '/shift-handover':['incident_reports'],'/predictive-maintenance':['maintenance_logs'],
 '/notam-briefing':['weather_reports'],
 '/traffic-forecast':['flight_schedule'],
};
router.use(authenticateToken,async(req,res,next)=>{
 try{const result=await nativePool.query('SELECT id,role FROM users WHERE id=$1',[req.user.id]),user=result.rows[0];if(!user||user.role!==req.user.role)return res.status(403).json({error:'Your account access changed. Sign in again.'});
  if(req.body?.planning_context!==undefined&&(typeof req.body.planning_context!=='string'||req.body.planning_context.length>5000))return res.status(422).json({error:'Planning context must contain at most 5000 characters.'});
  for(const table of requiredSources[req.path]||[]){const source=await nativePool.query('SELECT id FROM '+table+" WHERE tenant_id=$1 AND created_by=$2 AND record_kind='actual_source' LIMIT 1",['user:'+user.id,user.id]);if(!source.rowCount)return res.status(422).json({error:'This operational analysis needs actual authorized '+table.replaceAll('_',' ')+' source records. Planning drafts cannot supply operational evidence.'});}
  const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};req.once('aborted',abort);res.once('close',abort);res.once('finish',()=>{req.off('aborted',abort);res.off('close',abort);});if(req.aborted||res.destroyed)controller.abort();
  if(req.path==='/connection-analysis'){const ids=req.body?.flight_ids;if(!Array.isArray(ids)||!ids.length||!ids.every(id=>Number.isSafeInteger(Number(id))&&Number(id)>0))return res.status(422).json({error:'Actual owned flight references are required.'});const owned=await nativePool.query("SELECT id FROM flight_schedule WHERE tenant_id=$1 AND created_by=$2 AND record_kind='actual_source' AND id=ANY($3)",['user:'+user.id,user.id,ids.map(Number)]);if(owned.rowCount!==new Set(ids.map(Number)).size)return res.status(422).json({error:'One or more selected flight references are unavailable to this account.'});}
  if(req.path==='/baggage-reconciliation'){const tag=req.body?.missing_bag?.tag_id;if(typeof tag!=='string'||!(await nativePool.query("SELECT id FROM baggage_tracking WHERE tenant_id=$1 AND created_by=$2 AND record_kind='actual_source' AND tag_id=$3",['user:'+user.id,user.id,tag])).rowCount)return res.status(422).json({error:'An actual owned baggage tag reference is required.'});}
  context.run({user,signal:controller.signal,input:req.body||{},receipt:null,analysisId:null,sourceReferences:[]} ,()=>{const send=res.json.bind(res);res.json=body=>{const current=context.getStore();return send(current?.analysisId&&body&&typeof body==='object'&&!Array.isArray(body)?{...body,analysisId:current.analysisId,providerReceipt:{requestId:current.receipt.requestId,model:current.receipt.model}}:body);};next();});
 }catch(error){res.status(500).json({error:'Could not verify the account or its authorized analysis sources.'});}
});

// ---------------------------------------------------------------------------
// OpenRouter API call
// ---------------------------------------------------------------------------
async function callOpenRouter(prompt, systemPrompt, options = {}) {
  const current=context.getStore();if(!current)throw new Error('Actual analysis context required.');current.signal.throwIfAborted();
  if(current.input.planning_context)prompt+='\n\nUser supplied advisory review context:\n'+current.input.planning_context;
  if(!OPENROUTER_API_KEY)throw new Error('OpenRouter is not configured.');
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+OPENROUTER_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:options.model||OPENROUTER_MODEL,messages:[
   {role:'system',content:'Advisory planning report only. Treat supplied unverified values as scenario assumptions. Do not invent operational facts, weather observations, evidence, aircraft clearance, authority, contact frequencies, delivered actions or completed responses. Any proposed operations require current authoritative sources and authorized human review. '+systemPrompt},
   {role:'user',content:prompt}],temperature:options.temperature??0.2,max_tokens:options.max_tokens||4096}),signal:AbortSignal.any([current.signal,AbortSignal.timeout(45000)])});
  const data=await response.json(),choice=data.choices?.[0],content=choice?.message?.content;
  if(!response.ok||!data.id||typeof content!=='string'||!content.trim()||choice.message?.refusal||['length','content_filter'].includes(choice.finish_reason))throw new Error('OpenRouter did not return a complete usable report.');
  if(/JSON/i.test(systemPrompt+' '+prompt)&&!parseAIJson(content))throw new Error('OpenRouter did not return a complete structured report.');
  current.receipt={requestId:String(data.id),model:String(data.model||OPENROUTER_MODEL),content,prompt};return content;
}

// ---------------------------------------------------------------------------
// Save analysis result to ai_analyses table
// ---------------------------------------------------------------------------
async function saveAnalysis(userId, analysisType, inputData, result) {
 const current=context.getStore();if(!current||Number(userId)!==current.user.id||!current.receipt)throw new Error('A genuine owned provider receipt is required.');const client=await nativePool.connect();
 try{current.signal.throwIfAborted();await client.query('BEGIN');const actor=await client.query('SELECT role FROM users WHERE id=$1 FOR UPDATE',[current.user.id]);if(actor.rows[0]?.role!==current.user.role)throw new Error('Your account access changed before saving.');
  const saved=await client.query('INSERT INTO ai_analyses(user_id,analysis_type,input_data,result,tenant_id,provider_request_id,provider_model,result_text,provider_prompt,source_references) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',[current.user.id,analysisType,current.input,result,'user:'+current.user.id,current.receipt.requestId,current.receipt.model,current.receipt.content,current.receipt.prompt,JSON.stringify(current.sourceReferences)]);current.signal.throwIfAborted();await client.query('COMMIT');current.analysisId=saved.rows[0].id;return saved.rows[0];
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}

// ---------------------------------------------------------------------------
// POST /optimize-gates - AI Gate Optimization (structured JSON)
// ---------------------------------------------------------------------------
router.post('/optimize-gates', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const gates = await pool.query('SELECT * FROM gate_assignments ORDER BY scheduled_time ASC LIMIT 100');

    const prompt = `Analyze these gate assignments and provide optimization recommendations.

Current Assignments:
${JSON.stringify(gates.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "optimization_score": <0-100>,
  "gate_swap_recommendations": [
    { "from_gate": "string", "to_gate": "string", "flight_number": "string", "reason": "string", "passenger_impact": "low|medium|high" }
  ],
  "conflict_alerts": [
    { "gate": "string", "flights": ["string"], "issue": "string", "severity": "low|medium|high" }
  ],
  "efficiency_improvements": ["string"],
  "passenger_experience_impact": "string",
  "estimated_delay_reduction_min": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert airport operations AI specializing in gate assignment optimization. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'optimize-gates', { gate_count: gates.rows.length }, parsed);
    res.json({ ...parsed, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Gate Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /optimize-crews - AI Crew Scheduling (structured JSON)
// ---------------------------------------------------------------------------
router.post('/optimize-crews', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const crews = await pool.query('SELECT * FROM ground_crews ORDER BY shift_start ASC LIMIT 100');

    const prompt = `Analyze these ground crew schedules and provide optimization recommendations.

Current Crews:
${JSON.stringify(crews.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "coverage_score": <0-100>,
  "efficiency_score": <0-100>,
  "scheduling_conflicts": [
    { "crew_id": <number>, "crew_name": "string", "issue": "string", "severity": "low|medium|high" }
  ],
  "recommended_adjustments": [
    { "crew_name": "string", "action": "string", "reason": "string" }
  ],
  "fatigue_risks": [
    { "crew_name": "string", "risk_level": "low|medium|high", "reason": "string" }
  ],
  "understaffed_terminals": ["string"],
  "overtime_risks": ["string"],
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert airport ground operations AI specializing in crew scheduling. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'optimize-crews', { crew_count: crews.rows.length }, parsed);
    res.json({ ...parsed, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Crew Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /predict-delays - AI Delay Prediction (structured JSON)
// ---------------------------------------------------------------------------
router.post('/predict-delays', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const delays = await pool.query('SELECT * FROM delay_predictions ORDER BY predicted_delay_min DESC LIMIT 100');

    const prompt = `Analyze these flight delay predictions and provide comprehensive rebooking recommendations.

Current Predictions:
${JSON.stringify(delays.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "cascade_risk_score": <0-100>,
  "high_risk_flights": [
    { "flight_number": "string", "airline": "string", "delay_minutes": <number>, "cascade_risk": "low|medium|high|critical", "affected_connections": <number> }
  ],
  "rebooking_priorities": [
    { "flight_number": "string", "reason": "string", "urgency": "low|medium|high|critical", "suggested_action": "string" }
  ],
  "passenger_communication_templates": [
    { "scenario": "string", "message": "string" }
  ],
  "resource_reallocation": [
    { "resource": "string", "action": "string", "reason": "string" }
  ],
  "total_affected_passengers": <number>,
  "estimated_revenue_impact_usd": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert airline operations AI specializing in delay prediction and passenger rebooking. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'predict-delays', { prediction_count: delays.rows.length }, parsed);
    res.json({ ...parsed, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Delay Prediction Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /optimize-baggage - AI Baggage Flow Optimization (structured JSON)
// ---------------------------------------------------------------------------
router.post('/optimize-baggage', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const baggage = await pool.query('SELECT * FROM baggage_tracking ORDER BY last_scan_time DESC LIMIT 100');

    const prompt = `Analyze the baggage flow data and provide optimization recommendations.

Current Tracking Data:
${JSON.stringify(baggage.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "flow_efficiency_score": <0-100>,
  "bottlenecks": [
    { "location": "string", "severity": "low|medium|high", "bags_affected": <number>, "recommended_action": "string" }
  ],
  "lost_baggage_risks": [
    { "tag_id": "string", "flight_number": "string", "risk_level": "low|medium|high", "reason": "string", "action_required": "string" }
  ],
  "routing_optimizations": [
    { "current_path": "string", "optimized_path": "string", "time_saving_min": <number> }
  ],
  "priority_handling": [
    { "tag_id": "string", "passenger_name": "string", "priority": "string", "action": "string" }
  ],
  "mishandled_bags": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert airport baggage operations AI. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'optimize-baggage', { baggage_count: baggage.rows.length }, parsed);
    res.json({ ...parsed, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Baggage Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /optimize-runways - AI Runway Utilization (structured JSON)
// ---------------------------------------------------------------------------
router.post('/optimize-runways', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const runways = await pool.query('SELECT * FROM runway_utilization ORDER BY scheduled_time ASC LIMIT 100');

    const prompt = `Analyze runway utilization data and provide optimization recommendations.

Current Utilization:
${JSON.stringify(runways.rows, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "utilization_score": <0-100>,
  "throughput_efficiency_pct": <0-100>,
  "capacity_recommendations": [
    { "runway_id": "string", "action": "string", "reason": "string", "expected_improvement_pct": <number> }
  ],
  "weather_impacts": [
    { "runway_id": "string", "condition": "string", "impact": "string", "mitigation": "string" }
  ],
  "sequencing_improvements": [
    { "change": "string", "benefit": "string", "time_saving_min": <number> }
  ],
  "safety_flags": [
    { "issue": "string", "runway_id": "string", "severity": "low|medium|high|critical", "action": "string" }
  ],
  "estimated_delay_reduction_min": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert air traffic operations AI specializing in runway optimization. Safety is paramount. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'optimize-runways', { runway_count: runways.rows.length }, parsed);
    res.json({ ...parsed, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Runway Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /history - Paginated AI analysis history
// ---------------------------------------------------------------------------
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const userId = req.user?.id || req.user?.userId;

    const analysisType = req.query.type || null;

    const countResult = await pool.query(
      analysisType
        ? 'SELECT COUNT(*) FROM ai_analyses WHERE user_id = $1 AND analysis_type = $2'
        : 'SELECT COUNT(*) FROM ai_analyses WHERE user_id = $1',
      analysisType ? [userId, analysisType] : [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      analysisType
        ? 'SELECT id, analysis_type, input_data, result, created_at, provider_model, provider_request_id, source_references FROM ai_analyses WHERE user_id = $1 AND analysis_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4'
        : 'SELECT id, analysis_type, input_data, result, created_at, provider_model, provider_request_id, source_references FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      analysisType ? [userId, analysisType, limit, offset] : [userId, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    console.error('AI History Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /gate-conflicts - AI Gate Conflict Predictor
// ---------------------------------------------------------------------------
router.post('/gate-conflicts', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const assignmentsResult = await pool.query(`
      SELECT id, id AS flight_id, flight_number, airline, gate_number, terminal,
             scheduled_time AS scheduled_departure, status, NULL AS gate_id
      FROM gate_assignments
      WHERE scheduled_time BETWEEN NOW() AND NOW() + INTERVAL '4 hours'
      ORDER BY gate_number, scheduled_time ASC
    `);
    const assignments = assignmentsResult.rows;

    const conflicts = [];
    const gateMap = {};
    for (const a of assignments) {
      const key = a.gate_number || a.gate_id;
      if (!gateMap[key]) gateMap[key] = [];
      gateMap[key].push(a);
    }
    for (const [, flights] of Object.entries(gateMap)) {
      for (let i = 0; i < flights.length - 1; i++) {
        const curr = flights[i];
        const next = flights[i + 1];
        const currDep = new Date(curr.scheduled_departure);
        const nextDep = new Date(next.scheduled_departure);
        const diffMinutes = (nextDep - currDep) / 60000;
        if (diffMinutes < 45) {
          conflicts.push({
            gate: curr.gate_number || String(curr.gate_id),
            terminal: curr.terminal,
            flight_a: curr.flight_number,
            flight_b: next.flight_number,
            overlap_minutes: Math.round(45 - diffMinutes),
          });
        }
      }
    }

    const prompt = `Analyze gate assignments and detected conflicts for the next 4 hours.

Gate Assignments (next 4 hours):
${JSON.stringify(assignments, null, 2)}

Detected Conflicts (< 45 min turnaround on same gate):
${JSON.stringify(conflicts, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "conflicts": [{ "gate": "string", "flight_a": "string", "flight_b": "string", "overlap_minutes": 0, "severity": "low|medium|high" }],
  "suggested_swaps": [{ "move_flight": "string", "from_gate": "string", "to_gate": "string", "rationale": "string" }],
  "impact_score": <0-100>,
  "total_passengers_affected": <number>,
  "resolution_priority": "string"
}`;

    const systemPrompt = 'You are an expert airport gate operations AI. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { conflicts, suggested_swaps: [], impact_score: null, raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'gate-conflicts', { assignments_count: assignments.length, conflicts_count: conflicts.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Gate Conflict Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /connection-analysis - Passenger Connection Saver
// ---------------------------------------------------------------------------
router.post(
  '/connection-analysis',
  authenticateToken,
  aiRateLimiter,
  [body('flight_ids').isArray({ min: 1 }).withMessage('flight_ids must be a non-empty array')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { flight_ids } = req.body;
      if (!flight_ids.every((id) => Number.isInteger(Number(id)))) {
        return res.status(400).json({ error: 'All flight_ids must be integers.' });
      }

      const arrivingResult = await pool.query(
        'SELECT * FROM flight_schedule WHERE id = ANY($1) ORDER BY scheduled_time ASC',
        [flight_ids]
      );
      const arrivingFlights = arrivingResult.rows;

      if (arrivingFlights.length === 0) {
        return res.status(404).json({ error: 'No flights found for provided flight_ids.' });
      }

      const connectionsResult = await pool.query(`
        SELECT * FROM flight_schedule
        WHERE scheduled_time BETWEEN NOW() AND NOW() + INTERVAL '3 hours'
          AND status IN ('on_time', 'boarding')
        ORDER BY scheduled_time ASC
        LIMIT 50
      `);
      const connectionFlights = connectionsResult.rows;

      const prompt = `Analyze passenger connection risks at an airport.

Arriving Flights:
${JSON.stringify(arrivingFlights, null, 2)}

Potential Connection Flights Departing Soon:
${JSON.stringify(connectionFlights, null, 2)}

Respond ONLY with valid JSON in this format:
{
  "at_risk_connections": [
    {
      "arriving_flight": "string",
      "connection_flight": "string",
      "risk_level": "low|medium|high|critical",
      "reason": "string",
      "recommended_action": "string",
      "time_to_connection_min": <number>
    }
  ],
  "rebooking_priority_order": ["string"],
  "total_at_risk_passengers": <number>,
  "gate_proximity_issues": ["string"],
  "summary": "string"
}`;

      const systemPrompt = 'You are an expert airline operations AI specializing in passenger connection management. Respond ONLY with valid JSON.';
      const aiResponse = await callOpenRouter(prompt, systemPrompt);
      const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

      const userId = req.user?.id || req.user?.userId;
      await saveAnalysis(userId, 'connection-analysis', { flight_ids }, parsed);
      res.json(parsed);
    } catch (err) {
      console.error('AI Connection Analysis Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /weather-routing - Weather-Aware Route Planner
// ---------------------------------------------------------------------------
router.post('/weather-routing', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { conditions } = req.body;
    if (!conditions || typeof conditions !== 'object') {
      return res.status(400).json({ error: 'conditions object is required (wind_speed, visibility, ceiling).' });
    }

    const { wind_speed, visibility, ceiling } = conditions;

    const prompt = `Based on the following weather conditions, recommend runway selection, taxiway alternatives, and ground hold times.

Weather Conditions:
- Wind Speed: ${wind_speed !== undefined ? wind_speed + ' knots' : 'Unknown'}
- Visibility: ${visibility !== undefined ? visibility + ' SM' : 'Unknown'}
- Ceiling: ${ceiling !== undefined ? ceiling + ' ft AGL' : 'Unknown'}

Respond ONLY with valid JSON in this format:
{
  "runway_recommendations": [
    {
      "runway": "string",
      "suitability": "preferred|acceptable|not_recommended",
      "reason": "string",
      "crosswind_component_knots": <number>
    }
  ],
  "taxiway_alternatives": ["string"],
  "ground_hold_minutes": <number or null>,
  "ground_hold_reason": "string or null",
  "flight_category": "VFR|MVFR|IFR|LIFR",
  "approach_minimums_met": true,
  "operational_notes": ["string"],
  "faa_advisory": "string",
  "safety_risk_level": "low|medium|high|critical"
}`;

    const systemPrompt = 'You are an expert airport operations and ATC AI with deep FAA regulation knowledge. Safety first. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };

    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'weather-routing', { conditions }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Weather Routing Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /crew-cross-training - Crew Cross-Training Optimizer
// ---------------------------------------------------------------------------
router.post('/crew-cross-training', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    let crews = [];
    try {
      const r = await pool.query('SELECT * FROM ground_crews ORDER BY id ASC LIMIT 200');
      crews = r.rows;
    } catch (e) { crews = []; }

    const prompt = `Given these crew members and their skills/certifications, identify skill gaps and recommend cross-training pairings.

Crews:
${JSON.stringify(crews, null, 2)}

Respond ONLY with valid JSON:
{
  "skill_gaps": [{ "skill": "string", "current_coverage_pct": <0-100>, "target_coverage_pct": <0-100>, "gap_severity": "low|medium|high" }],
  "training_pairings": [{ "trainer_crew": "string", "trainee_crew": "string", "skill": "string", "estimated_hours": <number>, "priority": "low|medium|high" }],
  "redundancy_score": <0-100>,
  "single_points_of_failure": ["string"],
  "expected_delay_reduction_pct": <number>,
  "training_schedule": [{ "week": <number>, "focus": "string", "crews_involved": ["string"] }],
  "summary": "string"
}`;
    const systemPrompt = 'You are an expert airport workforce planner. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'crew-cross-training', { crew_count: crews.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Crew Cross-Training Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /cost-optimization - Cost Optimization Suggester
// ---------------------------------------------------------------------------
router.post('/cost-optimization', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const flightsResult = await pool.query(`
      SELECT flight_number, airline, scheduled_time, status, terminal, gate
      FROM flight_schedule ORDER BY scheduled_time DESC LIMIT 100
    `);

    const delaysResult = await pool.query(
      'SELECT flight_number, predicted_delay_min, delay_reason, affected_passengers FROM delay_predictions ORDER BY id DESC LIMIT 50'
    );

    const maintenanceResult = await pool.query(
      'SELECT equipment_type, maintenance_type, priority, status FROM maintenance_logs ORDER BY id DESC LIMIT 30'
    );

    const prompt = `Analyze the flight schedule, delays, and maintenance to suggest cost optimizations (fuel burn, crew OT, gate premiums).

Flights:
${JSON.stringify(flightsResult.rows, null, 2)}

Delays:
${JSON.stringify(delaysResult.rows, null, 2)}

Maintenance:
${JSON.stringify(maintenanceResult.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "current_estimated_cost_usd": <number>,
  "suggestions": [
    { "category": "fuel|crew_ot|gate_premium|maintenance|other", "action": "string", "estimated_savings_usd": <number>, "roi_days": <number>, "priority": "low|medium|high", "implementation_effort": "low|medium|high" }
  ],
  "quick_wins": ["string"],
  "total_potential_savings_usd": <number>,
  "payback_period_days": <number>,
  "summary": "string"
}`;
    const systemPrompt = 'You are an expert aviation cost analyst. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'cost-optimization', { flights: flightsResult.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Cost Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /incident-prediction - Incident Prediction
// ---------------------------------------------------------------------------
router.post('/incident-prediction', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { hours_ahead = 24 } = req.body || {};
    const horizon = Math.min(168, Math.max(1, parseInt(hours_ahead) || 24));

    const incidents = await pool.query(`
      SELECT
        EXTRACT(DOW FROM reported_at) AS day_of_week,
        EXTRACT(HOUR FROM reported_at) AS hour_of_day,
        incident_type AS type, severity, location, COUNT(*) AS cnt, ARRAY_AGG(id) AS source_ids
      FROM incident_reports
      WHERE reported_at > NOW() - INTERVAL '180 days'
      GROUP BY day_of_week, hour_of_day, incident_type, severity, location
      ORDER BY cnt DESC LIMIT 200
    `);

    const prompt = `Use historical incident patterns to predict high-risk windows for the next ${horizon} hours.

Historical incident patterns:
${JSON.stringify(incidents.rows, null, 2)}

Current time: ${new Date().toISOString()}

Respond ONLY with valid JSON:
{
  "horizon_hours": ${horizon},
  "overall_risk_level": "low|medium|high|critical",
  "risk_score": <0-100>,
  "high_risk_windows": [
    { "starts_at": "ISO datetime", "ends_at": "ISO datetime", "incident_type": "string", "probability": <0.0-1.0>, "location": "string", "recommended_staffing": "string" }
  ],
  "preventive_actions": ["string"],
  "high_risk_locations": ["string"],
  "seasonal_factors": ["string"],
  "summary": "string"
}`;
    const systemPrompt = 'You are an expert airport safety analyst. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'incident-prediction', { horizon }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Incident Prediction Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /baggage-reconciliation - Baggage Reconciliation AI
// ---------------------------------------------------------------------------
router.post(
  '/baggage-reconciliation',
  authenticateToken,
  aiRateLimiter,
  [body('missing_bag').isObject().withMessage('missing_bag object is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { missing_bag } = req.body;
      const tracking = await pool.query('SELECT * FROM baggage_tracking ORDER BY last_scan_time DESC LIMIT 200');

      const prompt = `A bag is missing. Cross-check tracking data and suggest the most likely current locations.

Missing Bag:
${JSON.stringify(missing_bag, null, 2)}

Recent Tracking Scans:
${JSON.stringify(tracking.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "tag_id": "string",
  "candidate_locations": [
    { "location": "string", "confidence": <0.0-1.0>, "evidence": "string", "next_action": "string" }
  ],
  "most_likely_location": "string",
  "recommended_recovery_steps": ["string"],
  "estimated_recovery_minutes": <number>,
  "passenger_impact": "string",
  "escalation_required": true
}`;
      const systemPrompt = 'You are an airport baggage operations AI. Respond ONLY with valid JSON.';
      const aiResponse = await callOpenRouter(prompt, systemPrompt);
      const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
      const userId = req.user?.id || req.user?.userId;
      await saveAnalysis(userId, 'baggage-reconciliation', { tag_id: missing_bag?.tag_id }, parsed);
      res.json(parsed);
    } catch (err) {
      console.error('AI Baggage Reconciliation Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /sustainability-report - Sustainability Reporter
// ---------------------------------------------------------------------------
router.post('/sustainability-report', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const flights = await pool.query('SELECT flight_number, airline, origin, destination, flight_type, aircraft_type, status FROM flight_schedule ORDER BY scheduled_time DESC LIMIT 200');
    const delays = await pool.query('SELECT flight_number, predicted_delay_min, delay_reason FROM delay_predictions ORDER BY id DESC LIMIT 100');

    const prompt = `Estimate taxi-out fuel burn and CO2 emissions from the recent flights and delays. Suggest greener routing and scheduling.

Flights (last 200):
${JSON.stringify(flights.rows, null, 2)}

Delays:
${JSON.stringify(delays.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "kpis": {
    "estimated_taxi_minutes_total": <number>,
    "estimated_fuel_burn_liters": <number>,
    "estimated_co2_kg": <number>,
    "co2_per_flight_avg_kg": <number>
  },
  "by_airline": [
    { "airline": "string", "flights": <number>, "estimated_co2_kg": <number>, "efficiency_rating": "A|B|C|D|F" }
  ],
  "trends": [{ "metric": "string", "change_pct": <number>, "direction": "up|down" }],
  "recommendations": [
    { "action": "string", "estimated_co2_saving_kg": <number>, "priority": "low|medium|high", "cost_impact": "savings|neutral|cost" }
  ],
  "benchmark_comparison": "string",
  "summary": "string"
}`;
    const systemPrompt = 'You are an aviation sustainability AI. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'sustainability-report', { flights: flights.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Sustainability Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /shift-handover - AI Shift Handover Report Generator (NEW)
// ---------------------------------------------------------------------------
router.post('/shift-handover', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const hoursBack = 8;
    const [incidents, delays, gateChanges, maintenance] = await Promise.all([
      pool.query(`SELECT * FROM incident_reports WHERE reported_at > NOW() - INTERVAL '${hoursBack} hours' ORDER BY severity DESC`),
      pool.query(`SELECT * FROM delay_predictions WHERE updated_at > NOW() - INTERVAL '${hoursBack} hours' OR created_at > NOW() - INTERVAL '${hoursBack} hours' ORDER BY predicted_delay_min DESC LIMIT 20`),
      pool.query(`SELECT * FROM gate_assignments WHERE updated_at > NOW() - INTERVAL '${hoursBack} hours' ORDER BY updated_at DESC LIMIT 20`),
      pool.query(`SELECT * FROM maintenance_logs WHERE updated_at > NOW() - INTERVAL '${hoursBack} hours' ORDER BY priority DESC LIMIT 20`),
    ]);

    const prompt = `Generate a comprehensive shift handover report covering the last ${hoursBack} hours of airport operations.

Incidents (last ${hoursBack}h):
${JSON.stringify(incidents.rows, null, 2)}

Delays (last ${hoursBack}h):
${JSON.stringify(delays.rows, null, 2)}

Gate Changes (last ${hoursBack}h):
${JSON.stringify(gateChanges.rows, null, 2)}

Maintenance Updates (last ${hoursBack}h):
${JSON.stringify(maintenance.rows, null, 2)}

Current time: ${new Date().toISOString()}

Respond ONLY with valid JSON:
{
  "shift_period": { "start": "ISO", "end": "ISO" },
  "executive_summary": "string",
  "critical_items": [
    { "type": "incident|delay|maintenance|gate", "description": "string", "status": "string", "action_required": "string", "priority": "low|medium|high|critical" }
  ],
  "outstanding_actions": [
    { "action": "string", "responsible_party": "string", "deadline": "string", "status": "open|in_progress" }
  ],
  "operational_highlights": ["string"],
  "crew_recommendations": ["string"],
  "weather_advisory": "string",
  "next_shift_alerts": ["string"],
  "kpis": {
    "incidents_count": <number>,
    "critical_incidents": <number>,
    "delayed_flights": <number>,
    "average_delay_min": <number>
  }
}`;

    const systemPrompt = 'You are an expert airport operations manager AI generating shift handover reports. Be concise but comprehensive. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'shift-handover', { hours_back: hoursBack }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Shift Handover Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /predictive-maintenance - Predictive Maintenance AI (NEW)
// ---------------------------------------------------------------------------
router.post('/predictive-maintenance', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const [maintenance, incidents] = await Promise.all([
      pool.query('SELECT * FROM maintenance_logs ORDER BY scheduled_date ASC LIMIT 100'),
      pool.query(`SELECT incident_type AS type, location, COUNT(*) as cnt, ARRAY_AGG(id) AS source_ids FROM incident_reports GROUP BY incident_type, location ORDER BY cnt DESC LIMIT 50`),
    ]);

    const prompt = `Analyze maintenance log patterns and incident history to predict equipment failures before they occur.

Maintenance Logs:
${JSON.stringify(maintenance.rows, null, 2)}

Historical Incidents by Type/Location:
${JSON.stringify(incidents.rows, null, 2)}

Current time: ${new Date().toISOString()}

Respond ONLY with valid JSON:
{
  "failure_predictions": [
    {
      "equipment_id": "string",
      "equipment_type": "string",
      "failure_probability": <0.0-1.0>,
      "predicted_failure_window": "string",
      "failure_mode": "string",
      "recommended_action": "string",
      "urgency": "low|medium|high|critical",
      "cost_if_ignored_usd": <number>
    }
  ],
  "overdue_inspections": [
    { "equipment_id": "string", "last_maintenance": "string", "days_overdue": <number>, "risk": "low|medium|high" }
  ],
  "maintenance_schedule_optimization": ["string"],
  "total_risk_score": <0-100>,
  "estimated_prevention_savings_usd": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert predictive maintenance AI for airport infrastructure. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'predictive-maintenance', { maintenance_count: maintenance.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Predictive Maintenance Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /notam-briefing - AI NOTAM Briefing Generator (NEW)
// ---------------------------------------------------------------------------
router.post('/notam-briefing', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const notams = await pool.query(
      "SELECT * FROM weather_reports WHERE report_type = 'NOTAM' ORDER BY reported_at DESC LIMIT 20"
    );

    const weather = await pool.query(
      "SELECT * FROM weather_reports WHERE report_type IN ('METAR', 'TAF') ORDER BY reported_at DESC LIMIT 10"
    );

    const runways = await pool.query(
      "SELECT runway_id, status, ARRAY_AGG(id) AS source_ids FROM runway_utilization GROUP BY runway_id,status ORDER BY runway_id"
    );

    const prompt = `Parse and structure these NOTAMs and current weather to generate a comprehensive pilot/crew operational briefing.

Active NOTAMs:
${JSON.stringify(notams.rows, null, 2)}

Current Weather:
${JSON.stringify(weather.rows, null, 2)}

Runway Status:
${JSON.stringify(runways.rows, null, 2)}

Current time: ${new Date().toISOString()}

Respond ONLY with valid JSON:
{
  "briefing_time": "ISO datetime",
  "validity_period": "string",
  "runway_status": [
    { "runway": "string", "status": "open|closed|restricted", "restrictions": ["string"], "alternative": "string" }
  ],
  "taxiway_restrictions": [
    { "taxiway": "string", "restriction": "string", "alternative": "string" }
  ],
  "navigation_aids": [
    { "aid": "string", "status": "operational|degraded|out_of_service", "note": "string" }
  ],
  "flight_category": "VFR|MVFR|IFR|LIFR",
  "weather_summary": "string",
  "special_procedures": ["string"],
  "crew_actions_required": ["string"],
  "notam_summary": "string"
}`;

    const systemPrompt = 'You are an expert airport operations briefing AI with deep FAA/ICAO knowledge. Parse NOTAMs accurately. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'notam-briefing', { notam_count: notams.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI NOTAM Briefing Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /runway-simulator - Runway Capacity Simulator (NEW)
// ---------------------------------------------------------------------------
router.post(
  '/runway-simulator',
  authenticateToken,
  aiRateLimiter,
  [body('scenario').isObject().withMessage('scenario object is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { scenario } = req.body;
      const currentRunways = await pool.query('SELECT * FROM runway_utilization ORDER BY scheduled_time ASC LIMIT 50');

      const prompt = `Simulate the impact of a hypothetical scenario on airport runway capacity and operations.

Current Runway Operations:
${JSON.stringify(currentRunways.rows, null, 2)}

Hypothetical Scenario:
${JSON.stringify(scenario, null, 2)}

Respond ONLY with valid JSON:
{
  "scenario_summary": "string",
  "baseline_throughput_per_hour": <number>,
  "simulated_throughput_per_hour": <number>,
  "throughput_change_pct": <number>,
  "delay_cascade": [
    { "time_offset_min": <number>, "affected_flights": <number>, "cumulative_delay_min": <number> }
  ],
  "bottlenecks_created": ["string"],
  "mitigation_strategies": [
    { "action": "string", "recovery_time_min": <number>, "effectiveness": "low|medium|high" }
  ],
  "capacity_timeline": [
    { "time": "string", "available_capacity_pct": <number>, "note": "string" }
  ],
  "recommendation": "string",
  "overall_impact": "minimal|moderate|significant|severe"
}`;

      const systemPrompt = 'You are an expert airport capacity planning AI. Simulate scenarios accurately. Respond ONLY with valid JSON.';
      const aiResponse = await callOpenRouter(prompt, systemPrompt);
      const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
      const userId = req.user?.id || req.user?.userId;
      await saveAnalysis(userId, 'runway-simulator', { scenario }, parsed);
      res.json(parsed);
    } catch (err) {
      console.error('AI Runway Simulator Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /traffic-forecast - AI Traffic Volume Forecaster (NEW)
// ---------------------------------------------------------------------------
router.post('/traffic-forecast', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const [flights, delays, gates] = await Promise.all([
      pool.query(`
        SELECT flight_number, airline, scheduled_time, flight_type, aircraft_type, terminal, gate, status
        FROM flight_schedule
        WHERE scheduled_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        ORDER BY scheduled_time ASC
      `),
      pool.query('SELECT flight_number, predicted_delay_min, affected_passengers FROM delay_predictions ORDER BY predicted_delay_min DESC LIMIT 50'),
      pool.query('SELECT gate_number, terminal, scheduled_time, passenger_count, status FROM gate_assignments ORDER BY scheduled_time ASC LIMIT 100'),
    ]);

    const prompt = `Forecast passenger volume, flight counts, and peak hours for the next 24 hours at this airport.

Scheduled Flights (next 24h):
${JSON.stringify(flights.rows, null, 2)}

Current Delay Predictions:
${JSON.stringify(delays.rows, null, 2)}

Gate Assignments:
${JSON.stringify(gates.rows, null, 2)}

Current time: ${new Date().toISOString()}

Respond ONLY with valid JSON:
{
  "forecast_period": "string",
  "hourly_forecast": [
    { "hour": "HH:00", "flights": <number>, "estimated_passengers": <number>, "congestion_level": "low|medium|high|critical" }
  ],
  "peak_hours": ["string"],
  "off_peak_hours": ["string"],
  "bottleneck_risk": [
    { "location": "string", "time_window": "string", "risk": "low|medium|high", "mitigation": "string" }
  ],
  "staffing_recommendations": [
    { "time_window": "string", "area": "string", "recommended_staff_count": <number>, "reason": "string" }
  ],
  "total_expected_flights": <number>,
  "total_expected_passengers": <number>,
  "summary": "string"
}`;

    const systemPrompt = 'You are an expert airport capacity planning AI. Produce accurate 24-hour traffic forecasts. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, systemPrompt, { max_tokens: 4096 });
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    const userId = req.user?.id || req.user?.userId;
    await saveAnalysis(userId, 'traffic-forecast', { flights: flights.rows.length }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Traffic Forecast Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /emergency-response - AI Emergency Response Coordinator (NEW)
// ---------------------------------------------------------------------------
router.post(
  '/emergency-response',
  authenticateToken,
  aiRateLimiter,
  [
    body('incident_type').trim().notEmpty().withMessage('incident_type is required'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('severity must be low, medium, high, or critical'),
    body('location').trim().notEmpty().withMessage('location is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { incident_type, severity, location, description } = req.body;

      const [recentIncidents, crews, maintenance] = await Promise.all([
        pool.query(`
          SELECT incident_type, severity, location, status FROM incident_reports
          WHERE reported_at > NOW() - INTERVAL '72 hours'
          ORDER BY reported_at DESC LIMIT 20
        `),
        pool.query(`
          SELECT crew_name, crew_type, members_count, status, assigned_terminal, specialization
          FROM ground_crews WHERE status IN ('active', 'standby') ORDER BY crew_type ASC
        `),
        pool.query(`
          SELECT equipment_id, equipment_type, status, priority, location FROM maintenance_logs
          WHERE status IN ('in_progress', 'scheduled') AND priority IN ('high', 'critical')
          ORDER BY priority DESC LIMIT 10
        `),
      ]);

      const prompt = `Review this hypothetical emergency scenario and prepare an advisory training plan. No actual incident or operational authorization is established.

Incident Details:
- Type: ${incident_type}
- Severity: ${severity}
- Location: ${location}
- Description: ${description || 'Not provided'}
- Planning review drafted at: ${new Date().toISOString()}

Available Crews:
${JSON.stringify(crews.rows, null, 2)}

Recent Incidents (72h context):
${JSON.stringify(recentIncidents.rows, null, 2)}

Active Maintenance (may impact response):
${JSON.stringify(maintenance.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "incident_classification": "string",
  "threat_level": "low|medium|high|critical",
  "immediate_actions": ["string"],
  "triage_checklist": [
    { "step": <number>, "action": "string", "responsible_party": "string", "time_target_minutes": <number>, "priority": "immediate|urgent|routine" }
  ],
  "agency_notifications": [
    { "agency": "string", "contact_method": "string", "message_template": "string", "urgency": "immediate|15min|30min" }
  ],
  "resource_deployment": [
    { "resource_type": "string", "quantity": <number>, "deployment_location": "string", "eta_minutes": <number> }
  ],
  "area_restrictions": ["string"],
  "passenger_communication": "string",
  "estimated_resolution_minutes": <number>,
  "escalation_required": true,
  "post_incident_actions": ["string"],
  "summary": "string"
}`;

      const systemPrompt = 'You are an expert airport emergency response coordinator with FAA, ICAO, and NFPA knowledge. Provide comprehensive, actionable emergency plans. Respond ONLY with valid JSON.';
      const aiResponse = await callOpenRouter(prompt, systemPrompt, { max_tokens: 4096, temperature: 0.1 });
      const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
      const userId = req.user?.id || req.user?.userId;
      await saveAnalysis(userId, 'emergency-response', { incident_type, severity, location }, parsed);
      res.json(parsed);
    } catch (err) {
      console.error('AI Emergency Response Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ===========================================================================
// Apply pass 5 — full backlog (additive only)
// ENV vars used (all optional; endpoints return 503 missing:<ENV> when unset):
//   OPENROUTER_API_KEY  — AI inference
//   ADSB_API_KEY        — ADS-B Exchange / FlightRadar feed
//   FAA_NEXTGEN_API_KEY — FAA SWIM / NextGen feed
//   AIRLINE_API_KEY     — partner airline operational APIs (codeshare, OOOI)
// PRODUCT-DECISION defaults are documented inline.
// ===========================================================================

function aiKeyOr503(res) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
    return false;
  }
  return true;
}

function envKeyOr503(res, name) {
  const v = process.env[name];
  if (!v || /your_.*_here/i.test(v)) {
    res.status(503).json({ error: `${name} not configured`, missing: name });
    return false;
  }
  return v;
}

// ---------------------------------------------------------------------------
// POST /passenger-experience — connection-flow & crowd optimization
// PRODUCT-DECISION: Connection-protection policy = protect any pax with <= 60min
// ground time and inbound delay >= 15min; suggest gate moves, hold options,
// and rebooking only if MCT cannot be met. (Reasonable industry default.)
// ---------------------------------------------------------------------------
router.post('/passenger-experience', authenticateToken, aiRateLimiter, async (req, res) => {
  if (!aiKeyOr503(res)) return;
  try {
    const { terminal, current_pax_count = 0, peak_hour = false, focus_areas = [] } = req.body || {};
    const flights = await pool.query('SELECT id, flight_number, scheduled_time, gate_number AS gate, status FROM gate_assignments ORDER BY scheduled_time ASC LIMIT 50');
    const prompt = `Generate a passenger-experience optimization plan for terminal ${terminal || 'all'} (current pax=${current_pax_count}, peak=${peak_hour}).
Focus areas: ${JSON.stringify(focus_areas)}
Connection-protection policy: protect pax with <=60min connection AND inbound delay >=15min; suggest gate moves, hold, or rebook only if MCT not met.
Recent gate assignments: ${JSON.stringify(flights.rows.slice(0, 20))}

Respond ONLY with JSON:
{
  "crowd_flow": [{ "zone": "string", "level": "low|medium|high", "recommendation": "string" }],
  "connection_protections": [{ "flight": "string", "issue": "string", "action": "move_gate|hold|rebook", "rationale": "string" }],
  "wayfinding_updates": ["string"],
  "service_recovery_offers": ["string"],
  "estimated_satisfaction_lift_pct": <number>,
  "summary": "string"
}`;
    const sys = 'You are an expert airport passenger experience optimizer. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, sys, { max_tokens: 2048, temperature: 0.2 });
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    await saveAnalysis(req.user?.id || req.user?.userId, 'passenger-experience', { terminal, current_pax_count, peak_hour }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Passenger Experience Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /revenue-management — dynamic gate fees, slot pricing
// PRODUCT-DECISION: Dynamic-pricing policy = base-fee floor; surcharge up to
// +50% during top-decile demand windows; carrier-tier discount cap 20%.
// (Reasonable airport-revenue default.)
// ---------------------------------------------------------------------------
router.post('/revenue-management', authenticateToken, aiRateLimiter, async (req, res) => {
  if (!aiKeyOr503(res)) return;
  try {
    const { window_start, window_end, base_gate_fee_usd = 350, base_slot_fee_usd = 1500 } = req.body || {};
    const prompt = `Recommend dynamic pricing for gate and slot fees.
Window: ${window_start || 'today'} to ${window_end || 'today+24h'}.
Base gate fee USD: ${base_gate_fee_usd}; Base slot fee USD: ${base_slot_fee_usd}.
Pricing policy: floor=base; surcharge up to +50% in top-decile demand; carrier discount cap 20%.

Respond ONLY with JSON:
{
  "gate_pricing": [{ "hour_local": <number>, "demand_index": <number>, "recommended_fee_usd": <number>, "rationale": "string" }],
  "slot_pricing": [{ "hour_local": <number>, "demand_index": <number>, "recommended_fee_usd": <number>, "rationale": "string" }],
  "carrier_discount_recommendations": [{ "carrier_tier": "string", "discount_pct": <number>, "rationale": "string" }],
  "expected_revenue_lift_pct": <number>,
  "policy_compliance_notes": ["string"],
  "summary": "string"
}`;
    const sys = 'You are an airport revenue management AI. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, sys, { max_tokens: 2048, temperature: 0.1 });
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    await saveAnalysis(req.user?.id || req.user?.userId, 'revenue-management', { window_start, window_end }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Revenue Management Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /multi-agency-coordination — fire/medical/security workflow
// PRODUCT-DECISION: Default workflow = ICS-100 incident command; primary
// agency by incident type (fire→ARFF, medical→EMS, security→TSA/LEO).
// ---------------------------------------------------------------------------
router.post('/multi-agency-coordination', authenticateToken, aiRateLimiter, async (req, res) => {
  if (!aiKeyOr503(res)) return;
  try {
    const { incident_type, severity = 'medium', agencies_involved = [], location } = req.body || {};
    const prompt = `Generate multi-agency incident coordination plan using ICS-100 framework.
Incident: ${incident_type} (${severity}) at ${location || 'unspecified'}.
Agencies involved: ${JSON.stringify(agencies_involved)}.
Default primary by type: fire->ARFF, medical->EMS, security->TSA/LEO.

Respond ONLY with JSON:
{
  "incident_command": { "primary_agency": "string", "incident_commander": "string", "command_post_location": "string" },
  "agency_assignments": [{ "agency": "string", "role": "string", "contact_method": "string" }],
  "communication_channels": [{ "channel": "string", "frequency_or_id": "string", "purpose": "string" }],
  "resource_allocation": [{ "resource": "string", "agency": "string", "deployment_minute": <number> }],
  "decision_authority_matrix": [{ "decision": "string", "authority": "string" }],
  "post_incident_handoff": ["string"],
  "summary": "string"
}`;
    const sys = 'You are an airport emergency operations AI versed in NIMS/ICS. Respond ONLY with valid JSON.';
    const aiResponse = await callOpenRouter(prompt, sys, { max_tokens: 2048, temperature: 0.1 });
    const parsed = parseAIJson(aiResponse) || { raw_response: aiResponse };
    await saveAnalysis(req.user?.id || req.user?.userId, 'multi-agency-coordination', { incident_type, severity }, parsed);
    res.json(parsed);
  } catch (err) {
    console.error('AI Multi-Agency Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /adsb-live — live ADS-B feed (NEEDS-CREDS: ADSB_API_KEY)
// PRODUCT-DECISION: bbox defaults to a 40NM box around airport center
// (lat,lon from env AIRPORT_LAT/AIRPORT_LON, fallback 40.6413/-73.7781 KJFK).
// Returns in-memory empty list when key missing -> 503 missing:ADSB_API_KEY.
// ---------------------------------------------------------------------------
router.get('/adsb-live', authenticateToken, async (req, res) => {
  const key = envKeyOr503(res, 'ADSB_API_KEY');
  if (!key) return;
  try {
    // Real call would hit https://adsbexchange.com/... ; we don't ship it without
    // a key. Returning a structured stub envelope with the requested bbox.
    const lat = parseFloat(process.env.AIRPORT_LAT || '40.6413');
    const lon = parseFloat(process.env.AIRPORT_LON || '-73.7781');
    res.status(503).json({error:'ADSB credentials are configured, but an authorized live vendor adapter is required. No live feed was checked.',configured:true,provider:'adsb'});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /faa-nextgen — NextGen / SWIM data subscription (NEEDS-CREDS: FAA_NEXTGEN_API_KEY)
// PRODUCT-DECISION: subscribe to TFMData (delays/GDPs) by default.
// ---------------------------------------------------------------------------
router.get('/faa-nextgen', authenticateToken, async (req, res) => {
  const key = envKeyOr503(res, 'FAA_NEXTGEN_API_KEY');
  if (!key) return;
  res.status(503).json({error:'FAA credentials are configured, but the authorized SWIM adapter is required. No live feed was checked.',configured:true,provider:'faa-swim'});
});

// ---------------------------------------------------------------------------
// GET /airline-partners — partner airline ops APIs (NEEDS-CREDS: AIRLINE_API_KEY)
// PRODUCT-DECISION: default to OOOI events + codeshare schedules.
// ---------------------------------------------------------------------------
router.get('/airline-partners', authenticateToken, async (req, res) => {
  const key = envKeyOr503(res, 'AIRLINE_API_KEY');
  if (!key) return;
  res.status(503).json({error:'Airline credentials are configured, but an authorized partner adapter is required. No delivery or feed check is asserted.',configured:true,provider:'airline-partner'});
});

// ---------------------------------------------------------------------------
// POST /noise-impact — TOO-RISKY: heuristic in-memory acoustic model only
// (additive). Real INM/AEDT integration would require a separate engine.
// PRODUCT-DECISION: simple 1/r^2 attenuation + dB(A) baseline 95 at source.
// ---------------------------------------------------------------------------
router.post('/noise-impact', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { runway = '04R', ops_per_hour = 30, receptors = [] } = req.body || {};
    const sourceDb = 95;
    const contours = [1, 2, 5, 10].map((nm) => {
      const meters = nm * 1852;
      const db = Math.max(0, sourceDb - 20 * Math.log10(Math.max(meters, 1)));
      return { distance_nm: nm, est_dba: Math.round(db * 10) / 10 };
    });
    const receptorImpacts = (Array.isArray(receptors) ? receptors : []).map((r) => {
      const d = Math.max(parseFloat(r.distance_nm || 1), 0.1) * 1852;
      const dba = Math.max(0, sourceDb - 20 * Math.log10(d));
      return { name: r.name || 'unknown', distance_nm: r.distance_nm, est_dba: Math.round(dba * 10) / 10 };
    });
    res.json({
      runway, ops_per_hour, model: 'inverse-square-stub',
      source_db: sourceDb, contours, receptor_impacts: receptorImpacts,
      note: 'Heuristic stub; replace with INM/AEDT for production use.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /emergency-simulation — TOO-RISKY: in-memory event simulator stub
// (additive). Real sim engine is out of scope; we generate a deterministic
// timeline based on declared incident parameters.
// PRODUCT-DECISION: phases = detect, dispatch, contain, resolve, debrief.
// ---------------------------------------------------------------------------
router.post('/emergency-simulation', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { incident_type = 'aircraft_fire', severity = 'medium', responders = 4 } = req.body || {};
    const sevMul = { low: 0.5, medium: 1, high: 1.7, critical: 2.5 }[severity] || 1;
    const phases = [
      { phase: 'detect',   start_min: 0,                 duration_min: Math.round(2 * sevMul) },
      { phase: 'dispatch', start_min: Math.round(2 * sevMul), duration_min: Math.round(3 * sevMul) },
      { phase: 'contain',  start_min: Math.round(5 * sevMul), duration_min: Math.round(15 * sevMul) },
      { phase: 'resolve',  start_min: Math.round(20 * sevMul), duration_min: Math.round(30 * sevMul) },
      { phase: 'debrief',  start_min: Math.round(50 * sevMul), duration_min: 30 }
    ];
    res.json({
      incident_type, severity, responders, model: 'phase-timeline-stub',
      phases,
      total_estimated_minutes: phases.reduce((s, p) => Math.max(s, p.start_min + p.duration_min), 0),
      note: 'Heuristic timeline; replace with discrete-event sim for production use.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
