// events.js – SINGLE IMPLEMENTATION: chat filter, auto sync, cooldown cleanup, unload save
import { settings } from '../settings';
import { getActivePlayerList, loadData, saveData, shitterData } from './data';
import { syncWithAPI, apiData } from './api';
import { slInfo } from './core';
import { triggerManualUpdateCheck, startAutoUpdater } from '../updater';
import { attemptAutoKick } from './party';

function isShitter(name){ return getActivePlayerList().some(p=>p.name.toLowerCase()===name.toLowerCase()); }

// Chat filter for standard chat pattern
register('chat',(username,message,event)=>{ if(!settings.enabled || !settings.chatFilter) return; const clean=username.replace(/§[0-9a-fk-or]/g,''); if(isShitter(clean)){ cancel(event); if(settings.debugMode) ChatLib.chat(`&c[Shitterlist] &7Nachricht von ${clean} gefiltert`); } }).setCriteria('${username}: ${message}');

// Party/Dungeon join detection is handled exclusively in utils/party.js to avoid duplicates.

// Cooldown cleanup (warning cooldowns map)
let lastCooldownCleanup=0;
register('step',()=>{ const now=Date.now(); if(now-lastCooldownCleanup<60000) return; lastCooldownCleanup=now; if(!shitterData.warningCooldowns) shitterData.warningCooldowns={}; const cooldownMs=(settings.warningCooldown||60)*1000; const threshold=now-cooldownMs*3; let removed=0; Object.keys(shitterData.warningCooldowns).forEach(k=>{ if(shitterData.warningCooldowns[k]<threshold){ delete shitterData.warningCooldowns[k]; removed++; }}); if(removed>0 && settings.debugMode) slInfo(`Cooldown Cleanup: ${removed}`); }).setDelay(20);

// Auto sync scheduler
function startAutoSync(){ if(!settings.enableAPI || !settings.autoSync || !settings.syncInterval) return; const intervalMs=Math.max(1,settings.syncInterval)*60*1000; register('step',()=>{ if(!settings.enableAPI || !settings.autoSync) return; const now=Date.now(); if(now-apiData.lastSync>=intervalMs) syncWithAPI(); }).setDelay(60); }

// Initial load
loadData();
setTimeout(()=>{ if(settings.enableAPI && settings.autoSync) startAutoSync(); if(settings.checkUpdatesOnLoad) triggerManualUpdateCheck(); startAutoUpdater(); },3000);

// Save on unload
register('gameUnload',()=>{ saveData(); if(settings.debugMode) ChatLib.chat('&a[Shitterlist] &7Daten gespeichert'); });
