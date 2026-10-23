'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const fp = require('../src/services/featurePack');
const sample = [ { flight_number:'AA100', airline:'AA', origin:'JFK', destination:'LAX', status:'delayed', flight_type:'departure', gate:'A1', terminal:'1' }, { flight_number:'AA101', airline:'AA', origin:'JFK', destination:'MIA', status:'on_time', flight_type:'departure', gate:'', terminal:'1' } ];
test('tasks: create/list/update are owner-scoped', () => {
  const s = fp.createTaskStore(); const a = s.create('u1', { title: 'Review flight' });
  assert.equal(s.list('u1').length, 1); assert.equal(s.list('u2').length, 0);
  assert.equal(s.update('u2', a.id, { status: 'done' }), null);
  assert.equal(s.update('u1', a.id, { status: 'done' }).status, 'done');
  assert.throws(() => s.create('u1', {}), /title is required/);
});
test('search/filter and export preserve values', () => {
  assert.equal(fp.filterRecords(sample, { q: 'AA10', searchFields: ["flight_number", "airline", "origin", "destination", "status"] }).length, 2);
  assert.equal(fp.filterRecords(sample, { status: 'delayed' }).length, 1);
  const csv = fp.toCsv(sample, ["id", "flight_number", "airline", "origin", "destination", "status", "flight_type"]); assert.match(csv, /,/);
  assert.ok(fp.toCsv([{ a: 0, b: false, c: '' }], ['a', 'b', 'c']).includes('0,false,'));
});
test('AI fallback is labelled deterministic and preserves 0/false', async () => {
  const saved = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
  try { for (const f of fp.AI_FEATURES) { const out = await fp.runAi(f.id, sample, {});
    assert.equal(out.aiGenerated, false); assert.equal(out.source, 'deterministic-fallback');
    assert.ok(JSON.stringify(out.sections).length > 2); }
    const empty = await fp.runAi(fp.AI_FEATURES[0].id, [], {}); assert.equal(empty.recordCount, 0);
  } finally { if (saved.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = saved.OPENROUTER_API_KEY; if (saved.OPENAI_API_KEY) process.env.OPENAI_API_KEY = saved.OPENAI_API_KEY; }
});
