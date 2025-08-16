// commands.js – SINGLE IMPLEMENTATION
import { settings } from './settings';
import { slLog, slInfo, slWarn, showApiSyncMessage, withPrefix, ALLOWED_FLOORS_HELP } from './utils/core';
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

// Cache the last known reason for removed players to support "silent re-add"
const lastRemovedReasons = {};

register('command', (...args)=>{
  if(!args || args.length===0){
    slLog('general','Befehle:','info');
    // Help without THEME
    ChatLib.chat('/sl add <name> <grund> <floor> - Spieler hinzufügen');
    ChatLib.chat('/sl remove <name> - Spieler entfernen');
    ChatLib.chat('/sl check <name> - Status prüfen');
    ChatLib.chat('/sl list - Liste anzeigen');
    ChatLib.chat('/sl search <term> - In Liste suchen');
    ChatLib.chat('/sl random - Zufälligen Shitter anzeigen');
    ChatLib.chat('/sl stats - Statistiken anzeigen');
    ChatLib.chat('/sl online - Online Shitter prüfen');
    ChatLib.chat('/sl export - Liste exportieren');
    ChatLib.chat('/sl players - Klickbare Spielerliste');
    ChatLib.chat('/sl quick <category> <name> - Schnell kategorisieren');
    ChatLib.chat('=== API-Befehle ===');
    ChatLib.chat('/sl sync - Manueller API-Sync');
    ChatLib.chat('/sl upload - Lokale Daten hochladen');
    ChatLib.chat('/sl download - API-Daten herunterladen');
    ChatLib.chat('/sl apistatus - API-Status prüfen');
    ChatLib.chat('/sl testdetection <name> - Teste Spieler-Erkennung');
    ChatLib.chat('/sl testkick <name> - Teste Party-Kick');
    ChatLib.chat('/sl breakdown - Daten-Diagnose');
    ChatLib.chat('/sl reclass - Re-Klassifiziere [API] Einträge');
    ChatLib.chat('/sl toggle <setting> - Einstellung umschalten');
    ChatLib.chat('/sl reloadgui - Vigilance neu laden');
    ChatLib.chat('/sl testmessage <msg> - Chat Detection testen');
    ChatLib.chat('/sl update-now - Sofort updaten');
    ChatLib.chat('/sl checkupdate - Update-Check');
    // Show floors help once
    ChatLib.chat(ALLOWED_FLOORS_HELP);
    return;
  }
  const sub = args[0].toLowerCase();
  switch(sub){
    case 'add':{
      if(args.length<4){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl add <username> <Grund> <Floor>'); return; }
      const name = args[1];
      let floor = args[args.length-1];
      const reason = args.slice(2, args.length-1).join(' ').trim();
      if(!reason){ ChatLib.chat('&c[Shitterlist] &fGrund darf nicht leer sein!'); return; }
  // Normalize and validate floor token (F1-F7 or M1-M7)
  if(!floor || /\s/.test(floor)) { ChatLib.chat('&c[Shitterlist] &fErlaubte Floors: &eF1 F2 F3 F4 F5 F6 F7 &7oder &eM1 M2 M3 M4 M5 M6 M7'); return; }
  floor = String(floor).toUpperCase();
  if(!/^([FM][1-7])$/.test(floor)) { ChatLib.chat('&c[Shitterlist] &fErlaubte Floors: &eF1 F2 F3 F4 F5 F6 F7 &7oder &eM1 M2 M3 M4 M5 M6 M7'); return; }
      addShitter(name, reason, floor);
      break; }
    case 'remove': if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl remove <username>'); return; } removeShitter(args[1]); break;
    case 'check': if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl check <username>'); return;} const info=getActivePlayerList().find(p=>p.name.toLowerCase()===args[1].toLowerCase()); if(info){ ChatLib.chat(`&c[Shitterlist] &f${args[1]} ist ein Shitter`); ChatLib.chat(`&7Grund: &c${info.reason||'Unknown'}`);} else ChatLib.chat(`&a[Shitterlist] &f${args[1]} ist nicht in der Liste`); break;
    case 'list': {
      // Build a single multi-line message with a fixed chat line ID so it gets overridden on page changes
      const LIST_CHAT_ID = 99127001;
      const list=getActivePlayerList();
      const pageSize=10; const pageArg=args[1];
      const totalPages=Math.max(1, Math.ceil(list.length/pageSize));
      let page=parseInt(pageArg||'1'); if(isNaN(page)||page<1) page=1; if(page>totalPages) page=totalPages;

      if(!list.length){
        const emptyMsg = new Message('&7[Shitterlist] Keine Einträge vorhanden.')
          .setChatLineId(LIST_CHAT_ID);
        ChatLib.chat(emptyMsg);
        return;
      }

      const header = `Shitter (${list.length})  Seite ${page}/${totalPages}`;
      const start=(page-1)*pageSize;
      const pageItems = list.slice(start,start+pageSize);

      // Compose message with clickable names that run /pv <name>
      const msg = new Message(new TextComponent(header));
      pageItems.forEach(pl => {
        const id = pl.id || '?';
        // Newline + clickable ID (#id) to remove entry
        const idBtn = new TextComponent(`\n&c#${id}`)
          .setHover('show_text', `&cEintrag entfernen? Bestätigung folgt.\n&7Klick: /sl confirmremove ${pl.name}`)
          .setClick('run_command', `/sl confirmremove ${pl.name}`);
        msg.addTextComponent(idBtn);
        // Space + white name label
        msg.addTextComponent(new TextComponent(' &f'));
        // Clickable player name -> /pv <name>
        const nameBtn = new TextComponent(pl.name)
          .setHover('show_text', `&eKlicken zum Öffnen: /pv ${pl.name}`)
          .setClick('run_command', `/pv ${pl.name}`);
        msg.addTextComponent(nameBtn);
        // Determine floor for display: use field or parse trailing [Fx] from reason
        let floorLabel = '';
        try {
          if(pl.floor) floorLabel = String(pl.floor);
          else if(pl.reason){ const m = String(pl.reason).match(/\[(?:F|M)\d+\]$/i); if(m) floorLabel = m[0].replace(/[\[\]]/g,''); }
        } catch(_) {}
        // Suffix with reason (+ optional floor) without THEME
        const suffix = floorLabel ? ` - ${pl.reason||'Keine Angabe'} [${floorLabel}]` : ` - ${pl.reason||'Keine Angabe'}`;
        msg.addTextComponent(new TextComponent(suffix));
      });

      // Navigation (hover + click) appended to the same message so the whole block shares one ID
      if(totalPages>1){
        try {
          const parts = [];
          if(page>1){
            parts.push(new TextComponent('\n&c[< Zurück] ')
              .setHover('show_text', `&cVorherige Seite (${page-1}/${totalPages})`)
              .setClick('run_command', `/sl list ${page-1}`));
          } else {
            // add a newline for consistent spacing even without back button
            parts.push(new TextComponent('\n'));
          }
          if(page<totalPages){
            parts.push(new TextComponent('&a[Weiter >]')
              .setHover('show_text', `&aNächste Seite (${page+1}/${totalPages})`)
              .setClick('run_command', `/sl list ${page+1}`));
          }
          if(parts.length){ parts.forEach(c=>msg.addTextComponent(c)); }
        } catch(e){ if(settings.debugMode) ChatLib.chat('&7[DEBUG] Nav Error: '+e.message); }
      }

  msg.setChatLineId(LIST_CHAT_ID);
      ChatLib.chat(msg);
      break;
    }
    case 'confirmremove': {
      if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl confirmremove <username>'); return; }
      const name=args[1];
      const entry = getActivePlayerList().find(p=>p.name.toLowerCase()===name.toLowerCase());
      if(!entry){ ChatLib.chat(`&c[Shitterlist] &f${name} nicht gefunden.`); return; }
      const m = new Message(withPrefix('Wirklich entfernen: ','warning'),
                            new TextComponent(`&c${entry.name}`).setHover('show_text', `Grund: &f${entry.reason||'Keine Angabe'}`));
      m.addTextComponent(new TextComponent('  '));
      m.addTextComponent(new TextComponent('&a[Ja, entfernen]')
        .setHover('show_text', `&cEntfernen: ${entry.name}`)
        .setClick('run_command', `/sl doremove ${entry.name}`));
      m.addTextComponent(new TextComponent(' '));
      m.addTextComponent(new TextComponent('&7[Abbrechen]')
        .setHover('show_text', '&7Abbruch, keine Aktion')
        .setClick('run_command', `/sl canceled`));
      ChatLib.chat(m);
      break;
    }
    case 'doremove': {
      if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl doremove <username>'); return; }
      const name=args[1];
      const lower=name.toLowerCase();
      const entry = getActivePlayerList().find(p=>p.name.toLowerCase()===lower);
      if(!entry){ ChatLib.chat(`&c[Shitterlist] &f${name} nicht gefunden.`); return; }
      // Remember reason for silent re-add
      lastRemovedReasons[lower] = entry.reason || 'Keine Angabe';
      const ok = removeShitter(name);
      if(ok){
        const back = new Message(withPrefix(`Entfernt: &c${name}&f. `,'success'));
        back.addTextComponent(new TextComponent('&e[Wieder hinzufügen]')
          .setHover('show_text', `&7Gleicher Grund: &f${lastRemovedReasons[lower]}`)
          .setClick('run_command', `/sl readdsilently ${name}`));
        ChatLib.chat(back);
      }
      break;
    }
    case 'readdsilently': {
      if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl readdsilently <username>'); return; }
      const name=args[1];
      const lower=name.toLowerCase();
      const reason = lastRemovedReasons[lower] || 'Keine Angabe';
      // Temporarily suppress "add" webhook (affects API_ONLY path)
      const prev = settings.webhookSendAdds;
      try { settings.webhookSendAdds = false; addShitter(name, reason); } finally { settings.webhookSendAdds = prev; }
      ChatLib.chat(withPrefix(`Wieder hinzugefügt: &c${name} (&7${reason}&f)`,'success'));
      break;
    }
    case 'canceled': { ChatLib.chat('&7[Shitterlist] &fAktion abgebrochen.'); break; }
    case 'search': {
      if(args.length<2){ ChatLib.chat('&c[Shitterlist] &fUsage: /sl search <term>'); return;} { const term=args.slice(1).join(' '); const matches=getActivePlayerList().filter(p=>p.name.toLowerCase().includes(term.toLowerCase())|| (p.reason||'').toLowerCase().includes(term.toLowerCase())); if(!matches.length){ ChatLib.chat(`&c[Shitterlist] &fKeine Treffer für "${term}"`); return;} ChatLib.chat(withPrefix(`Suchergebnisse (${matches.length}):`,'success')); matches.forEach(p=>ChatLib.chat(`• &f${p.name} (&7${p.reason}&f)`)); } break;
    }
    case 'random': getRandomShitter(); break;
    case 'stats': getShitterStats(); break;
    case 'online': checkOnlineShitters(); break;
    case 'export': exportShitterlist(); break;
    case 'quick': if(args.length<3){ ChatLib.chat('&cUsage: /sl quick <kategorie> <name> [grund]'); return;} addShitterWithCategory(args[2], args[1].toLowerCase(), args.slice(3).join(' ')||'Keine Angabe'); break;
    case 'clear': ChatLib.chat("&c[Shitterlist] &fWirklich alle Einträge löschen? '/sl confirmclear'"); break;
    case 'confirmclear': clearList(); break;
  case 'players': {
      try { const tab=TabList.getNames(); if(tab&&tab.length){ ChatLib.chat('&a[Shitterlist] &f&lKlickbare Spielerliste:'); const my=Player.getName(); tab.slice(0,20).forEach(n=>{ const cn=cleanPlayerName(n); if(cn!==my && cn.length>0 && !cn.includes('Players')){ const is=isShitter(cn); const hover=is?'&eVON LISTE ENTFERNEN':'&eZUR LISTE HINZUFÜGEN (Grund+Floor anpassen)'; const clickType=is?'run_command':'suggest_command'; const clickCmd=is?`/sl remove ${cn}`:`/sl add ${cn} Grund F7`; const comp=new Message(`${is?'&c●':'&a●'} `, new TextComponent(`&f${cn}`).setHover('show_text', hover).setClick(clickType, clickCmd)); ChatLib.chat(comp); } }); } else ChatLib.chat('&c[Shitterlist] &fKeine Tab-Liste verfügbar'); } catch(e){ ChatLib.chat('&c[Shitterlist] &fFehler: '+e.message);} break;
    }
    case 'sync': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} showApiSyncMessage('Starte API-Synchronisation...','info'); syncWithAPI(); break;
    case 'upload': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} uploadToAPI(()=>{}); break;
    case 'download': if(!settings.enableAPI){ ChatLib.chat('&c[Shitterlist] &fAPI ist nicht aktiviert'); return;} downloadFromAPI(()=>{}); break;
    case 'apistatus':
      ChatLib.chat(withPrefix('API-Status:','info'));
      ChatLib.chat(`URL: ${settings.apiUrl||'Nicht gesetzt'}`);
      ChatLib.chat(`Status: ${apiData.apiStatus}`);
      break;
    case 'breakdown': {
      const bd=getBreakdown();
      ChatLib.chat(withPrefix('Zähl-Diagnose:','info'));
      ChatLib.chat(`Gesamt: ${bd.total}`);
      ChatLib.chat(`API: ${bd.api} | Lokal: ${bd.local}`);
      if(bd.duplicates.length>0) ChatLib.chat(`Duplikate (${bd.duplicates.length}): ${bd.duplicates.join(', ')}`);
      else ChatLib.chat('Duplikate: Keine');
      if(bd.mismatch && settings.debugMode) ChatLib.chat(`Hinweis: ${bd.apiByReason} Einträge haben [API]-Reason aber nur ${bd.apiBySource} source=api`);
      break;
    }
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
}).setName('shitterlist').setAliases('sl');

// Keep GUI command, no THEME needed
register('command',()=>settings.openGUI && settings.openGUI()).setName('slconfig').setAliases('shitterlistconfig','slgui');
register('command',()=>{ ChatLib.chat(withPrefix('Modul ist geladen und funktionsfähig!','success')); ChatLib.chat('Verwende /slconfig für Settings'); }).setName('sltest');