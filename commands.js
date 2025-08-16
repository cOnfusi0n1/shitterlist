// commands.js – SINGLE IMPLEMENTATION
import { settings } from './settings';
import { slLog, slInfo, slWarn, showApiSyncMessage, withPrefix, THEME, ALLOWED_FLOORS_HELP } from './utils/core';
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
    ChatLib.chat(`${THEME.accent}/sl add <name> <grund> <floor> ${THEME.dim}- Spieler hinzufügen`);
    ChatLib.chat(`${THEME.accent}/sl remove <name> ${THEME.dim}- Spieler entfernen`);
    ChatLib.chat(`${THEME.accent}/sl check <name> ${THEME.dim}- Status prüfen`);
    ChatLib.chat(`${THEME.accent}/sl list ${THEME.dim}- Liste anzeigen`);
    ChatLib.chat(`${THEME.accent}/sl search <term> ${THEME.dim}- In Liste suchen`);
    ChatLib.chat(`${THEME.accent}/sl random ${THEME.dim}- Zufälligen Shitter anzeigen`);
    ChatLib.chat(`${THEME.accent}/sl stats ${THEME.dim}- Statistiken anzeigen`);
    ChatLib.chat(`${THEME.accent}/sl online ${THEME.dim}- Online Shitter prüfen`);
    ChatLib.chat(`${THEME.accent}/sl export ${THEME.dim}- Liste exportieren`);
    ChatLib.chat(`${THEME.accent}/sl players ${THEME.dim}- Klickbare Spielerliste`);
    ChatLib.chat(`${THEME.accent}/sl quick <category> <name> ${THEME.dim}- Schnell kategorisieren`);
    ChatLib.chat(`${THEME.header}=== API-Befehle ===`);
    ChatLib.chat(`${THEME.accent}/sl sync ${THEME.dim}- Manueller API-Sync`);
    ChatLib.chat(`${THEME.accent}/sl upload ${THEME.dim}- Lokale Daten hochladen`);
    ChatLib.chat(`${THEME.accent}/sl download ${THEME.dim}- API-Daten herunterladen`);
    ChatLib.chat(`${THEME.accent}/sl apistatus ${THEME.dim}- API-Status prüfen`);
    ChatLib.chat(`${THEME.accent}/sl testdetection <name> ${THEME.dim}- Teste Spieler-Erkennung`);
    ChatLib.chat(`${THEME.accent}/sl testkick <name> ${THEME.dim}- Teste Party-Kick`);
    ChatLib.chat(`${THEME.accent}/sl breakdown ${THEME.dim}- Daten-Diagnose`);
    ChatLib.chat(`${THEME.accent}/sl reclass ${THEME.dim}- Re-Klassifiziere [API] Einträge`);
    ChatLib.chat(`${THEME.accent}/sl toggle <setting> ${THEME.dim}- Einstellung umschalten`);
    ChatLib.chat(`${THEME.accent}/sl reloadgui ${THEME.dim}- Vigilance neu laden`);
    ChatLib.chat(`${THEME.accent}/sl testmessage <msg> ${THEME.dim}- Chat Detection testen`);
    ChatLib.chat(`${THEME.accent}/sl update-now ${THEME.dim}- Sofort updaten`);
    ChatLib.chat(`${THEME.accent}/sl checkupdate ${THEME.dim}- Update-Check`);
    return;
  }
  const sub = args[0].toLowerCase();
  switch(sub){
    case 'add':{
  if(args.length<4){ ChatLib.chat(withPrefix('Usage: /sl add <username> <Grund> <Floor>', 'warning')); return; }
      const name = args[1];
      let floor = args[args.length-1];
      const reason = args.slice(2, args.length-1).join(' ').trim();
  if(!reason){ ChatLib.chat(withPrefix('Grund darf nicht leer sein!', 'warning')); return; }
  // Normalize and validate floor token (F1-F7 or M1-M7)
  if(!floor || /\s/.test(floor)) { ChatLib.chat(withPrefix(ALLOWED_FLOORS_HELP,'warning')); return; }
  floor = String(floor).toUpperCase();
  if(!/^([FM][1-7])$/.test(floor)) { ChatLib.chat(withPrefix(ALLOWED_FLOORS_HELP,'warning')); return; }
      addShitter(name, reason, floor);
      break; }
  case 'remove': if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl remove <username>', 'warning')); return; } removeShitter(args[1]); break;
  case 'check': if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl check <username>', 'warning')); return;} const info=getActivePlayerList().find(p=>p.name.toLowerCase()===args[1].toLowerCase()); if(info){ ChatLib.chat(withPrefix(`${args[1]} ist ein Shitter`,'warning')); ChatLib.chat(`${THEME.dim}Grund: &c${info.reason||'Unknown'}`);} else ChatLib.chat(withPrefix(`${args[1]} ist nicht in der Liste`,'success')); break;
    case 'list': {
      // Build a single multi-line message with a fixed chat line ID so it gets overridden on page changes
      const LIST_CHAT_ID = 99127001;
      const list=getActivePlayerList();
      const pageSize=10; const pageArg=args[1];
      const totalPages=Math.max(1, Math.ceil(list.length/pageSize));
      let page=parseInt(pageArg||'1'); if(isNaN(page)||page<1) page=1; if(page>totalPages) page=totalPages;

      if(!list.length){
  const emptyMsg = new Message(withPrefix('Keine Einträge vorhanden.', 'info'))
          .setChatLineId(LIST_CHAT_ID);
        ChatLib.chat(emptyMsg);
        return;
      }

  const header = `${THEME.header}Shitter ${THEME.sep}(${THEME.accent}${list.length}${THEME.sep})  Seite ${THEME.accent}${page}${THEME.sep}/${THEME.accent}${totalPages}`;
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
        // Suffix with reason (+ optional floor)
        const suffix = floorLabel ? ` &7- ${pl.reason||'Keine Angabe'} &8[${floorLabel}]` : ` &7- ${pl.reason||'Keine Angabe'}`;
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
  } catch(e){ if(settings.debugMode) ChatLib.chat(withPrefix('[DEBUG] Nav Error: '+e.message,'info')); }
      }

  msg.setChatLineId(LIST_CHAT_ID);
      ChatLib.chat(msg);
      break;
    }
    case 'confirmremove': {
  if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl confirmremove <username>', 'warning')); return; }
      const name=args[1];
      const entry = getActivePlayerList().find(p=>p.name.toLowerCase()===name.toLowerCase());
  if(!entry){ ChatLib.chat(withPrefix(`${name} nicht gefunden.`, 'warning')); return; }
  const m = new Message(withPrefix('Wirklich entfernen: ','warning'), new TextComponent(`&c${entry.name}`).setHover('show_text', `${THEME.dim}Grund: &f${entry.reason||'Keine Angabe'}`));
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
  if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl doremove <username>', 'warning')); return; }
      const name=args[1];
      const lower=name.toLowerCase();
      const entry = getActivePlayerList().find(p=>p.name.toLowerCase()===lower);
  if(!entry){ ChatLib.chat(withPrefix(`${name} nicht gefunden.`, 'warning')); return; }
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
  if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl readdsilently <username>', 'warning')); return; }
      const name=args[1];
      const lower=name.toLowerCase();
      const reason = lastRemovedReasons[lower] || 'Keine Angabe';
      // Temporarily suppress "add" webhook (affects API_ONLY path)
      const prev = settings.webhookSendAdds;
      try { settings.webhookSendAdds = false; addShitter(name, reason); } finally { settings.webhookSendAdds = prev; }
  ChatLib.chat(withPrefix(`Wieder hinzugefügt: &c${name} ${THEME.dim}(${reason})`,'success'));
      break;
    }
  case 'canceled': { ChatLib.chat(withPrefix('Aktion abgebrochen.','info')); break; }
  case 'search': if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl search <term>', 'warning')); return;} { const term=args.slice(1).join(' '); const matches=getActivePlayerList().filter(p=>p.name.toLowerCase().includes(term.toLowerCase())|| (p.reason||'').toLowerCase().includes(term.toLowerCase())); if(!matches.length){ ChatLib.chat(withPrefix(`Keine Treffer für "${term}"`,'warning')); return;} ChatLib.chat(withPrefix(`Suchergebnisse (${matches.length}):`,'success')); matches.forEach(p=>ChatLib.chat(`${THEME.warning}• &f${p.name} ${THEME.dim}(${p.reason})`)); } break;
    case 'random': getRandomShitter(); break;
    case 'stats': getShitterStats(); break;
    case 'online': checkOnlineShitters(); break;
    case 'export': exportShitterlist(); break;
    case 'quick': if(args.length<3){ ChatLib.chat('&cUsage: /sl quick <kategorie> <name> [grund]'); return;} addShitterWithCategory(args[2], args[1].toLowerCase(), args.slice(3).join(' ')||'Keine Angabe'); break;
  case 'clear': ChatLib.chat(withPrefix("Wirklich alle Einträge löschen? '/sl confirmclear'", 'warning')); break;
    case 'confirmclear': clearList(); break;
  case 'players': try { const tab=TabList.getNames(); if(tab&&tab.length){ ChatLib.chat(withPrefix('&lKlickbare Spielerliste:','success')); const my=Player.getName(); tab.slice(0,20).forEach(n=>{ const cn=cleanPlayerName(n); if(cn!==my && cn.length>0 && !cn.includes('Players')){ const is=isShitter(cn); const hover=is?`${THEME.accent}VON LISTE ENTFERNEN`:`${THEME.accent}ZUR LISTE HINZUFÜGEN (Grund+Floor anpassen)`; const clickType=is?'run_command':'suggest_command'; const clickCmd=is?`/sl remove ${cn}`:`/sl add ${cn} Grund F7`; const comp=new Message(`${is?'&c●':'&a●'} `, new TextComponent(`&f${cn}`).setHover('show_text', hover).setClick(clickType, clickCmd)); ChatLib.chat(comp); } }); } else ChatLib.chat(withPrefix('Keine Tab-Liste verfügbar','warning')); } catch(e){ ChatLib.chat(withPrefix('Fehler: '+e.message,'warning')); } break;
  case 'sync': if(!settings.enableAPI){ ChatLib.chat(withPrefix('API ist nicht aktiviert','warning')); return;} showApiSyncMessage('Starte API-Synchronisation...','info'); syncWithAPI(); break;
  case 'upload': if(!settings.enableAPI){ ChatLib.chat(withPrefix('API ist nicht aktiviert','warning')); return;} uploadToAPI(()=>{}); break;
  case 'download': if(!settings.enableAPI){ ChatLib.chat(withPrefix('API ist nicht aktiviert','warning')); return;} downloadFromAPI(()=>{}); break;
  case 'apistatus': ChatLib.chat(withPrefix('API-Status:','info')); ChatLib.chat(`${THEME.dim}URL: ${settings.apiUrl||'Nicht gesetzt'}`); ChatLib.chat(`${THEME.dim}Status: ${getAPIStatusColor()}${apiData.apiStatus}`); break;
  case 'breakdown': { const bd=getBreakdown(); ChatLib.chat(withPrefix('Zähl-Diagnose:','info')); ChatLib.chat(`${THEME.dim}Gesamt: ${THEME.success}${bd.total}`); ChatLib.chat(`${THEME.dim}API: ${THEME.success}${bd.api} ${THEME.dim}| Lokal: ${THEME.success}${bd.local}`); if(bd.duplicates.length>0) ChatLib.chat(`${THEME.warning}Duplikate (${bd.duplicates.length}): ${THEME.dim}${bd.duplicates.join(', ')}`); else ChatLib.chat(`${THEME.dim}Duplikate: ${THEME.success}Keine`); if(bd.mismatch && settings.debugMode) ChatLib.chat(`${THEME.accent}Hinweis: ${THEME.dim}${bd.apiByReason} Einträge haben [API]-Reason aber nur ${bd.apiBySource} source=api`); break; }
  case 'reclass': { const changed=reclassAPIEntries(); ChatLib.chat(changed>0?withPrefix(`${changed} Einträge reklassifiziert.`,'success'):withPrefix('Keine Änderungen.','info')); break; }
  case 'toggle': { if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl toggle <setting>','warning')); ChatLib.chat(`${THEME.dim}enabled, debug, joinwarnings, party, dungeon, title, sound, autopartykick, api, autoinstall`); return;} const setting=args[1].toLowerCase(); const map={ enabled:'enabled', debug:'debugMode', debugmode:'debugMode', joinwarnings:'showJoinWarnings', showjoinwarnings:'showJoinWarnings', party:'partyWarnings', partywarnings:'partyWarnings', dungeon:'dungeonWarnings', dungeonwarnings:'dungeonWarnings', title:'showTitleWarning', titlewarning:'showTitleWarning', showtitlewarning:'showTitleWarning', sound:'warningSound', warningsound:'warningSound', autopartykick:'autoPartyKick', partkick:'autoPartyKick', api:'enableAPI', enableapi:'enableAPI', autoinstall:'autoInstallUpdates', autoinstallupdates:'autoInstallUpdates' }; const key=map[setting]; if(!key){ ChatLib.chat(withPrefix('Unbekannte Einstellung: '+setting,'warning')); break; } settings[key]=!settings[key]; ChatLib.chat(withPrefix(`${key} => ${settings[key]?'&aAn':'&cAus'}`,'success')); break; }
  case 'reloadgui': case 'reloadsettings': { ChatLib.chat(withPrefix('Reload der Vigilance Settings...','success')); try { ChatLib.command('ct load', true); ChatLib.chat(withPrefix('Module neu geladen! Verwende /slconfig','info')); } catch(e){ ChatLib.chat(withPrefix('Reload fehlgeschlagen: '+e.message,'warning'));} break; }
  case 'testmessage': { if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl testmessage <message>','warning')); return;} const testMsg=args.slice(1).join(' '); ChatLib.chat(withPrefix('=== TEST MESSAGE ===','info')); if(testMsg.includes('joined the dungeon group!') && settings.dungeonWarnings){ const m=testMsg.match(/^(.+?) joined the dungeon group!/); if(m){ const name=m[1].trim().replace(/^Party Finder > /,''); ChatLib.chat(`${THEME.dim}Simulierter Spieler: ${name}`); ChatLib.chat(isShitter(name)?`${THEME.warning}Wäre erkannt worden`:`${THEME.success}Nicht erkannt`); } else ChatLib.chat(`${THEME.dim}Kein Pattern erkannt`); } else ChatLib.chat(`${THEME.dim}Kein Dungeon-Pattern oder deaktiviert`); break; }
  case 'testdetection': if(args.length<2){ ChatLib.chat(withPrefix('Usage: /sl testdetection <name>','warning')); return;} const testU=args[1]; ChatLib.chat(withPrefix('=== TEST DETECTION ===','info')); ChatLib.chat(`${THEME.dim}Testing username: ${testU}`); ChatLib.chat(`${THEME.dim}isShitter: ${isShitter(testU)}`); break;
    case 'testkick': if(args.length<2){ ChatLib.chat('&cUsage: /sl testkick <name>'); return;} attemptAutoKick(args[1], 'Test', 'party'); break;
    case 'update-now': performSelfUpdate(true); break;
    case 'checkupdate': triggerManualUpdateCheck(); break;
  default: ChatLib.chat(withPrefix('Unbekannter Befehl. /sl','warning'));
  }
}).setName('shitterlist').setAliases('sl');

register('command',()=>settings.openGUI()).setName('slconfig').setAliases('shitterlistconfig','slgui');
register('command',()=>{ ChatLib.chat(withPrefix('Modul ist geladen und funktionsfähig!','success')); ChatLib.chat(`${THEME.dim}Verwende /slconfig für Settings`); }).setName('sltest');
