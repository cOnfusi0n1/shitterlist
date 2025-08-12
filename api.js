// api.js – SINGLE IMPLEMENTATION (requests, sync, placeholders for direct add/remove)
import { settings } from './settings';
import { API_ONLY, runAsync, slWarn, slInfo, slSuccess, showApiSyncMessage } from './core';
import { shitterData, apiPlayersCache, saveData, apiAddShitterDirect as placeAdd, apiRemoveShitterDirect as placeRemove } from './data';

export let apiData = { lastSync:0, syncInProgress:false, apiToken:null, apiStatus:'disconnected' };

export function makeAPIRequest(endpoint, method='GET', body, cb){
  if(!settings.enableAPI || !settings.apiUrl){ cb&&cb(new Error('API deaktiviert'),null); return; }
  runAsync('apiReq',()=>{
    try {
      const URL=Java.type('java.net.URL');
      const OutputStreamWriter=Java.type('java.io.OutputStreamWriter');
      const BufferedReader=Java.type('java.io.BufferedReader');
      const InputStreamReader=Java.type('java.io.InputStreamReader');
      const StandardCharsets=Java.type('java.nio.charset.StandardCharsets');
      const url=new URL(settings.apiUrl+endpoint); const con=url.openConnection();
      con.setRequestMethod(method); con.setRequestProperty('Content-Type','application/json'); con.setRequestProperty('User-Agent','Shitterlist/1.0');
      if(apiData.apiToken) con.setRequestProperty('Authorization','Bearer '+apiData.apiToken);
      if(body && (method==='POST'||method==='PUT')){ con.setDoOutput(true); const w=new OutputStreamWriter(con.getOutputStream()); w.write(JSON.stringify(body)); w.flush(); w.close(); }
      const code=con.getResponseCode(); const reader=new BufferedReader(new InputStreamReader(code>=200&&code<300?con.getInputStream():con.getErrorStream(), StandardCharsets.UTF_8)); let line, txt=''; while((line=reader.readLine())!==null) txt+=line; reader.close();
      if(code>=200&&code<300){ let parsed=null; try{ parsed=txt?JSON.parse(txt):null; }catch(_){} cb&&cb(null,{status:code,data:parsed,success:true}); } else cb&&cb(new Error('HTTP '+code+': '+txt),null);
    } catch(e){ cb&&cb(e,null); }
  });
}

export function checkAPIStatus(cb){ if(!settings.enableAPI || !settings.apiUrl){ apiData.apiStatus='disconnected'; cb&&cb(false); return; } makeAPIRequest('/health','GET',null,(e,r)=>{ if(!e&&r){ apiData.apiStatus='connected'; cb&&cb(true);} else { apiData.apiStatus='error'; cb&&cb(false);} }); }

export function downloadFromAPI(cb){ showApiSyncMessage('Download...','info'); makeAPIRequest('/api/v1/players','GET',null,(err,res)=>{ if(err||!res||!res.data||!res.data.players){ showApiSyncMessage('Download Fehler: '+(err?err.message:'keine Daten'),'warning'); cb&&cb(false); return; } const list=res.data.players; if(API_ONLY){ apiPlayersCache.length=0; list.forEach(p=>apiPlayersCache.push({ id:p.id||Math.random().toString(36).substring(2,9), name:p.name, reason:p.reason||'API', category:p.category||'general', severity:p.severity||1, dateAdded: p.created_at?Date.parse(p.created_at):Date.now(), apiReportCount:p.report_count||1, verified:!!p.verified, source:'api'})); showApiSyncMessage(`Cache: ${apiPlayersCache.length}`,'success'); cb&&cb(true); return; } let added=0,updated=0; list.forEach(p=>{ const ex=shitterData.players.find(x=>x.name.toLowerCase()===p.name.toLowerCase()); if(ex){ if(p.severity>ex.severity){ ex.reason=p.reason; ex.severity=p.severity; ex.updatedAt=Date.now(); updated++; } } else { shitterData.players.push({ id:p.id||Math.random().toString(36).substring(2,9), name:p.name, reason:p.reason||'API', category:p.category||'general', severity:p.severity||1, dateAdded:Date.now(), source:'api'}); added++; } }); saveData(); showApiSyncMessage(`Download: ${added} neu / ${updated} upd`,'success'); cb&&cb(true); }); }

export function uploadToAPI(cb){ if(API_ONLY){ cb&&cb(true); return;} const locals=shitterData.players.filter(p=>p.source!=='api' && !p.uploaded); if(!locals.length){ showApiSyncMessage('Nichts zu uploaden','info'); cb&&cb(true); return;} const payload={ players: locals.map(p=>({ name:p.name, reason:p.reason, category:p.category||'general', severity:p.severity||1 })) }; makeAPIRequest('/api/v1/players/batch','POST',payload,(err,res)=>{ if(err||!res||!res.success){ showApiSyncMessage('Upload Fehler: '+(err?err.message:'fail'),'warning'); cb&&cb(false); return; } locals.forEach(p=>p.uploaded=true); saveData(); showApiSyncMessage('Upload fertig','success'); cb&&cb(true); }); }

export function syncWithAPI(){ if(!settings.enableAPI) return; if(apiData.syncInProgress){ showApiSyncMessage('Sync läuft','info'); return;} apiData.syncInProgress=true; checkAPIStatus(ok=>{ if(!ok){ showApiSyncMessage('API offline','warning'); apiData.syncInProgress=false; return;} const finish=()=>{ apiData.lastSync=Date.now(); apiData.syncInProgress=false; showApiSyncMessage('Sync ok','success'); }; if(settings.downloadFromAPI){ downloadFromAPI(()=>{ if(settings.uploadToAPI) uploadToAPI(()=>finish()); else finish(); }); } else if(settings.uploadToAPI){ uploadToAPI(()=>finish()); } else finish(); }); }

export function getAPIStatusColor(){ return apiData.apiStatus==='connected'?'&a': apiData.apiStatus==='error'?'&c':'&7'; }

// Direct API add/remove used when API_ONLY
export function apiAddShitterDirect(username, reason){ if(!settings.enableAPI || !settings.apiUrl){ slWarn('API nicht konfiguriert'); return null;} if(!username) return null; const lower=username.toLowerCase(); if(apiPlayersCache.find(p=>p.name.toLowerCase()===lower)) return null; const temp={ id:'pending_'+Math.random().toString(36).substring(2,8), name:username, reason:reason||'Manual', category:'manual', severity:1, dateAdded:Date.now(), source:'api', pending:true }; apiPlayersCache.push(temp); runAsync('apiAdd',()=>{ makeAPIRequest('/api/v1/players/batch','POST',{ players:[{ name:username, reason:reason||'Manual', category:'manual', severity:1 }]},(err,res)=>{ if(err||!res||!res.success){ slWarn('Add Fehler: '+(err?err.message:'API')); temp.failed=true; return;} downloadFromAPI(()=>{}); }); }); return temp; }
export function apiRemoveShitterDirect(username){ if(!settings.enableAPI || !settings.apiUrl){ slWarn('API nicht konfiguriert'); return false;} const idx=apiPlayersCache.findIndex(p=>p.name.toLowerCase()===username.toLowerCase()); if(idx===-1) return false; const cached=apiPlayersCache.splice(idx,1)[0]; if(!cached.id){ return true; } runAsync('apiRemove',()=>{ makeAPIRequest(`/api/v1/players/${cached.id}`,'DELETE',null,(err,res)=>{ if(err||!res||!res.success){ slWarn('Remove Fehler – re-sync'); downloadFromAPI(()=>{}); } }); }); return true; }

// Re-bind placeholders in data module (if loaded earlier)
Object.assign(globalThis,{ apiData, makeAPIRequest, checkAPIStatus, downloadFromAPI, uploadToAPI, syncWithAPI, getAPIStatusColor, apiAddShitterDirect, apiRemoveShitterDirect });
