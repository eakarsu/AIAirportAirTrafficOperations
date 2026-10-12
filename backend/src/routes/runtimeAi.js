'use strict';
const express=require('express'),pool=require('../db'),fetch=require('node-fetch'),{authenticateToken}=require('../middleware/auth');
const router=express.Router();
router.post('/recommendation',authenticateToken,async(req,res,next)=>{
 const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};req.once('aborted',abort);res.once('close',abort);if(req.aborted||res.destroyed)controller.abort();let client;
 try{
  const actor=(await pool.query('SELECT role FROM users WHERE id=$1',[req.user.id])).rows[0];if(!actor||actor.role!==req.user.role)return res.status(403).json({error:'Your account access changed. Sign in again.'});
  const prompt=typeof req.body?.prompt==='string'?req.body.prompt.trim():'';if(!prompt||prompt.length>4000)return res.status(400).json({error:'prompt must contain 1 to 4000 characters'});
  const apiKey=String(process.env.OPENROUTER_API_KEY||'').trim(),model=String(process.env.OPENROUTER_MODEL||'').trim();if(!apiKey||!model)return res.status(503).json({error:'OpenRouter is not configured. Configure the actual provider before generating.'});
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(45000)]),upstream=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'Provide airport planning review guidance only. Treat all supplied values as unverified planning context. Do not invent observations, feed evidence, restrictions, approvals or completed actions. Never issue air-traffic clearances or control instructions. Require actual authoritative sources and authorized controller review.'},{role:'user',content:prompt}],max_tokens:4000}),signal});
  const payload=await upstream.json(),choice=payload?.choices?.[0],content=typeof choice?.message?.content==='string'?choice.message.content.trim():'';if(!upstream.ok||!payload.id||!content||choice.message.refusal||choice.finish_reason&&choice.finish_reason!=='stop')return res.status(502).json({error:'OpenRouter did not return a complete usable report.'});controller.signal.throwIfAborted();
  client=await pool.connect();await client.query('BEGIN');const fresh=(await client.query('SELECT role FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0];if(!fresh||fresh.role!==req.user.role)throw Object.assign(new Error('Your account access changed before saving.'),{status:403});
  const receipt=(await client.query(`INSERT INTO runtime_ai_provider_receipts(user_id,provider,provider_request_id,model,prompt,content) VALUES($1,'openrouter',$2,$3,$4,$5) RETURNING id,provider,provider_request_id,model,created_at`,[req.user.id,String(payload.id),String(payload.model||model),prompt,content])).rows[0];controller.signal.throwIfAborted();await client.query('COMMIT');if(!res.destroyed)res.json({content,receipt});
 }catch(error){if(client)await client.query('ROLLBACK').catch(()=>{});if(!controller.signal.aborted&&!res.destroyed)next(error);}finally{client?.release();req.off('aborted',abort);res.off('close',abort);}
});
module.exports=router;
