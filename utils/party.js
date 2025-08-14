// party.js – SINGLE IMPLEMENTATION: party leader detection & auto kick warnings
import { settings } from '../settings';
import { safeCommand, sendCommandNow } from './core';
import { getActivePlayerList, isShitter as dataIsShitter } from './data';
import { sendWebhook, code } from './api';
import { displayTitleWarning, playCustomJoinSound } from './visual';

const autoKickSent={};
let partyActive = true; // track if we're currently in a party
const recentlyRemoved = {}; // track members removed to avoid double kicks
const detectedRecently={};
// Store timestamps for in-flight operations; auto-purged on a timer
const kickInFlight = {}; // key -> timestamp
let partyLeader=null, partyInfoPending=false, partyInfoLastUpdate=0, partyInfoCallbacks=[];
let suppressPartyListOutput=false, partyListSuppressExpire=0;

function beginPartyListSuppression(ms=2500){ suppressPartyListOutput=true; partyListSuppressExpire=Date.now()+ms; }

function setPartyLeader(name){ partyLeader=name||null; partyInfoLastUpdate=Date.now(); }

function clearTransientPartyCaches(){
  // Reset all transient state so future detections can run again cleanly
  for (const m of [autoKickSent, recentlyRemoved, detectedRecently, kickInFlight]) {
    for (const k of Object.keys(m)) delete m[k];
  }
}

export function ensurePartyLeader(cb){
  const now=Date.now();
  if(partyLeader && (now-partyInfoLastUpdate)<10000) return cb&&cb(partyLeader);
  partyInfoCallbacks.push(cb);
  if(partyInfoPending) return;
  partyInfoPending=true; beginPartyListSuppression(7000);
  if(settings.debugMode) ChatLib.chat('&7[DEBUG] /p list für Leader');
  const attempts=[0,750,1500,2250,3000,3750,4500,5250];
  attempts.forEach((delay,i)=>{
    setTimeout(()=>{ if(!partyInfoPending) return; if(settings.debugMode) ChatLib.chat(`&7[DEBUG] /p list try #${i+1}`); sendCommandNow('p list'); }, delay);
  });
  setTimeout(()=>{ if(partyInfoPending){ partyInfoPending=false; suppressPartyListOutput=false; if(settings.debugMode) ChatLib.chat('&7[DEBUG] Leader Timeout – finalizing'); const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); } }, attempts[attempts.length-1]+700);
}

// Single-shot leader resolve: send one /p list and return the current leader shortly after
function resolveLeaderOnce(cb){
  const now=Date.now();
  if(partyLeader && (now-partyInfoLastUpdate)<10000){ cb&&cb(partyLeader); return; }
  // Use the same callback mechanism as ensurePartyLeader but with a single /p list fire
  partyInfoCallbacks.push(cb);
  if(partyInfoPending) return; // already resolving elsewhere
  partyInfoPending=true; beginPartyListSuppression(3000);
  if(settings.debugMode) ChatLib.chat('&7[DEBUG] /p list (single)');
  sendCommandNow('p list');
  // Fallback finalize after ~3s in case no leader line arrives
  setTimeout(()=>{
    if(partyInfoPending){
      partyInfoPending=false; suppressPartyListOutput=false;
      const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader));
    }
  }, 3000);
}

export function attemptAutoKick(playerName, reason, joinType){
  if(!settings.autoPartyKick) return;
  const key=playerName.toLowerCase(); const now=Date.now();
  if(!partyActive) return; // don't attempt if not in a party
  if(recentlyRemoved[key] && now-recentlyRemoved[key] < 1000) return; // tiny guard to avoid duplicate same-event kicks
  if(kickInFlight[key]) return; // prevent duplicate flows
  const me=Player.getName(); const meL=me.toLowerCase();
  // If we already know we're not leader, stop immediately
  if(partyLeader && partyLeader.toLowerCase()!==meL) return;
  kickInFlight[key]=Date.now();
  const finalize=()=>{ try{ delete kickInFlight[key]; }catch(_){} };
  resolveLeaderOnce(leader=>{
    if(!partyActive){ finalize(); return; }
    if(!leader || leader.toLowerCase()!==meL){ finalize(); return; }
    // Let the leader line settle, then send message, then kick
    setTimeout(()=>{
      if(!partyActive || recentlyRemoved[key]){ finalize(); return; }
      safeCommand(`pc Kicking ${playerName} - Reason: ${reason||'Unknown'}`);
  setTimeout(()=>{ if(partyActive && !recentlyRemoved[key]) safeCommand(`p kick ${playerName}`); finalize(); }, 1100);
    }, 500);
  });
}

function shouldShowWarning(){ return settings.showJoinWarnings; }

function processDetection(player, type){
  const key=player.toLowerCase();
  const now=Date.now();
  if(detectedRecently[key] && now-detectedRecently[key]<800) return; // short debounce for duplicate same-event lines
  detectedRecently[key]=now;
  const list=getActivePlayerList();
  const info=list.find(p=>p.name.toLowerCase()===player.toLowerCase()) || { reason: 'Unknown' };
  attemptAutoKick(player, info.reason, type);
  const showChat = shouldShowWarning();
  if(showChat){
    ChatLib.chat(`&c[Shitterlist] &f${player} &7(${info.reason})`);
    displayTitleWarning(player, info.reason);
    playCustomJoinSound();
  } else if (type==='dungeon' && settings.showTitleWarning) {
    // Ensure dungeon joins still show a title even if chat join warnings are disabled
    displayTitleWarning(player, info.reason);
  }
  try{
    if(settings.enableWebhook && settings.webhookSendDetections){
      const kind = type==='dungeon' ? 'Dungeon' : 'Party';
      sendWebhook(`🚨 ${kind} Detection: ${code(player)} (${code(info.reason||'Unknown')})`);
    }
  }catch(_){}
}

// /p list output parsing & suppression
register('chat',(rawLine,event)=>{
  if(suppressPartyListOutput && Date.now()>partyListSuppressExpire) suppressPartyListOutput=false;
  const line=rawLine.replace(/§./g,'').trim();
  // Recognize direct listings (from /p list)
  const leaderMatch=line.match(/^Party (?:Leader|Owner):\s+(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16})\b/);
  if(leaderMatch){ partyActive=true; setPartyLeader(leaderMatch[1]); partyInfoPending=false; suppressPartyListOutput=false; const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); }
  // Recognize messages making you leader
  if(/^You are now the party leader\.?$/i.test(line) || /^Du bist jetzt der Partyleiter\.?$/i.test(line)){ setPartyLeader(Player.getName()); }
  // Recognize transfer/promote messages: "promoted X to Party Leader" or "transferred the leadership to X"
  const promote=line.match(/promoted\s+(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16})\s+to\s+(?:Party\s+)?(?:Leader|Owner)\.?$/i);
  if(promote){ setPartyLeader(promote[1]); }
  const transfer=line.match(/transferred\s+the\s+leadership\s+to\s+(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16})\.?$/i);
  if(transfer){ setPartyLeader(transfer[1]); }
  if(/^You are not in a party\./.test(line) || /^Du bist nicht in einer Party\./i.test(line) || /^You left the party\./i.test(line)){
    partyActive=false;
    partyLeader=null; partyInfoLastUpdate=Date.now(); partyInfoPending=false; suppressPartyListOutput=false;
    clearTransientPartyCaches();
    const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(null));
  }
  if(/has been removed from the party\.?$/.test(line)){
    // mark last mentioned or parsed name as removed if we can parse it
    const rm=line.match(/^(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16}) has been removed from the party/);
    if(rm){ recentlyRemoved[rm[1].toLowerCase()] = Date.now(); }
  }
  if(/^The party was disbanded/.test(line) || /^Die (?:Party|Gruppe) wurde aufgelöst/i.test(line)){
    partyActive=false; clearTransientPartyCaches();
  }
  if(/^You have joined \[.*?\] .*?'s party\.?$/.test(line) || /^You have created a party\.?$/.test(line)){
    partyActive=true;
  }
  if(/^(Party Moderators?: |Party Members?: )/.test(line)){
    partyActive=true;
  }
  if(suppressPartyListOutput){ if(/^(Party (?:Leader|Owner): |Party Moderators?: |Party Members?: |Party Finder Queue: |You are not in a party\.)/.test(line)){ cancel(event); } }
}).setCriteria('${rawLine}');

// Join warnings (party & dungeon)
register('chat',(msg)=>{
  if(!settings.enabled) return;
  let type=null, player=null;
  // Normalize color codes
  const plain = msg.replace(/§[0-9a-fk-or]/g,'');
  // Match various party join formats (with rank, no rank, Party > prefix)
  const partyJoin=plain.match(/^(?:Party > )?(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16}) (?:has )?joined the party[.!]$/);
  if(partyJoin && settings.partyWarnings){ type='party'; player=partyJoin[1]; }
  if(!type && plain.toLowerCase().includes('joined the dungeon group') && settings.dungeonWarnings){
    const d=plain.match(/^(?:Party Finder > )?(?:\[[^\]]+\]\s*)?(.+?) (?:has )?joined the dungeon group!$/);
    if(d){ player=d[1].trim(); type='dungeon'; }
  }
  if(type){
    partyActive=true;
    // Player rejoined: clear stale flags so we can kick immediately again
    try{
      const k = player.toLowerCase();
      delete recentlyRemoved[k];
      delete detectedRecently[k];
      delete autoKickSent[k];
      delete kickInFlight[k];
    }catch(_){ }
  }
  if(!player) return;
  if(player.toLowerCase()===Player.getName().toLowerCase()) return;
  // Trigger cache load if needed in API_ONLY mode via data.isShitter side-effect
  const isShit = dataIsShitter(player);
  if(isShit){
    processDetection(player, type);
  } else if (settings.enableAPI) {
    // Re-check shortly after in case API cache had to be fetched lazily
    setTimeout(()=>{ if(dataIsShitter(player)) processDetection(player, type); }, 1500);
  }
}).setCriteria('${msg}');

const __g_party=(typeof globalThis!=='undefined')?globalThis:(typeof global!=='undefined'?global:this);
try { Object.assign(__g_party,{ ensurePartyLeader, attemptAutoKick }); } catch(_) {}

// Periodic cleanup to expire transient flags so repeated detections can trigger reliably
register('step', () => {
  const now = Date.now();
  const purge = (map, ttl) => {
    for (const k of Object.keys(map)) {
      const v = map[k];
      if (typeof v === 'number') {
        if (now - v > ttl) delete map[k];
      }
    }
  };
  purge(autoKickSent, 30000);
  purge(recentlyRemoved, 15000);
  purge(detectedRecently, 10000);
  purge(kickInFlight, 10000);
}).setFps(1);
