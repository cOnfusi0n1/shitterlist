// updater.js – SINGLE IMPLEMENTATION
import { settings } from './settings';
import { slInfo, slWarn, slSuccess, slLog, runAsync, formatMessage } from './core';

const BASE='https://raw.githubusercontent.com/cOnfusi0n1/Shitterlist/main';
const REM_INDEX='/index.js';
const REM_META='/metadata.json';
const LOC_INDEX='index.js';
const LOC_META='metadata.json';
let state={ lastCheck:0, checking:false };

function fetchTxt(url,cb){ runAsync('updFetch',()=>{ try{ const URL=Java.type('java.net.URL'); const BufferedReader=Java.type('java.io.BufferedReader'); const InputStreamReader=Java.type('java.io.InputStreamReader'); const StandardCharsets=Java.type('java.nio.charset.StandardCharsets'); const sb=new (Java.type('java.lang.StringBuilder'))(); const con=new URL(url).openConnection(); con.setRequestMethod('GET'); con.setRequestProperty('User-Agent','Shitterlist-Updater'); const rc=con.getResponseCode(); const rd=new BufferedReader(new InputStreamReader(rc>=200&&rc<300?con.getInputStream():con.getErrorStream(),StandardCharsets.UTF_8)); let line; while((line=rd.readLine())!==null) sb.append(line).append('\n'); rd.close(); if(rc>=200&&rc<300) cb&&cb(null,sb.toString()); else cb&&cb(new Error('HTTP '+rc),null); }catch(e){ cb&&cb(e,null);} }); }
function cmp(a,b){ const pa=(a||'').split('.').map(n=>+n||0), pb=(b||'').split('.').map(n=>+n||0); for(let i=0;i<Math.max(pa.length,pb.length);i++){ if((pa[i]||0)>(pb[i]||0)) return 1; if((pa[i]||0)<(pb[i]||0)) return -1; } return 0; }

export function checkForUpdate(cb){ if(state.checking){ cb&&cb(false); return;} state.checking=true; fetchTxt(BASE+REM_INDEX,(eIdx,idx)=>{ if(eIdx||!idx){ state.checking=false; slWarn('Update Check fehlgeschlagen'); cb&&cb(false); return;} fetchTxt(BASE+REM_META,(eMeta,meta)=>{ state.checking=false; state.lastCheck=Date.now(); let remoteV='', localV=''; try{ remoteV=JSON.parse(meta).version||'';}catch(_){} try{ localV=JSON.parse(FileLib.read('Shitterlist',LOC_META)||'{}').version||'';}catch(_){} const fileDiff=(FileLib.read('Shitterlist',LOC_INDEX)||'')!==idx; const verDiff=remoteV && cmp(remoteV,localV)>0; const has=verDiff || (fileDiff && settings.debugMode); cb&&cb(has, idx, meta, localV, remoteV); }); }); }

export function performSelfUpdate(force=false, cb){ checkForUpdate((has, idx, meta, localV, remoteV)=>{ if(!force && !has){ slInfo(`Kein Update (${localV||'?'})`); cb&&cb(false); return;} if(!idx){ slWarn('Remote index fehlt'); cb&&cb(false); return;} try{ const cur=FileLib.read('Shitterlist',LOC_INDEX)||''; if(force||cur!==idx) FileLib.write('Shitterlist',LOC_INDEX,idx); if(meta){ const curM=FileLib.read('Shitterlist',LOC_META)||''; if(force||curM!==meta) FileLib.write('Shitterlist',LOC_META,meta); } slSuccess(`Update installiert ${localV||'?'} -> ${remoteV||'?'} (reload...)`); setTimeout(()=>ChatLib.command('ct load',true),750); cb&&cb(true); }catch(e){ slWarn('Update Fehler: '+e.message); cb&&cb(false);} }); }

export function triggerManualUpdateCheck(){ slInfo('Prüfe auf Updates...'); checkForUpdate(has=>{ if(has){ slLog('general','Update verfügbar: /sl update-now','info'); } else slInfo('Aktuell'); }); }

export function startAutoUpdater(){ if(!settings.autoUpdaterEnabled) return; if(startAutoUpdater._reg) return; const mins=Math.max(1, settings.updateCheckInterval||5); startAutoUpdater._reg=register('step',()=>{ const now=Date.now(); if(now-state.lastCheck < mins*60*1000) return; if(state.checking) return; checkForUpdate(has=>{ if(has && settings.autoInstallUpdates) performSelfUpdate(true); }); }).setDelay(60); if(settings.debugMode) ChatLib.chat(formatMessage(`AutoUpdater aktiv – Intervall ${mins}m`, 'info')); }

Object.assign(globalThis,{ performSelfUpdate, triggerManualUpdateCheck, startAutoUpdater, checkForUpdate });
