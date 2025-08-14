// commands.js – SINGLE IMPLEMENTATION
import { settings } from './settings';
import { slLog, slInfo, slWarn, showApiSyncMessage } from './utils/core';
import { addShitter, removeShitter, isShitter, getRandomShitter, getShitterStats, checkOnlineShitters, exportShitterlist, clearList, getActivePlayerList } from './utils/data';
import { syncWithAPI, downloadFromAPI, uploadToAPI, getAPIStatusColor, apiData } from './utils/api';
import { performSelfUpdate, triggerManualUpdateCheck } from './updater';
import { attemptAutoKick } from './utils/party';
import { cleanPlayerName } from './utils/core';
import { getBreakdown, reclassAPIEntries } from './maintenance';

function addShitterWithCategory(username, category, reason){
  const categories={ toxic:'Toxisches Verhalten', scammer:'Scammer/Betrüger', griefer:'Griefer', cheater:'Cheater/Hacker', spammer:'Spammer', troll:'Troll', annoying:'Nerviger Spieler' };
  const full = categories[category]? `${categories[category]}: ${reason}` : `${category}: ${reason}`; return addShitter(username, full);
}

register('command', (...args)=>{
  if(!args || args.length===0){
    slLog('general','Befehle:','info');
    ChatLib.chat('&e/sl add <name> [reason] &7- Spieler hinzufügen');
    ChatLib.chat('&e/sl remove <name> &7- Spieler entfernen');
    ChatLib.chat('&e/sl check <name> &7- Status prüfen');
    ChatLib.chat('&e/sl list &7- Liste anzeigen');
    ChatLib.chat('&e/sl search <term> &7- In Liste suchen');
    ChatLib.chat('&e/sl random &7- Zufälligen Shitter anzeigen');
    ChatLib.chat('&e/sl stats &7- Statistiken anzeigen');
    ChatLib.chat('&e/sl online &7- Online Shitter prüfen');
    ChatLib.chat('&e/sl export &7- Liste exportieren');
    ChatLib.chat('&e/sl players &7- Klickbare Spielerliste');
    ChatLib.chat('&e/sl quick <category> <name> &7- Schnell kategorisieren');
    ChatLib.chat('&6=== API-Befehle ===');
    ChatLib.chat('&e/sl sync &7- Manueller API-Sync');
    ChatLib.chat('&e/sl upload &7- Lokale Daten hochladen');
    ChatLib.chat('&e/sl download &7- API-Daten herunterladen');
    ChatLib.chat('&e/sl apistatus &7- API-Status prüfen');
    ChatLib.chat('&e/sl testdetection <name> &7- Teste Spieler-Erkennung');
    ChatLib.chat('&e/sl testkick <name> &7- Teste Party-Kick');
    ChatLib.chat('&e/sl breakdown &7- Daten-Diagnose');
    ChatLib.chat('&e/sl reclass &7- Re-Klassifiziere [API] Einträge');
    ChatLib.chat('&e/sl toggle <setting> &7- Einstellung umschalten');
    ChatLib.chat('&e/sl reloadgui &7- Vigilance neu laden');
    ChatLib.chat('&e/sl testmessage <msg> &7- Chat Detection testen');
    ChatLib.chat('&e/sl update-now &7- Sofort updaten');
    ChatLib.chat('&e/sl checkupdate &7- Update-Check');
    return;
  }
  const sub = args[0].toLowerCase();
  switch(sub){
    case 'add':{
      if(args.length<3){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl add <username> <Grund>'); return; }
      const reason=args.slice(2).join(' ').trim(); if(!reason){ ChatLib.chat('&c[Shitterlist] &fGrund darf nicht leer sein!'); return; }
      addShitter(args[1], reason);
      break; }
    case 'remove': if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl remove <username>'); return; } removeShitter(args[1]); break;
    case 'check': if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl check <username>'); return;} const info=getActivePlayerList().find(p=>p.name.toLowerCase()===args[1].toLowerCase()); if(info){ ChatLib.chat(`&c[Shitterlist] &f${args[1]} ist ein Shitter`); ChatLib.chat(`&7Grund: &c${info.reason||'Unknown'}`);} else ChatLib.chat(`&a[Shitterlist] &f${args[1]} ist nicht in der Liste`); break;
    case 'list': {
      const list=getActivePlayerList();
      const pageSize=10; const pageArg=args[1];
      const totalPages=Math.max(1, Math.ceil(list.length/pageSize));
      let page=parseInt(pageArg||'1'); if(isNaN(page)||page<1) page=1; if(page>totalPages) page=totalPages;
      slLog('general',`Shitter (${list.length}) Seite ${page}/${totalPages}:`,'info');
      if(!list.length){ ChatLib.chat('&7Keine Shitter in der Liste'); return; }
      const start=(page-1)*pageSize;
      list.slice(start,start+pageSize).forEach(pl=>ChatLib.chat(`&c#${pl.id||'?'} &f${pl.name} &7- ${pl.reason}`));
      // Navigation (hover + click)
      if(totalPages>1){
        try {
          const comps=[];
          if(page>1){
            comps.push(new TextComponent('&c[< Zurück] ').setHover('show_text', `&cVorherige Seite (${page-1}/${totalPages})`).setClick('run_command', `/sl list ${page-1}`));
          }
            if(page<totalPages){
            comps.push(new TextComponent('&a[Weiter >]').setHover('show_text', `&aNächste Seite (${page+1}/${totalPages})`).setClick('run_command', `/sl list ${page+1}`));
          }
          if(comps.length){ ChatLib.chat(new Message(...comps)); }
        } catch(e){ if(settings.debugMode) ChatLib.chat('&7[DEBUG] Nav Error: '+e.message); }
      }
      break;
    }
    case 'search': if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl search <term>'); return;} { const term=args.slice(1).join(' '); const matches=getActivePlayerList().filter(p=>p.name.toLowerCase().includes(term.toLowerCase())|| (p.reason||'').toLowerCase().includes(term.toLowerCase())); if(!matches.length){ ChatLib.chat(`&c[Shitterlist] &fKeine Treffer für "${term}"`); return;} ChatLib.chat(`&a[Shitterlist] &fSuchergebnisse (${matches.length}):`); matches.forEach(p=>ChatLib.chat(`&c• ${p.name} &7(${p.reason})`)); } break;
    case 'random': getRandomShitter(); break;
    case 'stats': getShitterStats(); break;
    case 'online': checkOnlineShitters(); break;
    case 'export': exportShitterlist(); break;
    case 'quick': if(args.length<3){ ChatLib.chat('&cUsage: /sl quick <kategorie> <name> [grund]'); return;} addShitterWithCategory(args[2], args[1].toLowerCase(), args.slice(3).join(' ')||'Keine Angabe'); break;
    case 'clear': ChatLib.chat("&c[Shitterlist] &fWirklich alle Einträge löschen? '/sl confirmclear'"); break;
    case 'confirmclear': clearList(); break;
    case 'players': try { const tab=TabList.getNames(); if(tab&&tab.length){ ChatLib.chat('&a[Shitterlist] &f&lKlickbare Spielerliste:'); const my=Player.getName(); tab.slice(0,20).forEach(n=>{ const cn=cleanPlayerName(n); if(cn!==my && cn.length>0 && !cn.includes('Players')){ const is=isShitter(cn); const comp=new Message(`${is?'&c●':'&a●'} `, new TextComponent(`&f${cn}`).setHover('show_text', is?'&eVON LISTE ENTFERNEN':'&eZUR LISTE HINZUFÜGEN').setClick('run_command', is?`/sl remove ${cn}`:`/sl add ${cn} Manual`)); ChatLib.chat(comp); } }); } else ChatLib.chat('&c[Shitterlist] &fKeine Tab-Liste verfügbar'); } catch(e){ ChatLib.chat('&c[Shitterlist] &fFehler: '+e.message);} break;
    case 'sync': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} showApiSyncMessage('Starte API-Synchronisation...','info'); syncWithAPI(); break;
    case 'upload': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} uploadToAPI(()=>{}); break;
    case 'download': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} downloadFromAPI(()=>{}); break;
  case 'apistatus': ChatLib.chat('&7[Shitterlist] &fAPI-Status:'); ChatLib.chat('&7URL: '+(settings.apiUrl||'Nicht gesetzt')); ChatLib.chat('&7Status: '+getAPIStatusColor()+apiData.apiStatus); break;
  case 'breakdown': { const bd=getBreakdown(); ChatLib.chat('&6[Shitterlist] &fZähl-Diagnose:'); ChatLib.chat(`&7Gesamt: &a${bd.total}`); ChatLib.chat(`&7API: &a${bd.api} &7| Lokal: &a${bd.local}`); if(bd.duplicates.length>0) ChatLib.chat(`&cDuplikate (${bd.duplicates.length}): &7${bd.duplicates.join(', ')}`); else ChatLib.chat('&7Duplikate: &aKeine'); if(bd.mismatch && settings.debugMode) ChatLib.chat(`&eHinweis: &7${bd.apiByReason} Einträge haben [API]-Reason aber nur ${bd.apiBySource} source=api`); break; }
  case 'reclass': { const changed=reclassAPIEntries(); ChatLib.chat(changed>0?`&a[Shitterlist] &f${changed} Einträge reklassifiziert.`:'&7[Shitterlist] &fKeine Änderungen.'); break; }
  case 'toggle': { if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl toggle <setting>'); ChatLib.chat('&7enabled, debug, joinwarnings, party, dungeon, title, sound, autopartykick, api, autoinstall'); return;} const setting=args[1].toLowerCase(); const map={ enabled:'enabled', debug:'debugMode', debugmode:'debugMode', joinwarnings:'showJoinWarnings', showjoinwarnings:'showJoinWarnings', party:'partyWarnings', partywarnings:'partyWarnings', dungeon:'dungeonWarnings', dungeonwarnings:'dungeonWarnings', title:'showTitleWarning', titlewarning:'showTitleWarning', showtitlewarning:'showTitleWarning', sound:'warningSound', warningsound:'warningSound', autopartykick:'autoPartyKick', partkick:'autoPartyKick', api:'enableAPI', enableapi:'enableAPI', autoinstall:'autoInstallUpdates', autoinstallupdates:'autoInstallUpdates' }; const key=map[setting]; if(!key){ ChatLib.chat('&c[Shitterlist] &fUnbekannte Einstellung: '+setting); break; } settings[key]=!settings[key]; ChatLib.chat(`&a[Shitterlist] &f${key} => ${(settings[key]?'&aAn':'&cAus')}`); break; }
  case 'reloadgui': case 'reloadsettings': { ChatLib.chat('&a[Shitterlist] &fReload der Vigilance Settings...'); try { ChatLib.command('ct load', true); ChatLib.chat('&a[Shitterlist] &7Module neu geladen! Verwende /slconfig'); } catch(e){ ChatLib.chat('&c[Shitterlist] &7Reload fehlgeschlagen: '+e.message);} break; }
  case 'testmessage': { if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl testmessage <message>'); return;} const testMsg=args.slice(1).join(' '); ChatLib.chat('&6[Shitterlist] &f=== TEST MESSAGE ==='); if(testMsg.includes('joined the dungeon group!') && settings.dungeonWarnings){ const m=testMsg.match(/^(.+?) joined the dungeon group!/); if(m){ const name=m[1].trim().replace(/^Party Finder > /,''); ChatLib.chat(`&7Simulierter Spieler: ${name}`); ChatLib.chat(isShitter(name)?'&cWäre erkannt worden':'&aNicht erkannt'); } else ChatLib.chat('&7Kein Pattern erkannt'); } else ChatLib.chat('&7Kein Dungeon-Pattern oder deaktiviert'); break; }
    case 'testdetection': if(args.length<2){ ChatLib.chat('&cUsage: /sl testdetection <name>'); return;} const testU=args[1]; ChatLib.chat('&6[Shitterlist] &f=== TEST DETECTION ==='); ChatLib.chat('&7Testing username: '+testU); ChatLib.chat('&7isShitter: '+isShitter(testU)); break;
    case 'testkick': if(args.length<2){ ChatLib.chat('&cUsage: /sl testkick <name>'); return;} attemptAutoKick(args[1], 'Test', 'party'); break;
    case 'update-now': performSelfUpdate(true); break;
    case 'checkupdate': triggerManualUpdateCheck(); break;
    default: ChatLib.chat('&c[Shitterlist] &fUnbekannter Befehl. /sl');
  }
}).setName('shitterlist').setAliases('sl help');

register('command',()=>settings.openGUI()).setName('slconfig').setAliases('shitterlistconfig','slgui','sl');
register('command',()=>{ ChatLib.chat('&a[Shitterlist] &fModul ist geladen und funktionsfähig!'); ChatLib.chat('&7Verwende /slconfig für Settings'); }).setName('sltest');
