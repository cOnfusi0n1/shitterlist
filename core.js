// core.js – CLEAN SINGLE IMPLEMENTATION
// Provides: logging, async helper, rate-limited command queue, utilities, constants
import { settings } from './settings';

// ========= Logging =========
function ts(){ return settings.showTimestamps ? `&7[${new Date().toLocaleTimeString()}] ` : ''; }
function prefix(){ return settings.showPrefix ? '&c[Shitterlist] ' : ''; }
function normalizeUmlauts(t){ if(!t) return t; return t.replace(/Ã¼/g,'ü').replace(/Ãœ/g,'Ü').replace(/Ã¶/g,'ö').replace(/Ã–/g,'Ö').replace(/Ã¤/g,'ä').replace(/Ã„/g,'Ä').replace(/ÃŸ/g,'ß'); }
export function formatMessage(msg,type='info'){ let c='&f'; if(type==='warning') c='&c'; else if(type==='success') c='&a'; else if(type==='info') c='&b'; return ts()+prefix()+c+normalizeUmlauts(msg); }
export function slLog(channel,msg,level='info'){ const enabled={general:()=>settings.showGeneralMessages,warning:()=>settings.showWarningMessages,api:()=>settings.showApiSyncMessages,debug:()=>settings.debugMode}; if(!(enabled[channel]||enabled.general)()) return; ChatLib.chat(formatMessage(msg,level)); }
export const slInfo   = m=>slLog('general',m,'info');
export const slSuccess= m=>slLog('general',m,'success');
export const slWarn   = m=>slLog('warning',m,'warning');
export const showApiSyncMessage=(m,t='info')=>slLog('api',m,t);

// ========= Async (Java Thread wrapper) =========
let __asyncInit=false, __Thread, __Runnable; export function runAsync(label,fn){ try{ if(!__asyncInit){ __Thread=Java.type('java.lang.Thread'); __Runnable=Java.type('java.lang.Runnable'); __asyncInit=true; } new __Thread(new __Runnable({ run(){ try{ fn(); }catch(e){ if(settings.debugMode) slWarn(`[Async ${label}] ${e}`); } } })).start(); }catch(e){ try{ fn(); }catch(_){} } }

// ========= Rate‑limited Command Queue =========
const COMMAND_DELAY_MS = 650; const __queue=[]; let __last=0; export function safeCommand(cmd){ if(!cmd) return; __queue.push(cmd); }
register('tick',()=>{ if(!__queue.length) return; const now=Date.now(); if(now-__last<COMMAND_DELAY_MS) return; const next=__queue.shift(); if(settings.debugMode) ChatLib.chat(`&8[CMD] /${next}`); try{ ChatLib.command(next,true);}catch(e){ if(settings.debugMode) slWarn('Cmd Fehler: '+e.message); } __last=now; });

// ========= Constants =========
// Permanent API_ONLY Modus (lokale Liste wird nicht persistiert bei aktivierter API-only Strategie)
export const API_ONLY = true; // adjust here if future toggle desired

// ========= Utilities =========
export function cleanPlayerName(name){ if(!name) return ''; let cleaned=name.replace(/§[0-9a-fk-or]/g,'').trim(); cleaned=cleaned.replace(/^\[[^\]]+\]\s*/,''); cleaned=cleaned.replace(/\s+[^\w].*$/,''); cleaned=cleaned.replace(/\s*\([^)]*\).*$/,''); cleaned=cleaned.replace(/[^\w\d_-]+.*$/,''); return cleaned.trim(); }

// Expose for legacy compatibility (Rhino may not define globalThis)
const __g = (typeof globalThis!=='undefined') ? globalThis : (typeof global!=='undefined' ? global : this);
try { Object.assign(__g,{ slLog, slInfo, slWarn, slSuccess, showApiSyncMessage, formatMessage, runAsync, safeCommand, API_ONLY, cleanPlayerName }); } catch(_) {}
