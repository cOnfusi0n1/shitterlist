// core.js – CLEAN SINGLE IMPLEMENTATION
// Provides: logging, async helper, rate-limited command queue, utilities, constants
import { settings } from '../settings';

// ========= Logging =========
function ts(){ return settings.showTimestamps ? `&7[${new Date().toLocaleTimeString()}] ` : ''; }

// Preset-Paletten
const THEME_PRESETS = [
    { name: 'Default',     palette: { bracket:'&6', brand:'&d', sep:'&7', info:'&b', success:'&a', warning:'&c', header:'&9', accent:'&e', dim:'&7' } },
    { name: 'Ocean',       palette: { bracket:'&3', brand:'&b', sep:'&7', info:'&b', success:'&a', warning:'&c', header:'&9', accent:'&3', dim:'&8' } },
    { name: 'Lime',        palette: { bracket:'&a', brand:'&a', sep:'&7', info:'&a', success:'&a', warning:'&c', header:'&2', accent:'&a', dim:'&8' } },
    { name: 'Gold',        palette: { bracket:'&6', brand:'&6', sep:'&7', info:'&e', success:'&a', warning:'&c', header:'&6', accent:'&e', dim:'&8' } },
    { name: 'Sunset',      palette: { bracket:'&6', brand:'&c', sep:'&7', info:'&d', success:'&a', warning:'&c', header:'&5', accent:'&6', dim:'&8' } },
    { name: 'Dracula',     palette: { bracket:'&8', brand:'&5', sep:'&8', info:'&d', success:'&a', warning:'&c', header:'&5', accent:'&d', dim:'&8' } },
    { name: 'CottonCandy', palette: { bracket:'&d', brand:'&b', sep:'&7', info:'&b', success:'&a', warning:'&c', header:'&d', accent:'&b', dim:'&8' } },
    { name: 'Monochrome',  palette: { bracket:'&8', brand:'&7', sep:'&8', info:'&7', success:'&7', warning:'&7', header:'&8', accent:'&7', dim:'&8' } },
    { name: 'Custom',      palette: null }
];

function customPalette(){
    return {
        bracket: settings.themeBracketColor || '&6',
        brand:   settings.themeBrandColor   || '&d',
        sep:     settings.themeSepColor     || '&7',
        info:    settings.themeInfoColor    || '&b',
        success: settings.themeSuccessColor || '&a',
        warning: settings.themeWarningColor || '&c',
        header:  settings.themeHeaderColor  || '&9',
        accent:  settings.themeAccentColor  || '&e',
        dim:     settings.themeDimColor     || '&7'
    };
}

function currentPalette(){
    const idx = (settings.themePreset | 0);
    const last = THEME_PRESETS.length - 1; // Custom ist letzter Index
    if (idx >= 0 && idx < last) return THEME_PRESETS[idx].palette;
    return customPalette();
}

// Centralized theme/palette (dynamisch)
export const THEME = new Proxy({}, {
    get(_t, prop){
        const p = currentPalette();
        return p[prop] || '&f';
    }
});

// Build the colored prefix
export function slPrefix(){
    if(!settings.showPrefix) return '';
    return `${THEME.bracket}[${THEME.brand}Shitterlist${THEME.bracket}] `;
}

function normalizeUmlauts(t){ if(!t) return t; return t.replace(/Ã¼/g,'ü').replace(/Ãœ/g,'Ü').replace(/Ã¶/g,'ö').replace(/Ã–/g,'Ö').replace(/Ã¤/g,'ä').replace(/Ã„/g,'Ä').replace(/ÃŸ/g,'ß'); }
export function formatMessage(msg,type='info'){
    const col = THEME[type] || '&f';
    return ts()+slPrefix()+col+normalizeUmlauts(msg);
}
// Quick helper to emit a plain prefixed string (useful when composing Message objects)
export function withPrefix(text, type='info'){ return formatMessage(text, type); }
export function slLog(channel,msg,level='info'){ const enabled={general:()=>settings.showGeneralMessages,warning:()=>settings.showWarningMessages,api:()=>settings.showApiSyncMessages,debug:()=>settings.debugMode}; if(!(enabled[channel]||enabled.general)()) return; ChatLib.chat(formatMessage(msg,level)); }
export const slInfo   = m=>slLog('general',m,'info');
export const slSuccess= m=>slLog('general',m,'success');
export const slWarn   = m=>slLog('warning',m,'warning');
export const showApiSyncMessage=(m,t='info')=>slLog('api',m,t);

// Shared texts
export const ALLOWED_FLOORS_HELP = 'Erlaubte Floors: &eF1 F2 F3 F4 F5 F6 F7 &7oder &eM1 M2 M3 M4 M5 M6 M7';

// ========= Async (Java Thread wrapper) =========
let __asyncInit=false, __Thread, __Runnable; export function runAsync(label,fn){ try{ if(!__asyncInit){ __Thread=Java.type('java.lang.Thread'); __Runnable=Java.type('java.lang.Runnable'); __asyncInit=true; } new __Thread(new __Runnable({ run(){ try{ fn(); }catch(e){ if(settings.debugMode) slWarn(`[Async ${label}] ${e}`); } } })).start(); }catch(e){ try{ fn(); }catch(_){} } }

// ========= Rate‑limited Command Queue =========
const COMMAND_DELAY_MS = 1200; // higher to satisfy server cooldowns and avoid 'slow down'
const __queue=[]; let __last=0;
export function safeCommand(cmd){ if(!cmd) return; __queue.push(cmd); }
// Send a command immediately (bypasses queue) – use sparingly
export function sendCommandNow(cmd){
	if(!cmd) return;
	try{
		if(settings.debugMode) ChatLib.chat(`&8[CMD:NOW] /${cmd}`);
		// Primary path
		ChatLib.say('/'+cmd);
	// Bump queue timer so subsequent queued commands respect spacing
	try{ __last = Date.now(); }catch(_){}
	}catch(e){
	try{ ChatLib.command(cmd,true); try{ __last = Date.now(); }catch(_){} }catch(e2){ if(settings.debugMode) slWarn('CmdNow Fehler (fallback): '+e2.message); }
		if(settings.debugMode) slWarn('CmdNow Fehler: '+e.message);
	}
}
register('tick',()=>{
	if(!__queue.length) return;
	const now=Date.now();
	if(now-__last<COMMAND_DELAY_MS) return;
	const next=__queue.shift();
	if(settings.debugMode) ChatLib.chat(`&8[CMD] /${next}`);
		try{
			// Primary path: send to server as raw chat message with leading slash
			ChatLib.say('/'+next);
		}catch(e){
			// Fallback path: attempt ChatLib.command if say failed
			try{ ChatLib.command(next,true); }catch(e2){ if(settings.debugMode) slWarn('Cmd Fehler (fallback): '+e2.message); }
			if(settings.debugMode) slWarn('Cmd Fehler: '+e.message);
		}
	__last=now;
});

// ========= Constants =========
// Permanent API_ONLY Modus (lokale Liste wird nicht persistiert bei aktivierter API-only Strategie)
export const API_ONLY = true; // adjust here if future toggle desired

// ========= Utilities =========
export function cleanPlayerName(name){ if(!name) return ''; let cleaned=name.replace(/§[0-9a-fk-or]/g,'').trim(); cleaned=cleaned.replace(/^\[[^\]]+\]\s*/,''); cleaned=cleaned.replace(/\s+[^\w].*$/,''); cleaned=cleaned.replace(/\s*\([^)]*\).*$/,''); cleaned=cleaned.replace(/[^\w\d_-]+.*$/,''); return cleaned.trim(); }

// Expose for legacy compatibility (Rhino may not define globalThis)
const __g = (typeof globalThis!=='undefined') ? globalThis : (typeof global!=='undefined' ? global : this);
try { Object.assign(__g,{ slLog, slInfo, slWarn, slSuccess, showApiSyncMessage, formatMessage, runAsync, safeCommand, API_ONLY, cleanPlayerName }); } catch(_) {}
