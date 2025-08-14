// party.js – SINGLE IMPLEMENTATION: party leader detection & auto kick warnings
import { settings } from '../settings';
import { safeCommand } from './core';
import { getActivePlayerList, isShitter as dataIsShitter } from './data';
import { sendWebhook, code } from './api';
import { displayTitleWarning, playCustomJoinSound } from './visual';

const autoKickSent={};
const detectedRecently={};
let partyLeader=null, partyInfoPending=false, partyInfoLastUpdate=0, partyInfoCallbacks=[];
let suppressPartyListOutput=false, partyListSuppressExpire=0;

function beginPartyListSuppression(ms=2000){ suppressPartyListOutput=true; partyListSuppressExpire=Date.now()+ms; }

function setPartyLeader(name){ partyLeader=name||null; partyInfoLastUpdate=Date.now(); }

export function ensurePartyLeader(cb){
  const now=Date.now();
  if(partyLeader && (now-partyInfoLastUpdate)<10000) return cb&&cb(partyLeader);
  partyInfoCallbacks.push(cb);
  if(partyInfoPending) return;
  partyInfoPending=true; beginPartyListSuppression(7000);
  if(settings.debugMode) ChatLib.chat('&7[DEBUG] /p list für Leader');
  const attempts=[0,800,1600,2400,3200,4000,4800,5600];
  attempts.forEach((delay,i)=>{
    setTimeout(()=>{ if(!partyInfoPending) return; if(settings.debugMode) ChatLib.chat(`&7[DEBUG] /p list try #${i+1}`); safeCommand('p list'); }, delay);
  });
  setTimeout(()=>{ if(partyInfoPending){ partyInfoPending=false; suppressPartyListOutput=false; if(settings.debugMode) ChatLib.chat('&7[DEBUG] Leader Timeout – finalizing'); const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); } }, attempts[attempts.length-1]+600);
}

export function attemptAutoKick(playerName, reason, joinType){
  if(!settings.autoPartyKick) return;
  const key=playerName.toLowerCase(); const now=Date.now();
  if(autoKickSent[key] && now-autoKickSent[key]<5000) return; // debounce
  ensurePartyLeader(leader=>{
    const me=Player.getName();
    if(!leader){
      // Not yet known: re-ensure and execute after resolve
      if(settings.debugMode) ChatLib.chat('&7[DEBUG] Leader unbekannt – erneuter Resolve');
      return ensurePartyLeader(l2=>{ if(l2 && l2.toLowerCase()===me.toLowerCase()){ autoKickSent[key]=Date.now(); safeCommand(`pc Kicking ${playerName} - Reason: ${reason||'Unknown'}`); safeCommand(`p kick ${playerName}`);} });
    }
    if(leader.toLowerCase()!==me.toLowerCase()) return; // only if self leader
    autoKickSent[key]=now;
    safeCommand(`pc Kicking ${playerName} - Reason: ${reason||'Unknown'}`);
    safeCommand(`p kick ${playerName}`);
  });
}

function shouldShowWarning(){ return settings.showJoinWarnings; }

function processDetection(player, type){
  const key=player.toLowerCase();
  const now=Date.now();
  if(detectedRecently[key] && now-detectedRecently[key]<4000) return; // debounce
  detectedRecently[key]=now;
  const list=getActivePlayerList();
  const info=list.find(p=>p.name.toLowerCase()===player.toLowerCase()) || { reason: 'Unknown' };
  attemptAutoKick(player, info.reason, type);
  if(shouldShowWarning()){
    ChatLib.chat(`&c[Shitterlist] &f${player} &7(${info.reason})`);
    displayTitleWarning(player, info.reason);
    playCustomJoinSound();
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
  if(leaderMatch){ setPartyLeader(leaderMatch[1]); partyInfoPending=false; suppressPartyListOutput=false; const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); }
  // Recognize messages making you leader
  if(/^You are now the party leader\.?$/i.test(line) || /^Du bist jetzt der Partyleiter\.?$/i.test(line)){ setPartyLeader(Player.getName()); }
  // Recognize transfer/promote messages: "promoted X to Party Leader" or "transferred the leadership to X"
  const promote=line.match(/promoted\s+(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16})\s+to\s+(?:Party\s+)?(?:Leader|Owner)\.?$/i);
  if(promote){ setPartyLeader(promote[1]); }
  const transfer=line.match(/transferred\s+the\s+leadership\s+to\s+(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16})\.?$/i);
  if(transfer){ setPartyLeader(transfer[1]); }
  if(/^You are not in a party\./.test(line)){ partyLeader=null; partyInfoLastUpdate=Date.now(); partyInfoPending=false; suppressPartyListOutput=false; const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(null)); }
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
