// party.js – SINGLE IMPLEMENTATION: party leader detection & auto kick warnings
import { settings } from './settings';
import { safeCommand } from './core';
import { getActivePlayerList } from './data';
import { displayTitleWarning, playCustomJoinSound } from './visual';

const autoKickSent={};
let partyLeader=null, partyInfoPending=false, partyInfoLastUpdate=0, partyInfoCallbacks=[];
let suppressPartyListOutput=false, partyListSuppressExpire=0;

function beginPartyListSuppression(ms=2000){ suppressPartyListOutput=true; partyListSuppressExpire=Date.now()+ms; }

export function ensurePartyLeader(cb){
  const now=Date.now();
  if(partyLeader && (now-partyInfoLastUpdate)<10000) return cb&&cb(partyLeader);
  partyInfoCallbacks.push(cb);
  if(partyInfoPending) return;
  partyInfoPending=true; beginPartyListSuppression(2000);
  if(settings.debugMode) ChatLib.chat('&7[DEBUG] /p list für Leader');
  safeCommand('p list');
  setTimeout(()=>{ if(partyInfoPending){ partyInfoPending=false; suppressPartyListOutput=false; if(settings.debugMode) ChatLib.chat('&7[DEBUG] Leader Timeout'); const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); } },1600);
}

export function attemptAutoKick(playerName, reason, joinType){
  if(!settings.autoPartyKick) return;
  const key=playerName.toLowerCase(); const now=Date.now();
  if(autoKickSent[key] && now-autoKickSent[key]<5000) return; // debounce
  ensurePartyLeader(leader=>{
    if(!leader) return;
    const me=Player.getName();
    if(leader.toLowerCase()!==me.toLowerCase()) return; // only if self leader
    autoKickSent[key]=now;
    safeCommand(`pc Kicking ${playerName} - Reason: ${reason||'Unknown'}`);
    safeCommand(`p kick ${playerName}`);
  });
}

function shouldShowWarning(){ return settings.showJoinWarnings; }

// /p list output parsing & suppression
register('chat',(rawLine,event)=>{
  if(suppressPartyListOutput && Date.now()>partyListSuppressExpire) suppressPartyListOutput=false;
  const line=rawLine.replace(/§./g,'').trim();
  const leaderMatch=line.match(/^Party (?:Leader|Owner):\s+(?:\[[^\]]+\]\s*)*([A-Za-z0-9_]{1,16})(?:\s|$)/);
  if(leaderMatch){ partyLeader=leaderMatch[1]; partyInfoLastUpdate=Date.now(); partyInfoPending=false; suppressPartyListOutput=false; const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(partyLeader)); }
  if(/^You are not in a party\./.test(line)){ partyLeader=null; partyInfoLastUpdate=Date.now(); partyInfoPending=false; suppressPartyListOutput=false; const cbs=partyInfoCallbacks.slice(); partyInfoCallbacks=[]; cbs.forEach(f=>f(null)); }
  if(suppressPartyListOutput){ if(/^(Party (?:Leader|Owner): |Party Moderators?: |Party Members?: |Party Finder Queue: |You are not in a party\.)/.test(line)){ cancel(event); } }
}).setCriteria('${rawLine}');

// Join warnings (party & dungeon)
register('chat',(msg)=>{
  if(!settings.enabled) return;
  let type=null, player=null;
  const partyJoin=msg.match(/^(?:Party > )?(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16}) joined the party\.$/);
  if(partyJoin && settings.partyWarnings){ type='party'; player=partyJoin[1]; }
  if(!type && msg.includes('joined the dungeon group!') && settings.dungeonWarnings){ const d=msg.match(/^(.+?) joined the dungeon group!/); if(d){ player=d[1].replace(/^Party Finder > /,'').trim(); type='dungeon'; } }
  if(!player) return;
  if(player.toLowerCase()===Player.getName().toLowerCase()) return;
  const list=getActivePlayerList();
  const info=list.find(p=>p.name.toLowerCase()===player.toLowerCase());
  if(!info) return;
  attemptAutoKick(player, info.reason, type);
  if(shouldShowWarning()){
    ChatLib.chat(`&c[Shitterlist] &f${player} &7(${info.reason})`);
    displayTitleWarning(player, info.reason);
    playCustomJoinSound();
  }
}).setCriteria('${msg}');

Object.assign(globalThis,{ ensurePartyLeader, attemptAutoKick });
