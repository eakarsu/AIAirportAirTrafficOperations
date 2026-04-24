const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(prompt, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Airport Operations'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
  return data.choices[0].message.content;
}

// AI Gate Optimization
router.post('/optimize-gates', authenticateToken, async (req, res) => {
  try {
    const gates = await pool.query('SELECT * FROM gate_assignments ORDER BY scheduled_time ASC');
    const prompt = `Analyze these gate assignments and provide optimization recommendations. Consider terminal proximity, aircraft size compatibility, connection times, and passenger convenience.\n\nCurrent Assignments:\n${JSON.stringify(gates.rows, null, 2)}\n\nProvide:\n1. Optimization score (0-100)\n2. Specific gate swap recommendations\n3. Conflict alerts\n4. Efficiency improvements\n5. Passenger impact analysis`;

    const systemPrompt = 'You are an expert airport operations AI specializing in gate assignment optimization. Provide actionable, data-driven recommendations. Format your response with clear sections using markdown headers and bullet points.';

    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis: aiResponse, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Gate Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Crew Scheduling
router.post('/optimize-crews', authenticateToken, async (req, res) => {
  try {
    const crews = await pool.query('SELECT * FROM ground_crews ORDER BY shift_start ASC');
    const prompt = `Analyze these ground crew schedules and provide optimization recommendations. Consider shift coverage, specialization needs, overtime risks, and workload balance.\n\nCurrent Crews:\n${JSON.stringify(crews.rows, null, 2)}\n\nProvide:\n1. Coverage analysis\n2. Scheduling conflicts\n3. Recommended shift adjustments\n4. Efficiency score\n5. Fatigue risk assessment`;

    const systemPrompt = 'You are an expert airport ground operations AI specializing in crew scheduling and resource optimization. Provide actionable recommendations for optimal crew deployment. Format your response with clear sections using markdown headers and bullet points.';

    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis: aiResponse, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Crew Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Delay Prediction
router.post('/predict-delays', authenticateToken, async (req, res) => {
  try {
    const delays = await pool.query('SELECT * FROM delay_predictions ORDER BY predicted_delay_min DESC');
    const prompt = `Analyze these flight delay predictions and provide comprehensive rebooking recommendations. Consider cascading delays, connection impacts, and passenger priority.\n\nCurrent Predictions:\n${JSON.stringify(delays.rows, null, 2)}\n\nProvide:\n1. Delay cascade analysis\n2. Priority rebooking recommendations\n3. Alternative flight suggestions\n4. Passenger communication templates\n5. Resource reallocation needs`;

    const systemPrompt = 'You are an expert airline operations AI specializing in delay prediction and passenger rebooking. Provide detailed, passenger-focused recommendations. Format your response with clear sections using markdown headers and bullet points.';

    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis: aiResponse, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Delay Prediction Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Baggage Flow
router.post('/optimize-baggage', authenticateToken, async (req, res) => {
  try {
    const baggage = await pool.query('SELECT * FROM baggage_tracking ORDER BY last_scan_time DESC');
    const prompt = `Analyze the baggage flow data and provide optimization recommendations. Consider routing efficiency, bottleneck detection, lost baggage risks, and priority handling.\n\nCurrent Tracking Data:\n${JSON.stringify(baggage.rows, null, 2)}\n\nProvide:\n1. Flow efficiency score\n2. Bottleneck identification\n3. Lost baggage risk alerts\n4. Routing optimization suggestions\n5. Priority handling recommendations`;

    const systemPrompt = 'You are an expert airport baggage operations AI specializing in baggage flow optimization and tracking. Provide actionable recommendations for improving baggage handling. Format your response with clear sections using markdown headers and bullet points.';

    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis: aiResponse, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Baggage Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI Runway Utilization
router.post('/optimize-runways', authenticateToken, async (req, res) => {
  try {
    const runways = await pool.query('SELECT * FROM runway_utilization ORDER BY scheduled_time ASC');
    const prompt = `Analyze runway utilization data and provide optimization recommendations. Consider weather conditions, aircraft separation, noise abatement, and throughput maximization.\n\nCurrent Utilization:\n${JSON.stringify(runways.rows, null, 2)}\n\nProvide:\n1. Utilization efficiency score\n2. Capacity optimization recommendations\n3. Weather impact analysis\n4. Sequencing improvements\n5. Safety compliance check`;

    const systemPrompt = 'You are an expert air traffic operations AI specializing in runway utilization and optimization. Provide safety-first, efficiency-focused recommendations. Format your response with clear sections using markdown headers and bullet points.';

    const aiResponse = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis: aiResponse, timestamp: new Date().toISOString(), model: OPENROUTER_MODEL });
  } catch (err) {
    console.error('AI Runway Optimization Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
