// updater.js – SINGLE IMPLEMENTATION (Full multi-file updater)
import { settings } from './settings';
import { slInfo, slWarn, slSuccess, slLog, runAsync, formatMessage } from './utils/core';

const BASE='https://raw.githubusercontent.com/cOnfusi0n1/Shitterlist/main';
// List of repo files to keep in sync (root of module folder)
const FILES=[
	'index.js','core.js','data.js','api.js','updater.js','visual.js','party.js','maintenance.js','commands.js','events.js','settings.js','metadata.json'
];
const META_FILE='metadata.json';
let state={ lastCheck:0, checking:false };

function fetchTxt(url,cb){ runAsync('updFetch',()=>{ try{ const URL=Java.type('java.net.URL'); const BufferedReader=Java.type('java.io.BufferedReader'); const InputStreamReader=Java.type('java.io.InputStreamReader'); const StandardCharsets=Java.type('java.nio.charset.StandardCharsets'); const sb=new (Java.type('java.lang.StringBuilder'))(); const con=new URL(url).openConnection(); con.setRequestMethod('GET'); con.setRequestProperty('User-Agent','Shitterlist-Updater'); con.setRequestProperty('Accept','text/plain'); const rc=con.getResponseCode(); const rd=new BufferedReader(new InputStreamReader(rc>=200&&rc<300?con.getInputStream():con.getErrorStream(),StandardCharsets.UTF_8)); let line; while((line=rd.readLine())!==null) sb.append(line).append('\n'); rd.close(); if(rc>=200&&rc<300) cb&&cb(null,sb.toString()); else cb&&cb(new Error('HTTP '+rc),null); }catch(e){ cb&&cb(e,null);} }); }

// Alternate remote locations for certain files (handles repo structure changes)
const FILE_ALIASES={
	'settings.js': ['Shitterlist/settings.js']
};

function fetchWithAliases(name, cb){
	const primary = `${BASE}/${name}`;
	fetchTxt(primary,(e,txt)=>{
		if(!e && txt){ cb(null, txt, name); return; }
		const aliases = FILE_ALIASES[name]||[];
		if(!aliases.length){ cb(e||new Error('not found'), null, name); return; }
		let i=0;
		const tryNext=()=>{
			if(i>=aliases.length){ cb(e||new Error('not found'), null, name); return; }
			const url = `${BASE}/${aliases[i++]}`;
			fetchTxt(url,(e2,txt2)=>{ if(!e2 && txt2){ if(settings.debugMode) slInfo(`Updater: nutze Alias für ${name}`); cb(null, txt2, name); } else tryNext(); });
		};
		tryNext();
	});
}
function cmp(a,b){ const pa=(a||'').split('.').map(n=>+n||0), pb=(b||'').split('.').map(n=>+n||0); for(let i=0;i<Math.max(pa.length,pb.length);i++){ if((pa[i]||0)>(pb[i]||0)) return 1; if((pa[i]||0)<(pb[i]||0)) return -1; } return 0; }

function readLocalMetaVersion(){ try{ return JSON.parse(FileLib.read('Shitterlist',META_FILE)||'{}').version||''; }catch(_){ return ''; } }
function readRemoteMetaVersion(meta){ try{ return JSON.parse(meta||'{}').version||''; }catch(_){ return ''; } }

export function checkForUpdate(cb){
	if(state.checking){ cb&&cb(false); return; }
	state.checking=true;
	fetchTxt(`${BASE}/${META_FILE}`,(eMeta, metaContent)=>{
		if(eMeta||!metaContent){ state.checking=false; slWarn('Update Check fehlgeschlagen (metadata)'); cb&&cb(false); return; }
		const remoteV=readRemoteMetaVersion(metaContent);
		const localV=readLocalMetaVersion();
		const has = remoteV && (!localV || cmp(remoteV, localV)>0);
		state.checking=false; state.lastCheck=Date.now();
		cb&&cb(has, metaContent, localV, remoteV);
	});
}

function fetchAllFiles(list, cb){
	const results={};
	let remaining=list.length, failed=false;
	list.forEach(f=>{
		fetchWithAliases(f,(err,content)=>{
			if(err||!content){ if(settings.debugMode) slWarn('Fetch Fehler: '+f); results[f]=null; }
			else {
				// Sanitize settings.js for ChatTriggers compatibility
				if(f==='settings.js'){
					try{
						content=content.replace(/import\s*\{\s*@Vigilant/g,'import { Vigilant')
													 .replace(/,\s*@SwitchProperty/g,', SwitchProperty')
													 .replace(/,\s*@SliderProperty/g,', SliderProperty')
													 .replace(/,\s*@TextProperty/g,', TextProperty')
													 .replace(/,\s*@ButtonProperty/g,', ButtonProperty')
													 .replace(/,\s*@CheckboxProperty/g,', CheckboxProperty')
													 .replace(/\/\/\/\s*<reference[^\n]*\n?/g,'');
					}catch(_){}
				}
				results[f]=content;
			}
			if(--remaining===0 && !failed) cb(results);
		});
	});
}

export function performSelfUpdate(force=false, cb){
	checkForUpdate((has, remoteMetaContent, localV, remoteV)=>{
		if(!force && !has){ slInfo(`Kein Update (${localV||'?'})`); cb&&cb(false); return; }
		slInfo(`Starte Update auf Version ${remoteV||'?'} - lade Dateien...`);
		fetchAllFiles(FILES,(filesMap)=>{
			let written=0, changed=0;
			try {
				FILES.forEach(name=>{
					const remote=filesMap[name]; if(!remote){ if(settings.debugMode) slWarn('Überspringe fehlende Datei: '+name); return; }
					const local=FileLib.read('Shitterlist', name)||'';
						if(force || local!==remote){ FileLib.write('Shitterlist', name, remote); changed++; }
						written++;          
				});
				if(remoteMetaContent && !filesMap['metadata.json']){ // falls metadata nicht im loop (sollte sein)
					FileLib.write('Shitterlist','metadata.json',remoteMetaContent);
				}
				slSuccess(`Update fertig (${localV||'?'} -> ${remoteV||'?'}), ${changed} Dateien geändert. Reload...`);
				setTimeout(()=>ChatLib.command('ct load',true), 750);
				cb&&cb(true);
			} catch(e){ slWarn('Update Fehler: '+e.message); cb&&cb(false); }
		});
	});
}

export function triggerManualUpdateCheck(){ slInfo('Prüfe auf Updates...'); checkForUpdate(has=>{ if(has){ slLog('general','Update verfügbar: /sl update-now','info'); } else slInfo('Aktuell'); }); }

export function startAutoUpdater(){ if(!settings.autoUpdaterEnabled) return; if(startAutoUpdater._reg) return; const mins=Math.max(1, settings.updateCheckInterval||5); startAutoUpdater._reg=register('step',()=>{ const now=Date.now(); if(now-state.lastCheck < mins*60*1000) return; if(state.checking) return; checkForUpdate(has=>{ if(has && settings.autoInstallUpdates) performSelfUpdate(true); }); }).setDelay(60); if(settings.debugMode) ChatLib.chat(formatMessage(`AutoUpdater aktiv – Intervall ${mins}m`, 'info')); }

const __g_upd=(typeof globalThis!=='undefined')?globalThis:(typeof global!=='undefined'?global:this);
try { Object.assign(__g_upd,{ performSelfUpdate, triggerManualUpdateCheck, startAutoUpdater, checkForUpdate }); } catch(_) {}
