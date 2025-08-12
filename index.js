/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

import { @Vigilant, @SwitchProperty, @SelectorProperty, @SliderProperty, @TextProperty, @ButtonProperty, @CheckboxProperty, Color } from "Vigilance";
// Permanenter API-Only Modus (keine lokalen Spieler, keine manuelle Bearbeitung)
const API_ONLY = true;

// Einfache Async-Helfer um Haupt-Thread (Client Tick) nicht zu blockieren
let __asyncThreadSupportLoaded = false;
let __Thread = null;
let __Runnable = null;
function runAsync(label, fn){
    try {
        if (!__asyncThreadSupportLoaded){
            __Thread = Java.type("java.lang.Thread");
            __Runnable = Java.type("java.lang.Runnable");
            __asyncThreadSupportLoaded = true;
        }
        new __Thread(new __Runnable({ run: function(){
            try { fn(); } catch(e){ if (settings && settings.debugMode) ChatLib.chat(`&7[DEBUG] Async ${label} Fehler: ${e}`); }
        }})).start();
    } catch(e){ if (settings && settings.debugMode) ChatLib.chat(`&7[DEBUG] ThreadStart ${label} Fehler: ${e}`); }
}

function prettyOk(msg){ ChatLib.chat(`&a✔ &7${msg}`); }
function prettyInfo(msg){ ChatLib.chat(`&bℹ &7${msg}`); }
function prettyWarn(msg){ ChatLib.chat(`&c✖ &7${msg}`); }

// Vigilance Settings Klasse
@Vigilant("Shitterlist", "Shitterlist Configuration", {
    getCategoryComparator: () => (a, b) => {
        const categories = ["General", "Warnings", "Sounds", "API", "Updater", "Advanced"];
        return categories.indexOf(a.name) - categories.indexOf(b.name);
    }
})
class Settings {
    // === GENERAL SETTINGS ===
    @SwitchProperty({
        name: "Aktiviert",
        description: "Aktiviert oder deaktiviert die Shitterlist komplett",
        category: "General"
    })
    enabled = true;

    @SwitchProperty({
        name: "Debug Modus",
        description: "Zeigt zusätzliche Debug-Informationen im Chat",
        category: "General"
    })
    debugMode = false;

    @SwitchProperty({
        name: "Prefix anzeigen",
        description: "Zeigt [Shitterlist] Prefix in Nachrichten",
        category: "General"
    })
    showPrefix = true;

    @SwitchProperty({
        name: "Zeitstempel anzeigen",
        description: "Zeigt Zeitstempel in Nachrichten",
        category: "General"
    })
    showTimestamps = false;

    @SwitchProperty({
        name: "Kompakte Nachrichten",
        description: "Verkürzt Chat-Nachrichten",
        category: "General"
    })
    compactMessages = false;

    @SliderProperty({
        name: "Maximale Listengröße",
        description: "Maximale Anzahl von Spielern in der Liste",
        category: "General",
        min: 50,
        max: 2000
    })
    maxListSize = 500;

    // === WARNING SETTINGS ===
    @SwitchProperty({
        name: "Join Warnungen",
        description: "Warnt wenn ein Shitter dem Server beitritt",
        category: "Warnings"
    })
    showJoinWarnings = true;

    @SwitchProperty({
        name: "Party Warnungen",
        description: "Warnt wenn ein Shitter der Party beitritt",
        category: "Warnings"
    })
    partyWarnings = true;

    @SwitchProperty({
        name: "Dungeon Warnungen",
        description: "Warnt wenn ein Shitter dem Dungeon-Team beitritt",
        category: "Warnings"
    })
    dungeonWarnings = true;

    @SwitchProperty({
        name: "Title Warnungen",
        description: "Zeigt große Titel-Warnungen auf dem Bildschirm",
        category: "Warnings"
    })
    showTitleWarning = true;

    @SliderProperty({
        name: "Warning Cooldown",
        description: "Cooldown zwischen Warnungen in Sekunden (0 = deaktiviert)",
        category: "Warnings",
        min: 0,
        max: 300
    })
    warningCooldown = 30;

    @SwitchProperty({
        name: "Chat Filter",
        description: "Filtert Nachrichten von Shittern aus dem Chat",
        category: "Warnings"
    })
    chatFilter = false;

    @SwitchProperty({
        name: "Auto Block",
        description: "Blockiert Shitter automatisch mit /ignore",
        category: "Warnings"
    })
    autoBlock = false;

    @SwitchProperty({
        name: "Auto Party Kick",
        description: "Kickt Shitter automatisch aus der Party mit /p kick",
        category: "Warnings"
    })
    autoPartyKick = false;

    // === SOUND SETTINGS ===
    @SwitchProperty({
        name: "Warnsound",
        description: "Spielt Sound bei Warnungen ab",
        category: "Sounds"
    })
    warningSound = true;

    @SwitchProperty({
        name: "Erfolgssound",
        description: "Spielt Sound bei erfolgreichen Aktionen ab",
        category: "Sounds"
    })
    successSound = true;

    // --- Custom Join Sound (für Shitter Join) ---
    @SwitchProperty({
        name: "Custom Join Sound",
        description: "Spielt eigenen Sound wenn ein Shitter joint (Party/Dungeon)",
        category: "Sounds"
    })
    customJoinSoundEnabled = false;

    @TextProperty({
        name: "Join Sound Event",
        description: "Sound-Event Name (z.B. shitterlist.alert)",
        category: "Sounds",
        placeholder: "shitterlist.alert"
    })
    customJoinSoundEventName = "";

    @SliderProperty({
        name: "Join Sound Lautstärke",
        description: "Lautstärke (0-100)",
        category: "Sounds",
        min: 0,
        max: 100
    })
    customJoinSoundVolume = 100;

    @SliderProperty({
        name: "Join Sound Pitch",
        description: "Tonhöhe (50-200 = 0.5x - 2.0x)",
        category: "Sounds",
        min: 50,
        max: 200
    })
    customJoinSoundPitch = 100;
    // Doppelte Sound Settings entfernt

    @SwitchProperty({
        name: "Auto Backup",
        description: "Erstellt täglich ein Backup",
        category: "Advanced"
    })
    autoBackup = true;

    @SliderProperty({
        name: "Auto Cleanup Tage",
        description: "Entfernt Einträge älter als X Tage (0=aus)",
        category: "Advanced",
        min: 0,
        max: 365
    })
    autoCleanupDays = 0;

    @SwitchProperty({
        name: "Case Sensitive",
        description: "Groß-/Kleinschreibung beim Matchen beachten",
        category: "Advanced"
    })
    caseSensitive = false;

    @SwitchProperty({
        name: "Teilstring Match",
        description: "Teilstring namenssuche erlauben",
        category: "Advanced"
    })
    partialMatching = false;

    // === API SETTINGS ===
    @SwitchProperty({
        name: "API aktiviert",
        description: "Aktiviert die API-Funktionalität",
        category: "API"
    })
    enableAPI = false;

    @TextProperty({
        name: "API URL",
        description: "URL der Shitterlist API",
        category: "API",
        placeholder: "https://api.example.com"
    })
    apiUrl = "";

    @SwitchProperty({
        name: "Auto Sync",
        description: "Synchronisiert automatisch mit der API",
        category: "API"
    })
    autoSync = false;

    @SliderProperty({
        name: "Sync Intervall",
        description: "Intervall für Auto-Sync in Minuten",
        category: "API",
        min: 1,
        max: 60
    })
    syncInterval = 5;

    @SwitchProperty({
        name: "Von API laden",
        description: "Lädt Daten von der API herunter",
        category: "API"
    })
    downloadFromAPI = true;

    @SwitchProperty({
        name: "Zur API hochladen",
        description: "Lädt lokale Daten zur API hoch",
        category: "API"
    })
    uploadToAPI = false;

    @SwitchProperty({
        name: "API Daten verifizieren",
        description: "Verifiziert API-Daten vor dem Hinzufügen",
        category: "API"
    })
    verifyAPIData = true;

    @SwitchProperty({
        name: "API-Sync Nachrichten",
        description: "Zeigt Statusmeldungen während der API-Synchronisation im Chat",
        category: "API"
    })
    showApiSyncMessages = true;


    @SwitchProperty({
        name: "Allgemeine Nachrichten",
        description: "Zeige allgemeine Info-/Erfolgs-Nachrichten",
        category: "General"
    })
    showGeneralMessages = true;

    @SwitchProperty({
        name: "Warnungs-Nachrichten",
        description: "Zeige Warnungs-/Erkennungs-Nachrichten",
        category: "Warnings"
    })
    showWarningMessages = true;

    // === UPDATER SETTINGS ===
    @SwitchProperty({
        name: "Auto-Updater",
        description: "Aktualisiert das Modul automatisch von GitHub",
        category: "Updater"
    })
    autoUpdaterEnabled = true;

    @SwitchProperty({
        name: "Automatisch installieren",
        description: "Falls deaktiviert: nur Hinweis im Chat, manuell aktualisieren",
        category: "Updater"
    })
    autoInstallUpdates = true;

    @SwitchProperty({
        name: "Beim Start prüfen",
        description: "Prüft beim Start auf Updates",
        category: "Updater"
    })
    checkUpdatesOnLoad = true;

    @SliderProperty({
        name: "Prüfintervall (Min.)",
        description: "Intervall für automatische Update-Prüfung",
        category: "Updater",
        min: 1,
        max: 60
    })
    updateCheckInterval = 5;

    @ButtonProperty({
        name: "Jetzt nach Updates suchen",
        description: "Prüft sofort auf verfügbare Updates",
        category: "Updater"
    })
    checkUpdatesButton() {
        triggerManualUpdateCheck();
    }

    @ButtonProperty({
        name: "Jetzt aktualisieren",
        description: "Erzwingt Download und Reload",
        category: "Updater"
    })
    forceUpdateButton() {
        performSelfUpdate(true);
    }

    constructor() {
        this.initialize(this);
    }
}

// Erstelle Settings-Instanz
const settings = new Settings();

// Datenstruktur für Shitterliste
let shitterData = {
    players: [],
    version: "1.2.1", // bumped to trigger update after repo change
    warningCooldowns: {}, // Für Warning-Cooldowns
    lastBackup: 0, // Für Auto-Backup
    lastSync: 0, // Für API-Synchronisation
    apiData: [] // Für API-Daten Cache
};

// Verhindert doppelte Auto-Kick Nachrichten (z.B. erst Party-Join, dann Dungeon-Group Join)
const autoKickRecent = {}; // { playerNameLower: timestamp }
const recentDetections = {}; // { playerNameLower: timestamp }

// NEU: Debounce für Kick-Ankündigung (Party + Dungeon)
const autoKickSent = {}; // { playerNameLower: timestamp }

// Kick-Nachricht + Kick ausführen
function sendKickAnnouncement(playerName, reason) {
    const r = (reason && reason.trim()) ? reason.trim() : "Unknown";
    // ALT: ChatLib.command(`pc Kicking ${playerName} - Reason: ${r}`);
    safeCommand(`pc Kicking ${playerName} - Reason: ${r}`);
}
function scheduleKick(playerName) {
    // ALT: setTimeout(() => ChatLib.command(`p kick ${playerName}`), 800);
    // Mit Queue reicht direkte Einreihung; Delay kommt automatisch
    safeCommand(`p kick ${playerName}`);
}

// === Neuer Abschnitt: Rate Limiter für Server-Commands ===
const COMMAND_DELAY_MS = 1400; // Abstand zwischen gesendeten Befehlen (anpassen falls nötig)
const commandQueue = [];
let lastCommandSentAt = 0;

function queueServerCommand(cmd) {
    commandQueue.push(cmd);
    if (settings && settings.debugMode) ChatLib.chat(`&7[DEBUG] (Queue) Eingereiht: /${cmd}`);
}
function safeCommand(cmd) {
    // Nur Server-Kommandos ohne führenden Slash hineinlegen (ChatLib.command fügt Slash hinzu)
    queueServerCommand(cmd);
}

// Verarbeite Queue (tick = 20x pro Sekunde)
register("tick", () => {
    if (commandQueue.length === 0) return;
    const now = Date.now();
    if (now - lastCommandSentAt < COMMAND_DELAY_MS) return;
    const next = commandQueue.shift();
    if (settings && settings.debugMode) ChatLib.chat(`&7[DEBUG] (Queue) Sende jetzt: /${next}`);
    ChatLib.command(next);
    lastCommandSentAt = now;
});

// Flüchtiger Cache nur für apiOnly Modus
let apiPlayersCache = [];

function getActivePlayerList() { return API_ONLY ? apiPlayersCache : shitterData.players; }

// Lade Daten beim Start (Merge statt Überschreiben)
function loadData() {
    try {
        const dataFile = FileLib.read("Shitterlist", ".data.json");
        if (dataFile) {
            const loaded = JSON.parse(dataFile);
            shitterData = Object.assign({}, shitterData, loaded, { players: loaded.players || [] });
        }
        if (API_ONLY) {
            // Im API-Only Modus sind lokale Spieler nicht maßgeblich – vermeide verwirrende Zahl
            // Stattdessen Hinweis, dass ein API Download folgt (separate Message aus downloadFromAPI)
            slInfo("API-Only Modus – lade Spielerliste von der API...");
            // Optionale automatische Initial-Ladung wenn API konfiguriert
            if (settings.enableAPI && settings.apiUrl) {
                // Leicht verzögert um Settings initialisieren zu lassen
                setTimeout(() => {
                    downloadFromAPI(() => {});
                }, 500);
            }
        } else {
            slSuccess(`${shitterData.players.length} Spieler geladen`);
            slInfo("Modul ist geladen und funktionsfähig!");
        }
    } catch (e) {
        slWarn("Fehler beim Laden: " + e.message);
    }
}
// Hilfsfunktionen für Customization
function getPrefix() {
    return settings.showPrefix ? "&c[Shitterlist] " : "";
}

function formatMessage(message, type) {
    if (!type) type = "info";
    const prefix = getPrefix();
    const timestamp = settings.showTimestamps ? "&7[" + new Date().toLocaleTimeString() + "] " : "";
    
    var color = "&f";
    if (type === "warning") color = "&c";
    else if (type === "success") color = "&a";
    else if (type === "info") color = "&b";
    
    return timestamp + prefix + color + message;
}

// Zentraler Logger wie bei Itemlog (Channel→Setting gesteuert)
function slLog(channel, msg, level = "info") {
    // Channel → Setting Mapping
    const channelEnabled = {
        general: () => settings.showGeneralMessages,
        warning: () => settings.showWarningMessages,
        api: () => settings.showApiSyncMessages,
        debug: () => settings.debugMode
    };
    // Falls Channel nicht definiert -> standard general
    const enabledFn = channelEnabled[channel] || channelEnabled.general;
    if (!enabledFn()) return;
    ChatLib.chat(formatMessage(msg, level));
}

// Kompatibilitäts-Wrapper (bereits vorhandene Aufrufe beibehalten)
function showApiSyncMessage(msg, type = "info") {
    slLog("api", msg, type);
}
// Vereinheitlichte Kurz-Wrapper für häufige Nachrichtentypen
function slInfo(msg) { slLog("general", msg, "info"); }
function slSuccess(msg) { slLog("general", msg, "success"); }
function slWarn(msg) { slLog("warning", msg, "warning"); }
// Umlaut-Reparatur (falls Zeichen als Mojibake reinkommen)
function normalizeUmlauts(text){
    if(!text) return text;
    // Häufige UTF-8→Latin1 Doppeldekodierungen
    return text
        .replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
        .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
        .replace(/Ã¤/g, 'ä').replace(/Ã„/g, 'Ä')
        .replace(/ÃŸ/g, 'ß')
        .replace(/Ã„/g, 'Ä')
        .replace(/â€“/g, '–')
        .replace(/â€”/g, '—')
        .replace(/â€œ/g, '“').replace(/â€/g, '”')
        .replace(/â€ž/g, '„')
        .replace(/â€˜/g, '‘').replace(/â€™/g, '’')
        .replace(/â€§/g, '‧')
        .replace(/â€¦/g, '…')
        .replace(/Â°/g, '°')
        .replace(/Â /g, ' ');
}
// Wrapper die automatisch normalisieren
const _slLogOrig = slLog;
slLog = function(channel,msg,level){ _slLogOrig(channel, normalizeUmlauts(msg), level); };
// ==========================================

// Hilfsfunktionen (playNotificationSound, displayTitleWarning, etc.)

function playNotificationSound(type) {
    if (!type) type = "warning";
    if (type === "warning" && settings.warningSound) {
        World.playSound("note.pling", 1, 2);
    } else if (type === "success" && settings.successSound) {
        World.playSound("note.pling", 1, 1.5);
    }
}

// Spielt benutzerdefinierten Join-Sound (benötigt Sound Event – Resourcepack oder vorinstalliert)
function playCustomJoinSound() {
    if (!settings.customJoinSoundEnabled) return;
    const evt = (settings.customJoinSoundEventName || '').trim();
    if (!evt) return;
    // Volume 0-100 → 0-1, Pitch 50-200 → 0.5-2.0
    const vol = Math.max(0, Math.min(100, settings.customJoinSoundVolume)) / 100;
    const pitch = Math.max(50, Math.min(200, settings.customJoinSoundPitch)) / 100;
    try { World.playSound(evt, vol, pitch); } catch(e) { if (settings.debugMode) ChatLib.chat(`&7[DEBUG] CustomSound Fehler: ${e}`); }
}

// Zeigt eine große Titel-Warnung. Wandelt & Farb-Codes in § um (ChatTriggers Titles benötigen tatsächliche § Codes)
function displayTitleWarning(playerName, reason) {
    if (!reason || !reason.trim()) reason = "Unknown";
    if (!settings.showTitleWarning) {
        if (settings.debugMode) ChatLib.chat("&7[DEBUG] Title übersprungen (Einstellung aus)");
        return;
    }
    const rawTitle = "&c⚠ SHITTER DETECTED ⚠";
    const rawSubtitle = `&f${playerName} &7(${reason})`;
    const title = rawTitle.replace(/&/g, "§");
    const subtitle = rawSubtitle.replace(/&/g, "§");
    try {
        Client.showTitle(title, subtitle, 10, 80, 20); // etwas länger sichtbar (Stay 80 Ticks = 4s)
        if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Title gezeigt für &f${playerName}`);
    } catch(e) {
        ChatLib.chat(`&c[Shitterlist] Konnte Title nicht anzeigen: ${e}`);
    }
}

function shouldShowWarning(playerName) {
    if (!settings.warningCooldown || settings.warningCooldown === 0) return true;
    const now = Date.now();
    const lastWarning = shitterData.warningCooldowns[playerName.toLowerCase()] || 0;
    if (now - lastWarning >= settings.warningCooldown * 1000) {
        shitterData.warningCooldowns[playerName.toLowerCase()] = now;
        return true;
    }
    return false;
}

// Periodische Bereinigung alter Cooldown-Einträge (separat vom API Code)
let lastCooldownCleanup = 0;
register("step", () => {
    const now = Date.now();
    if (now - lastCooldownCleanup < 60 * 1000) return; // höchstens 1x pro Minute
    lastCooldownCleanup = now;
    const cooldownMs = (settings.warningCooldown || 60) * 1000;
    const threshold = now - cooldownMs * 3; // dreifache Cooldown-Länge
    let removed = 0;
    Object.keys(shitterData.warningCooldowns).forEach(k => {
        if (shitterData.warningCooldowns[k] < threshold) { delete shitterData.warningCooldowns[k]; removed++; }
    });
    if (removed > 0 && settings.debugMode) ChatLib.chat(formatMessage(`Cooldown Cleanup: ${removed} alte Einträge entfernt`, "info"));
}).setDelay(20);

function autoBackupIfNeeded() {
    if (!settings.autoBackup) return;
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (now - shitterData.lastBackup > dayInMs) {
        try {
            const backupData = JSON.stringify(shitterData, null, 2);
            const backupName = `backup_${new Date().toISOString().split('T')[0]}.json`;
            FileLib.write("Shitterlist", backupName, backupData);
            shitterData.lastBackup = now;
            if (settings.debugMode) ChatLib.chat(formatMessage(`Backup erstellt: ${backupName}`, "info"));
        } catch (e) {
            if (settings.debugMode) ChatLib.chat(formatMessage(`Backup-Fehler: ${e.message}`, "warning"));
        }
    }
}
function autoCleanupOldEntries() {
    if (!settings.autoCleanupDays || settings.autoCleanupDays <= 0) return;
    const cutoff = Date.now() - settings.autoCleanupDays * 24*60*60*1000;
    const before = shitterData.players.length;
    shitterData.players = shitterData.players.filter(p => !p.dateAdded || p.dateAdded >= cutoff);
    const removed = before - shitterData.players.length;
    if (removed > 0) { saveData(); if (settings.debugMode) slInfo(`Auto-Cleanup entfernte ${removed} Einträge`); }
}

function enhancedPlayerMatch(searchName, playerName) {
    if (!searchName || !playerName) return false;
    if (settings.caseSensitive) {
        return settings.partialMatching ? playerName.includes(searchName) : playerName === searchName;
    }
    const lowerSearch = searchName.toLowerCase();
    const lowerPlayer = playerName.toLowerCase();
    return settings.partialMatching ? lowerPlayer.includes(lowerSearch) : lowerPlayer === lowerSearch;
}

// === Fehlende Kernfunktionen nachgerüstet ===
function addShitter(username, reason) {
    if (API_ONLY) {
        return apiAddShitterDirect(username, reason);
    }
    if (!username) return;
    const name = username.trim();
    const lower = name.toLowerCase();
    const existing = shitterData.players.find(p => p.name.toLowerCase() === lower);
    if (existing) {
        // Aktualisiere nur Reason wenn neue Reason informativer ist
        if (reason && reason.length > 0 && reason !== existing.reason) {
            existing.reason = reason;
            existing.updatedAt = Date.now();
            slSuccess(`Eintrag aktualisiert: ${name}`);
            saveData();
        } else if (settings.debugMode) {
            slInfo(`Keine Änderung für ${name}`);
        }
        return existing;
    }
    if (shitterData.players.length >= settings.maxListSize) {
        slWarn(`Kann ${name} nicht hinzufügen – maximale Listengröße erreicht (${settings.maxListSize})`);
        return null;
    }
    const entry = {
        id: Math.random().toString(36).substring(2, 11),
        name: name,
        reason: reason || 'Manual',
        severity: 1,
        category: 'manual',
        source: 'local',
        dateAdded: Date.now(),
        updatedAt: Date.now()
    };
    shitterData.players.push(entry);
    saveData();
    slSuccess(`${name} hinzugefügt (${entry.reason})`);
    return entry;
}

// AutoKick Implementierung (falls noch nicht vorhanden)
function attemptAutoKick(playerName, reason, joinType){
    if (typeof settings === 'undefined' || !settings.autoPartyKick) return;
    const key = playerName.toLowerCase();
    const now = Date.now();
    if (autoKickSent[key] && now - autoKickSent[key] < 5000) {
        if (settings.debugMode) ChatLib.chat(`&7[DEBUG] AutoKick Debounce aktiv für ${playerName}`);
        return;
    }
    if (settings.debugMode) ChatLib.chat(`&7[DEBUG] AutoKick Start für ${playerName} (${joinType}) – frage Leader ab...`);
    ensurePartyLeader(leader => {
        if (!leader) { if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Kein Leader (nicht in Party?) – kein Kick für ${playerName}`); return; }
        const me = Player.getName();
        if (leader.toLowerCase() !== me.toLowerCase()) {
            if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Leader ist ${leader}, ich bin ${me} – überspringe Kick für ${playerName}`);
            return; // nur echter Leader
        }
        autoKickSent[key] = now;
        if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Sende Kick Announcement + Kick für ${playerName}`);
        sendKickAnnouncement(playerName, reason);
        scheduleKick(playerName);
    });
}

function removeShitter(username) {
    if (API_ONLY) {
    return apiRemoveShitterDirect(username);
    }
    if (!username) return false;
    const lower = username.toLowerCase();
    const before = shitterData.players.length;
    shitterData.players = shitterData.players.filter(p => p.name.toLowerCase() !== lower);
    const removed = before !== shitterData.players.length;
    if (removed) {
        saveData();
        slSuccess(`${username} entfernt`);
    } else {
        slWarn(`${username} nicht gefunden`);
    }
    return removed;
}

// === Persistenz & Utility-Funktionen ===
function saveData() {
    try {
        const snapshot = Object.assign({}, shitterData);
        if (API_ONLY) snapshot.players = []; // im API_ONLY Modus Spieler nicht persistieren
        FileLib.write("Shitterlist", ".data.json", JSON.stringify(snapshot, null, 2));
    } catch(e){ if (settings && settings.debugMode) ChatLib.chat(`&7[DEBUG] saveData Fehler: ${e.message}`); }
}

function clearList() {
    if (API_ONLY) { slWarn("API-Only: Liste kommt von API, lokales Löschen deaktiviert"); return; }
    shitterData.players = [];
    saveData();
    slSuccess("Alle Einträge gelöscht");
}

function getRandomShitter(){
    const list = getActivePlayerList();
    if (!list.length){ slWarn("Liste leer"); return; }
    const p = list[Math.floor(Math.random()*list.length)];
    ChatLib.chat(`&c[Shitterlist] &fZufällig: &c${p.name} &7(${p.reason||'Unknown'})`);
}

function checkOnlineShitters(){
    try {
        const tab = (TabList.getNames()||[]).map(n=>cleanPlayerName(n)).filter(Boolean);
        const list = getActivePlayerList();
        const found = list.filter(p => tab.some(t => t.toLowerCase() === p.name.toLowerCase()));
        if (!found.length){ slInfo("Keine gelisteten Spieler online"); return; }
        slWarn(`Online erkannt (${found.length}): ${found.map(f=>f.name).join(', ')}`);
    } catch(e){ slWarn("Online-Check Fehler: "+e.message); }
}

function exportShitterlist(){
    try {
        const arr = getActivePlayerList();
        FileLib.write("Shitterlist", "shitterlist_export.json", JSON.stringify(arr, null, 2));
        slSuccess(`Export gespeichert (${arr.length} Einträge)`);
    } catch(e){ slWarn("Export Fehler: "+e.message); }
}

function showSettingsAlternative(){ try { settings.openGUI(); } catch(e){ slWarn("GUI Fehler: "+e.message); } }

// Direktes Hinzufügen an die API im API_ONLY Modus
function apiAddShitterDirect(username, reason) {
    if (!settings.enableAPI || !settings.apiUrl) { slWarn("API nicht konfiguriert"); return null; }
    if (!username) return null;
    const lower = username.toLowerCase();
    const existing = apiPlayersCache.find(p => p.name.toLowerCase() === lower);
    if (existing) { slWarn(`${username} ist bereits eingetragen`); return existing; }
    const localTemp = {
        id: 'pending_' + Math.random().toString(36).substring(2,8),
        name: username,
        reason: reason || 'Manual',
        category: 'manual',
        severity: 1,
        dateAdded: Date.now(),
        source: 'api',
        pending: true
    };
    apiPlayersCache.push(localTemp);
    prettyOk(`Added (pending) ${username} – sende zur API...`);
    runAsync('apiAdd', () => {
        const payload = { players: [{ name: username, reason: reason || 'Manual', category: 'manual', severity: 1 }] };
        makeAPIRequest('/api/v1/players/batch', 'POST', payload, function(err, res){
            if (err || !res || !res.success) {
                prettyWarn(`Add fehlgeschlagen: ${(err && err.message)||'API Error'}`);
                // Pending markieren als Fehler
                localTemp.failed = true;
                return;
            }
            try {
                let returned = (res.data && (res.data.players || res.data.results || res.data.added)) || [];
                if (!Array.isArray(returned)) returned = [];
                if (returned.length === 0) { downloadFromAPI(()=>{}); }
                else {
                    // Ersetze den pending Eintrag
                    const first = returned[0];
                    localTemp.id = first.id;
                    localTemp.pending = false;
                    localTemp.reason = first.reason || localTemp.reason;
                    localTemp.apiReportCount = first.report_count || 1;
                    localTemp.verified = first.verified || false;
                }
                try { sendDiscordWebhook('add', username, localTemp.reason || 'Unknown'); } catch(e) {}
                prettyOk(`Add bestätigt: ${username}`);
            } catch(e){ downloadFromAPI(()=>{}); }
        });
    });
    return localTemp;
}

// Direktes Entfernen an der API (nutzt ID falls im Cache vorhanden)
function apiRemoveShitterDirect(username) {
    if (!settings.enableAPI || !settings.apiUrl) { slWarn("API nicht konfiguriert"); return false; }
    if (!username) return false;
    const lower = username.toLowerCase();
    const idx = apiPlayersCache.findIndex(p => p.name.toLowerCase() === lower);
    if (idx === -1) { slWarn(`Spieler ${username} nicht im Cache`); return false; }
    const cached = apiPlayersCache[idx];
    if (cached.id === undefined || cached.id === null) { slWarn(`Keine API ID für ${username}`); return false; }
    // Optimistisch entfernen
    apiPlayersCache.splice(idx,1);
    prettyOk(`Removed (pending) ${username}`);
    runAsync('apiRemove', () => {
        makeAPIRequest(`/api/v1/players/${cached.id}`, 'DELETE', null, function(err, res){
            if (err || !res || !res.success) {
                prettyWarn(`Remove fehlgeschlagen: ${(err && err.message)||'API Error'}`);
                // Rollback
                apiPlayersCache.push(cached);
                return;
            }
            try { sendDiscordWebhook('remove', username, cached.reason || 'Unknown'); } catch(e) {}
            prettyOk(`Remove bestätigt: ${username}`);
        });
    });
    return true;
}

// ===== Discord Webhook =====
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1404191394121121842/nko28rKRsOqPzCxbG2mnYABtH1aHwBCM0MWv4jcxAbdj_WDMbHsHGzHjBEYYo69-X6i2";
function sendDiscordWebhook(action, playerName, reason){
    if (!DISCORD_WEBHOOK_URL) return;
    try {
        const actor = Player && Player.getName ? Player.getName() : 'Unknown';
        let cleanReason = (reason && reason.trim()) ? reason.trim() : 'None';
        if (cleanReason.length > 1024) cleanReason = cleanReason.substring(0, 1021) + '...';
        const color = action === 'add' ? 0x2ecc71 : 0xe74c3c; // grün / rot
        const embed = {
            title: action === 'add' ? 'Player Added' : 'Player Removed',
            color: color,
            fields: [
                { name: 'Player', value: playerName || 'Unknown', inline: true },
                { name: 'Reason', value: cleanReason, inline: true },
                { name: 'By', value: actor, inline: true },
                { name: 'Action', value: action, inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Shitterlist' }
        };
        const payload = { embeds: [embed] };
        // Nutze Java HTTP wie bei makeAPIRequest (separat um API URL Einstellungen nicht zu beeinflussen)
        var URL = Java.type("java.net.URL");
        var HttpURLConnection = Java.type("java.net.HttpURLConnection");
    var OutputStreamWriter = Java.type("java.io.OutputStreamWriter");
        var BufferedReader = Java.type("java.io.BufferedReader");
        var InputStreamReader = Java.type("java.io.InputStreamReader");
        var StringBuilder = Java.type("java.lang.StringBuilder");
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
        var urlObj = new URL(DISCORD_WEBHOOK_URL);
        var connection = urlObj.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("User-Agent", "Shitterlist-Module/1.0");
        connection.setDoOutput(true);
    var writer = new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8);
        writer.write(JSON.stringify(payload));
        writer.flush();
        writer.close();
        // Optional lesen um Verbindung zu schließen
        try {
            var responseCode = connection.getResponseCode();
            var reader = new BufferedReader(new InputStreamReader(responseCode >=200 && responseCode <300 ? connection.getInputStream() : connection.getErrorStream(), StandardCharsets.UTF_8));
            var sb = new StringBuilder(); var line; while((line = reader.readLine()) !== null) { sb.append(line); }
            reader.close();
            if (settings.debugMode) {
                ChatLib.chat(`&7[DEBUG] Webhook ${action} RC ${responseCode}`);
                if (sb.toString().length > 0) ChatLib.chat(`&7[DEBUG] Webhook Body: ${sb.toString()}`);
                if (responseCode === 403) {
                    ChatLib.chat("&c[DEBUG] 403 Forbidden – Prüfe ob Webhook URL korrekt ist oder gelöscht wurde.");
                }
            }
        } catch(inner) { if (settings.debugMode) ChatLib.chat("&7[DEBUG] Webhook Read Fail: " + inner.message); }
    } catch(e) {
        if (settings && settings.debugMode) ChatLib.chat("&7[DEBUG] Webhook Fehler: " + e.message);
    }
}

// Diagnose: Duplikate & Herkunft zählen
function getBreakdown() {
    const list = getActivePlayerList();
    const total = list.length;
    // Strikte Markierung
    const apiBySource = list.filter(p => p.source === 'api').length;
    // Reason Heuristik
    const apiByReason = list.filter(p => (p.reason || '').startsWith('[API]')).length;
    const api = Math.max(apiBySource, apiByReason);
    const local = total - api;
    // Duplikate nach Name (case-insensitive)
    const map = {};
    list.forEach(p => {
        const k = p.name.toLowerCase();
        map[k] = (map[k] || 0) + 1;
    });
    const duplicates = Object.keys(map).filter(k => map[k] > 1);
    const mismatch = apiByReason > apiBySource;
    return { total, api, local, duplicates, apiBySource, apiByReason, mismatch };
}

// API-Abgleich: entferne alte API-Einträge die nicht mehr auf der API sind
function reconcileAPI(apiPlayerNamesLower) {
    if (API_ONLY) return; // nichts zu tun – keine lokale Speicherung
    const before = shitterData.players.length;
    shitterData.players = shitterData.players.filter(p => {
        if ((p.source === 'api' || (p.reason || '').startsWith('[API]'))) {
            return apiPlayerNamesLower.has(p.name.toLowerCase());
        }
        return true; // lokale Einträge behalten
    });
    const removed = before - shitterData.players.length;
    if (removed > 0) {
        saveData();
        showApiSyncMessage(`Bereinigt: ${removed} veraltete API-Einträge entfernt`, 'info');
    }
}

// ===== API FUNCTIONS (KOMPATIBLE VERSION) =====

// API-Datenstruktur
let apiData = {
    lastSync: 0,
    syncInProgress: false,
    apiToken: null,
    apiStatus: 'disconnected'
};

// Einfache API-Request Funktion (ohne async/await)
function makeAPIRequest(endpoint, method, data, callback) {
    if (!method) method = 'GET';
    if (!settings.enableAPI || !settings.apiUrl) {
        if (callback) callback(new Error('API ist nicht aktiviert oder URL nicht gesetzt'), null);
        return;
    }
    
    try {
        var url = settings.apiUrl + endpoint;
        // Verwende Java HTTP Client für ChatTriggers
    var URL = Java.type("java.net.URL");
    var HttpURLConnection = Java.type("java.net.HttpURLConnection");
    var BufferedReader = Java.type("java.io.BufferedReader");
    var InputStreamReader = Java.type("java.io.InputStreamReader");
    var OutputStreamWriter = Java.type("java.io.OutputStreamWriter");
    var StringBuilder = Java.type("java.lang.StringBuilder");
    var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
        
        var urlObj = new URL(url);
        var connection = urlObj.openConnection();
        
        connection.setRequestMethod(method);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("User-Agent", "ChatTriggers-Shitterlist/1.0.0");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        
        // Authentifizierung hinzufügen
        if (apiData.apiToken) {
            connection.setRequestProperty("Authorization", "Bearer " + apiData.apiToken);
        }
        
        // POST/PUT Daten senden
        if (data && (method === 'POST' || method === 'PUT')) {
            connection.setDoOutput(true);
            var writer = new OutputStreamWriter(connection.getOutputStream());
            writer.write(JSON.stringify(data));
            writer.flush();
            writer.close();
        }
        
        var responseCode = connection.getResponseCode();
        
        // Response lesen
        var reader;
        if (responseCode >= 200 && responseCode < 300) {
            reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
        } else {
            reader = new BufferedReader(new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8));
        }
        
        var response = new StringBuilder();
        var line;
        while ((line = reader.readLine()) !== null) {
            response.append(line);
        }
        reader.close();
        
        var responseText = response.toString();
        
        if (responseCode >= 200 && responseCode < 300) {
            var result = {
                status: responseCode,
                data: responseText ? JSON.parse(responseText) : null,
                success: true
            };
            if (callback) callback(null, result);
        } else {
            if (callback) callback(new Error("HTTP " + responseCode + ": " + responseText), null);
        }
        
    } catch (error) {
        if (settings.debugMode) {
            ChatLib.chat(formatMessage("API Request Error: " + error.message, "warning"));
        }
        if (callback) callback(error, null);
    }
}

// API-Status prüfen
function checkAPIStatus(callback) {
    if (!settings.enableAPI || !settings.apiUrl) {
        apiData.apiStatus = 'disconnected';
        if (callback) callback(false);
        return;
    }
    
    // Probiere zuerst den /health Endpoint, dann Fallback auf /
    makeAPIRequest('/health', 'GET', null, function(error, response) {
        if (!error && response) {
            apiData.apiStatus = 'connected';
            if (settings.debugMode) {
                ChatLib.chat(formatMessage("API-Verbindung erfolgreich (health)", "success"));
            }
            if (callback) callback(true);
        } else {
            // Fallback: Teste Root-Endpoint
            makeAPIRequest('/', 'GET', null, function(error2, response2) {
                if (!error2 && response2) {
                    apiData.apiStatus = 'connected';
                    if (settings.debugMode) {
                        ChatLib.chat(formatMessage("API-Verbindung erfolgreich (root)", "success"));
                    }
                    if (callback) callback(true);
                } else {
                    apiData.apiStatus = 'error';
                    var errorMsg = error ? error.message : 'Unknown';
                    var errorMsg2 = error2 ? error2.message : 'Unknown';
                    if (settings.debugMode) {
                        ChatLib.chat(formatMessage("API-Status-Check fehlgeschlagen: " + errorMsg + " / " + errorMsg2, "warning"));
                    }
                    if (callback) callback(false);
                }
            });
        }
    });
}

// Download von API
function downloadFromAPI(callback) {
    showApiSyncMessage("Lade Daten von API...", "info");
    
    makeAPIRequest('/api/v1/players', 'GET', null, function(error, response) {
        if (error || !response || !response.success || !response.data || !response.data.players) {
            var errorMsg = error ? error.message : 'Keine gültigen Daten von API erhalten';
            showApiSyncMessage("Download fehlgeschlagen: " + errorMsg, "warning");
            if (callback) callback(false);
            return;
        }
        
        var apiPlayers = response.data.players;
    if (API_ONLY) {
            // Ersetze flüchtigen Cache vollständig – Reason OHNE [API] Prefix
            apiPlayersCache = apiPlayers.map(p => ({
        id: p.id, // API ID
        name: p.name,
        reason: p.reason || 'API',
        category: p.category || 'general',
        severity: p.severity || 1,
        dateAdded: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        apiReportCount: p.report_count || 1,
        verified: p.verified || false,
        source: 'api'
            }));
            showApiSyncMessage("API Download: " + apiPlayersCache.length + " Spieler (API-Only)", "success");
            if (callback) callback(true);
            return;
        }
        // Normaler Merge in lokalen Speicher
        var apiSet = new Set(apiPlayers.map(p => (p.name || '').toLowerCase()));
        var newPlayers = 0;
        var updatedPlayers = 0;
        
        // Merge API-Daten mit lokalen Daten
        for (var i = 0; i < apiPlayers.length; i++) {
            var apiPlayer = apiPlayers[i];
            
            var existingPlayer = shitterData.players.find(function(p) {
                return enhancedPlayerMatch(apiPlayer.name, p.name);
            });
            
            if (existingPlayer) {
                // Update bestehender Spieler
                if (apiPlayer.severity > existingPlayer.severity || 
                    (apiPlayer.verified && !existingPlayer.verified)) {
                    existingPlayer.reason = apiPlayer.reason; // kein Prefix nötig
                    if (apiPlayer.id !== undefined) existingPlayer.id = apiPlayer.id;
                    existingPlayer.severity = apiPlayer.severity;
                    existingPlayer.verified = apiPlayer.verified;
                    existingPlayer.apiReportCount = apiPlayer.report_count;
            existingPlayer.source = 'api';
            existingPlayer.updatedAt = Date.now();
                    updatedPlayers++;
                }
            } else {
                // Neuer Spieler hinzufügen
                var newPlayer = {
                    id: apiPlayer.id, // API ID falls vorhanden
                    name: apiPlayer.name,
                    reason: apiPlayer.reason,
                    category: apiPlayer.category || 'general',
                    severity: apiPlayer.severity || 1,
                    dateAdded: apiPlayer.created_at ? new Date(apiPlayer.created_at).getTime() : Date.now(),
                    apiReportCount: apiPlayer.report_count || 1,
                    verified: apiPlayer.verified || false,
                    source: 'api',
                    id: Math.random().toString(36).substring(2, 11)
                };
                shitterData.players.push(newPlayer);
                newPlayers++;
            }
        }

    // Entferne veraltete API-Einträge, die nicht mehr auf dem Server existieren
    reconcileAPI(apiSet);
        
        if (newPlayers > 0 || updatedPlayers > 0) {
            saveData();
            showApiSyncMessage(
                "API Download: " + newPlayers + " neue, " + updatedPlayers + " aktualisierte Spieler",
                "success"
            );
        } else {
            showApiSyncMessage("Keine neuen API-Daten verfügbar", "info");
        }
        
        if (callback) callback(true);
    });
}

// Upload zur API
function uploadToAPI(callback) {
    if (API_ONLY) { if (callback) callback(true); return; }
    if (shitterData.players.length === 0) {
        showApiSyncMessage("Keine lokalen Daten zum Upload", "info");
        if (callback) callback(true);
        return;
    }
    showApiSyncMessage("Uploade lokale Daten...", "info");
    
    // Bereite lokale Daten für Upload vor
    var uploadData = shitterData.players
        .filter(function(p) { return p.source !== 'api' && !p.uploaded; })
        .map(function(p) {
            return {
                name: p.name,
                reason: p.reason,
                category: p.category || 'general',
                severity: p.severity || 1
            };
        });
    
    if (uploadData.length === 0) {
        showApiSyncMessage("Keine neuen lokalen Daten zum Upload", "info");
        if (callback) callback(true);
        return;
    }
    
    makeAPIRequest('/api/v1/players/batch', 'POST', { players: uploadData }, function(error, response) {
        if (error || !response || !response.success) {
            var errorMsg = error ? error.message : 'Unerwartete API-Antwort';
            showApiSyncMessage("Upload fehlgeschlagen: " + errorMsg, "warning");
            if (callback) callback(false);
            return;
        }
        
        var results = response.data.results || response.data;
        
        showApiSyncMessage(
            "Upload erfolgreich: " + (results.added || 0) + " neue, " + (results.updated || 0) + " aktualisierte Spieler",
            "success"
        );
        
        // Markiere als uploaded
        shitterData.players.forEach(function(p) {
            if (p.source !== 'api' && !p.uploaded) {
                p.uploaded = true;
            }
        });
        saveData();
        
        if (callback) callback(true);
    });
}

// Sync mit API
function syncWithAPI() {
    // Für Auto-Sync call ohne force prüfen wir autoSync Flag extern
    if (!settings.enableAPI) return;
    if (apiData.syncInProgress) {
        showApiSyncMessage("Sync bereits im Gange...", "info");
        return;
    }
    apiData.syncInProgress = true;
    
    // Erst API-Verbindung testen
    checkAPIStatus(function(isOnline) {
        if (!isOnline) {
            showApiSyncMessage("API nicht verfügbar - Sync abgebrochen", "warning");
            apiData.syncInProgress = false;
            return;
        }
        
        // Download neuer Daten von API
        if (settings.downloadFromAPI) {
            downloadFromAPI(function(success) {
                if (success && settings.uploadToAPI) {
                    // Upload lokaler Daten zur API
                    uploadToAPI(function() {
                        apiData.lastSync = Date.now();
                        showApiSyncMessage("API-Synchronisation abgeschlossen", "success");
                        apiData.syncInProgress = false;
                    });
                } else {
                    apiData.lastSync = Date.now();
                    showApiSyncMessage("API-Synchronisation abgeschlossen", "success");
                    apiData.syncInProgress = false;
                }
            });
        } else if (settings.uploadToAPI) {
            uploadToAPI(function() {
                apiData.lastSync = Date.now();
                showApiSyncMessage("API-Synchronisation abgeschlossen", "success");
                apiData.syncInProgress = false;
            });
        } else {
            apiData.lastSync = Date.now();
            showApiSyncMessage("API-Synchronisation abgeschlossen", "success");
            apiData.syncInProgress = false;
        }
    });
}

// Hilfsfunktion für API-Status-Farben
function getAPIStatusColor() {
    switch (apiData.apiStatus) {
        case 'connected': return '&a';
        case 'error': return '&c';
        case 'disconnected': return '&7';
        default: return '&e';
    }
}

// ===== END API FUNCTIONS =====

// Hilfsfunktion um Spielernamen zu bereinigen
function cleanPlayerName(name) {
    // Entferne alle Minecraft-Farbcodes
    let cleaned = name.replace(/§[0-9a-fk-or]/g, "").trim();
    
    // Entferne Level-Zahlen in eckigen Klammern: [250] -> ""
    cleaned = cleaned.replace(/^\[[0-9]+\]\s*/, "");
    
    // Entferne ALLES nach dem eigentlichen Namen
    // Finde das erste Leerzeichen gefolgt von einem Sonderzeichen oder (
    cleaned = cleaned.replace(/\s+[^\w].*$/, "");
    
    // Entferne auch Klammern mit Zahlen: " (2)" etc.
    cleaned = cleaned.replace(/\s*\([^)]*\).*$/, "");
    
    // Falls noch Sonderzeichen am Ende sind, entferne alles ab dem ersten Sonderzeichen
    cleaned = cleaned.replace(/[^\w\d_-]+.*$/, "");
    
    return cleaned.trim();
}

// Basis-Funktionen
function isShitter(username) {
    if (settings.debugMode) {
        ChatLib.chat(`&7[DEBUG] Checking if ${username} is a shitter...`);
        ChatLib.chat(`&7[DEBUG] Players in list: ${getActivePlayerList().map(p => p.name).join(', ')}`);
    }
    const clean = cleanPlayerName(username);
    const list = getActivePlayerList();
    if (API_ONLY && list.length === 0 && settings.enableAPI && settings.apiUrl) {
        if (!isShitter._lastTrigger || Date.now() - isShitter._lastTrigger > 3000) {
            isShitter._lastTrigger = Date.now();
            showApiSyncMessage('Leerer Cache – lade API Daten...', 'info');
            downloadFromAPI(()=>{});
        }
    }
    const result = list.some(p => p.name.toLowerCase() === clean.toLowerCase());
    if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Result: ${result}`);
    return result;
}

// (entfernte alte addShitter/removeShitter Implementierungen – neue Versionen oben)

function checkShitter(username) {
    var shitterInfo = getActivePlayerList().find(function(p) {
        return p.name.toLowerCase() === username.toLowerCase();
    });
    if (shitterInfo) {
        var date = shitterInfo.dateAdded ? new Date(shitterInfo.dateAdded).toLocaleDateString() : "Unknown";
        ChatLib.chat("&c[Shitterlist] &f" + username + " ist ein Shitter");
        ChatLib.chat("&7Grund: &c" + (shitterInfo.reason || "Unknown"));
        ChatLib.chat("&7Hinzugefügt: &7" + date);
    } else {
        ChatLib.chat("&a[Shitterlist] &f" + username + " ist nicht in der Liste");
    }
}

function showList(pageArg) {
    const list = getActivePlayerList();
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    let page = parseInt(pageArg || '1');
    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    slLog("general", `Shitter (${list.length}) Seite ${page}/${totalPages}:`, "info");
    if (list.length === 0) { ChatLib.chat("&7Keine Shitter in der Liste"); return; }
    const start = (page-1)*pageSize;
    const slice = list.slice(start, start+pageSize);
    slice.forEach(player => {
        ChatLib.chat(`&c#${player.id !== undefined ? player.id : '?'} &f${player.name} &7- ${player.reason}`);
    });
    if (page < totalPages) {
        const next = page+1;
        const msg = new Message(
            new TextComponent(`&7Weiter: &e/sl list ${next}`)
                .setHover("show_text", `&aKlicke um Seite ${next} anzuzeigen`)
                .setClick("run_command", `/sl list ${next}`)
        );
        ChatLib.chat(msg);
    }
}

function searchShitters(searchTerm) {
    const matches = shitterData.players.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matches.length === 0) {
        ChatLib.chat(`&c[Shitterlist] &fKeine Treffer für "${searchTerm}"`);
        return;
    }
    
    ChatLib.chat(`&a[Shitterlist] &fSuchergebnisse für "${searchTerm}" (${matches.length}):`);
    matches.forEach(player => {
        const date = new Date(player.dateAdded).toLocaleDateString();
        ChatLib.chat(`&c• ${player.name} &7(${player.reason}) - ${date}`);
    });
}


function getShitterStats() {
    const list = getActivePlayerList();
    if (list.length === 0) {
        ChatLib.chat("&c[Shitterlist] &fKeine Statistiken verfügbar");
        return;
    }
    
    // Grund-Statistiken
    const reasonStats = {};
    list.forEach(player => {
        reasonStats[player.reason] = (reasonStats[player.reason] || 0) + 1;
    });
    
    // Neuester und ältester Eintrag
    const dates = list.map(p => p.dateAdded).sort((a, b) => a - b);
    const oldest = new Date(dates[0]).toLocaleDateString();
    const newest = new Date(dates[dates.length - 1]).toLocaleDateString();
    
    ChatLib.chat("&c[Shitterlist] &f&lStatistiken:");
    ChatLib.chat(`&7Gesamtanzahl: &c${list.length}`);
    ChatLib.chat(`&7Ältester Eintrag: &7${oldest}`);
    ChatLib.chat(`&7Neuester Eintrag: &7${newest}`);
    ChatLib.chat("&7Top Gründe:");
    
    Object.entries(reasonStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([reason, count]) => {
            ChatLib.chat(`&7• ${reason}: &c${count}`);
        });
}


function addShitterWithCategory(username, category, reason) {
    const categories = {
        "toxic": "Toxisches Verhalten",
        "scammer": "Scammer/Betrüger", 
        "griefer": "Griefer",
        "cheater": "Cheater/Hacker",
        "spammer": "Spammer",
        "troll": "Troll",
        "annoying": "Nerviger Spieler"
    };
    
    const fullReason = categories[category] ? `${categories[category]}: ${reason}` : `${category}: ${reason}`;
    return addShitter(username, fullReason);
}

// ===== Updater (Self-update) =====
// Hinweis: Im GitHub-Repo liegen die Dateien im Root, NICHT in einem Unterordner "Shitterlist".
// Die bisherigen Pfade /Shitterlist/index.js führten zu 404 und verhinderten Updates.
const UPDATER_BASE_URL = "https://raw.githubusercontent.com/cOnfusi0n1/Shitterlist/main"; // Raw Root des Repos
const UPDATER_TARGET_FILE = "index.js";              // Lokale Datei innerhalb des Module-Ordners
const UPDATER_REMOTE_PATH = "/index.js";             // Remote Pfad im Repo (Root)
const UPDATER_METADATA_FILE = "metadata.json";        // Lokale Metadata
const UPDATER_METADATA_REMOTE_PATH = "/metadata.json"; // Remote Pfad im Repo (Root)

let updaterState = {
    lastCheck: 0,
    checking: false
};

function fetchRemoteText(url, callback) {
    runAsync('updaterFetch', () => {
        try {
            var URL = Java.type("java.net.URL");
            var HttpURLConnection = Java.type("java.net.HttpURLConnection");
            var BufferedReader = Java.type("java.io.BufferedReader");
            var InputStreamReader = Java.type("java.io.InputStreamReader");
            var StandardCharsets = Java.type("java.nio.charset.StandardCharsets");
            var StringBuilder = Java.type("java.lang.StringBuilder");

            var urlObj = new URL(url);
            var connection = urlObj.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("User-Agent", "ChatTriggers-Shitterlist-Updater/1.0.0");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);

            var responseCode = connection.getResponseCode();
            var reader = new BufferedReader(new InputStreamReader(
                responseCode >= 200 && responseCode < 300 ? connection.getInputStream() : connection.getErrorStream(),
                StandardCharsets.UTF_8
            ));
            var sb = new StringBuilder();
            var line;
            while ((line = reader.readLine()) !== null) sb.append(line).append("\n");
            reader.close();

            if (responseCode >= 200 && responseCode < 300) {
                callback && callback(null, sb.toString());
            } else {
                callback && callback(new Error("HTTP " + responseCode), null);
            }
        } catch (e) {
            callback && callback(e, null);
        }
    });
}

function compareVersions(a, b) {
    const pa = (a || "").split('.').map(n=>parseInt(n)||0);
    const pb = (b || "").split('.').map(n=>parseInt(n)||0);
    for (let i=0;i<Math.max(pa.length,pb.length);i++){
        const da = pa[i]||0, db = pb[i]||0;
        if (da>db) return 1;
        if (da<db) return -1;
    }
    return 0;
}

function checkForUpdate(callback) {
    if (updaterState.checking) { callback && callback(false); return; }
    updaterState.checking = true;
    const remoteIndexUrlPrimary = UPDATER_BASE_URL + UPDATER_REMOTE_PATH;            // Erwartet /index.js
    const remoteMetaUrlPrimary  = UPDATER_BASE_URL + UPDATER_METADATA_REMOTE_PATH;   // Erwartet /metadata.json
    const legacyIndexUrl = UPDATER_BASE_URL + "/Shitterlist/index.js";             // Alter (falscher) Pfad – Fallback falls jemand Repo umstellt
    const legacyMetaUrl  = UPDATER_BASE_URL + "/Shitterlist/metadata.json";

    const finish = (remoteIndexContent, remoteMetaContent, warnPrefix) => {
        updaterState.checking = false;
        updaterState.lastCheck = Date.now();
        if (!remoteIndexContent) {
            slWarn((warnPrefix||"Updater") + ": Remote index.js nicht abrufbar");
            return callback && callback(false, null, null);
        }
        let localIndex = (FileLib.read("Shitterlist", UPDATER_TARGET_FILE) || "");
        if (!remoteMetaContent) {
            // Nur Datei-Diff möglich
            const hasUpdateFallback = localIndex !== remoteIndexContent;
            return callback && callback(hasUpdateFallback, remoteIndexContent, null);
        }
        let remoteVersion = "";
        let localVersion = "";
        try { remoteVersion = JSON.parse(remoteMetaContent).version || ""; } catch(_) {}
        try { localVersion = JSON.parse(FileLib.read("Shitterlist", UPDATER_METADATA_FILE) || "{}").version || ""; } catch(_) {}
        const diffFile = localIndex !== remoteIndexContent;
        const diffVersion = compareVersions(remoteVersion, localVersion) > 0;
        // Sicherheitslogik: Bevorzuge Versionsvergleich; reine Datei-Diffs ohne Versionssprung nur im Debug anzeigen
        const hasUpdate = diffVersion || (diffFile && remoteVersion === localVersion && settings.debugMode);
        if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Updater: localV=${localVersion} remoteV=${remoteVersion} diffV=${diffVersion} diffFile=${diffFile} => update=${hasUpdate}`);
        callback && callback(hasUpdate, remoteIndexContent, remoteMetaContent);
    };

    // Primärpfad abrufen
    fetchRemoteText(remoteIndexUrlPrimary, (errIdx, idxContent) => {
        if (errIdx || !idxContent) {
            if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Updater Primärpfad fehlgeschlagen (${errIdx ? errIdx.message : 'leer'}), versuche Legacy-Pfad...`);
            // Fallback Legacy
            fetchRemoteText(legacyIndexUrl, (errLegacyIdx, legacyIdxContent) => {
                if (errLegacyIdx || !legacyIdxContent) {
                    updaterState.checking = false;
                    updaterState.lastCheck = Date.now();
                    slWarn("Update-Check fehlgeschlagen (alle Pfade)");
                    return callback && callback(false, null, null);
                }
                // Legacy Meta
                fetchRemoteText(legacyMetaUrl, (errLegacyMeta, legacyMetaContent) => {
                    finish(legacyIdxContent, errLegacyMeta ? null : legacyMetaContent, "Updater(Fallback)");
                });
            });
            return;
        }
        // Primäre Metadata
        fetchRemoteText(remoteMetaUrlPrimary, (errMeta, metaContent) => {
            finish(idxContent, errMeta ? null : metaContent, null);
        });
    });
}

function performSelfUpdate(forceInstall, cb) {
    checkForUpdate((hasUpdate, remoteIndexContent, remoteMetaContent) => {
        if (!forceInstall && !hasUpdate) {
            slInfo("Kein Update verfügbar");
            return cb && cb(false);
        }
        if (!remoteIndexContent) {
            slWarn("Remote index.js fehlt");
            return cb && cb(false);
        }
        try {
            // Nur schreiben wenn sich Inhalt wirklich unterscheidet oder forceInstall aktiv ist
            const current = FileLib.read("Shitterlist", UPDATER_TARGET_FILE) || "";
            if (forceInstall || current !== remoteIndexContent) {
                FileLib.write("Shitterlist", UPDATER_TARGET_FILE, remoteIndexContent);
            }
            if (remoteMetaContent) {
                const curMeta = FileLib.read("Shitterlist", UPDATER_METADATA_FILE) || "";
                if (forceInstall || curMeta !== remoteMetaContent) {
                    FileLib.write("Shitterlist", UPDATER_METADATA_FILE, remoteMetaContent);
                }
            }
            slSuccess("Update installiert. Lade neu...");
            setTimeout(()=>ChatLib.command("ct load", true), 1000);
            cb && cb(true);
        } catch(e){
            slWarn("Update fehlgeschlagen: " + e.message);
            cb && cb(false);
        }
    });
}

function triggerManualUpdateCheck() {
    slInfo("Prüfe auf Updates..."); // wird durch normalizeUmlauts abgesichert
    checkForUpdate((hasUpdate) => {
        if (hasUpdate) {
            slLog("general", "Update verfügbar – klicke zum Installieren", "info");
            try {
                const msg = new Message(
                    new TextComponent("&a[Jetzt aktualisieren]")
                        .setHover("show_text", "&aKlicken um das Update zu installieren")
                        .setClick("run_command", "/sl update-now")
                );
                ChatLib.chat(msg);
            } catch(_) {}
        } else {
            slInfo("Kein Update verfügbar");
        }
    });
}

function startAutoUpdater() {
    if (!settings.autoUpdaterEnabled) return;
    const intervalMs = Math.max(5, settings.updateCheckInterval) * 60 * 1000;

    register("step", () => {
        const now = Date.now();
        if (now - updaterState.lastCheck < intervalMs) return;
        if (updaterState.checking) return;

        checkForUpdate((hasUpdate) => {
            if (hasUpdate) {
                if (settings.autoUpdaterEnabled && settings.autoInstallUpdates) {
                    performSelfUpdate(true);
                } else {
                    // Immer Hinweis ausgeben
                    slLog("general", "Update verfügbar – klicke zum Installieren", "info");
                    try {
                        const msg = new Message(
                            new TextComponent("&a[Jetzt aktualisieren]")
                                .setHover("show_text", "&aKlicken um das Update zu installieren")
                                .setClick("run_command", "/sl update-now")
                        );
                        ChatLib.chat(msg);
                    } catch(_) {}
                }
            } else if (settings.debugMode) {
                ChatLib.chat(formatMessage("Updater: kein Update gefunden", "info"));
            }
        });
    }).setDelay(60); // prüfen im Minuten-Takt
}
// ===== End Updater =====

// Lade Daten beim Start
loadData();

// Auto-Sync Timer
function startAutoSync() {
    if (!settings.enableAPI || !settings.autoSync || settings.syncInterval === 0) {
        return;
    }
    
    var intervalMs = settings.syncInterval * 60 * 1000; // Minuten zu Millisekunden
    
    register("step", function() {
        var now = Date.now();
        if (now - apiData.lastSync >= intervalMs) {
            syncWithAPI();
        }
    }).setDelay(60); // Prüfe jede Minute
}

// Starte Auto-Sync wenn aktiviert
if (settings.enableAPI && settings.autoSync) {
    setTimeout(function() {
        startAutoSync();
        if (settings.debugMode) {
            ChatLib.chat(formatMessage("Auto-Sync gestartet", "info"));
        }
    }, 5000); // 5 Sekunden Verzögerung für Initialisierung
}

// Updater: initialer Check + Timer
setTimeout(() => {
    if (settings.checkUpdatesOnLoad) {
        triggerManualUpdateCheck();
    }
    startAutoUpdater();
}, 3000);

// Chat Filter Event (einfache Version ohne Settings-Abhängigkeit)
register("chat", (username, message, event) => {
    if (!settings.enabled || !settings.chatFilter) return;
    
    const cleanUsername = username.replace(/§[0-9a-fk-or]/g, "");
    
    if (isShitter(cleanUsername)) {
        cancel(event);
        if (settings.debugMode) {
            ChatLib.chat(`&c[Shitterlist] &7Nachricht von ${cleanUsername} gefiltert`);
        }
    }
}).setCriteria("${username}: ${message}");


// Chat Event für Party/Dungeon Warnungen
register("chat", (message) => {
    if (!settings.enabled) return;
    if (settings.debugMode) ChatLib.chat("&7[DEBUG] Chat message: " + message);

    let joinType = null;
    let detectedName = null;

    const partyJoinMatch = message.match(/^(?:Party > )?(?:\[[^\]]+\]\s*)?([A-Za-z0-9_]{1,16}) joined the party\.$/);
    if (partyJoinMatch && settings.partyWarnings) {
        joinType = "party";
        detectedName = partyJoinMatch[1];
    }

    if (!joinType && message.includes("joined the dungeon group!") && settings.dungeonWarnings) {
        const dungeonMatch = message.match(/^(.+?) joined the dungeon group!/);
        if (dungeonMatch) {
            joinType = "dungeon";
            detectedName = dungeonMatch[1].trim().replace(/^Party Finder > /, "");
        }
    }

    if (joinType && detectedName) {
        const playerName = detectedName;                       // Vereinheitlicht
        // SELF-SUPPRESS: Wenn der Spieler selbst (der lokale Client) in der Liste ist und joint,
        // dann soll SEIN Client keine Kick-Nachricht senden (sonst doppelt).
        if (playerName.toLowerCase() === Player.getName().toLowerCase()) {
            if (settings.debugMode) ChatLib.chat("&7[DEBUG] Eigenen (self) Join erkannt – keine AutoKick Nachricht");
            return;
        }

        if (isShitter(playerName)) {
            // Reason bestimmen
            const info = getActivePlayerList().find(p => p.name.toLowerCase() === playerName.toLowerCase());
            const reason = info ? (info.reason || "Unknown") : "Unknown";

            // ALTEN Block entfernen/auskommentieren:
            // if (settings.autoPartyKick && (joinType === "party" || joinType === "dungeon")) { ... }

            // NEU: Leader-basierter AutoKick (ruft ensurePartyLeader → /p list)
            if (joinType === "party" || joinType === "dungeon") {
                attemptAutoKick(playerName, reason, joinType);
            }

            if (shouldShowWarning(playerName)) {
                if (joinType === "party") {
                    slLog("warning", `${playerName} ist ein bekannter Shitter! ${reason}`, "warning");
                    displayTitleWarning(playerName, reason);
                    if (settings.warningSound) World.playSound("note.pling", 1, 1);
                } else {
                    slLog("warning", `&c${playerName} &7ist im Dungeon-Team! Grund: &c${reason}`, "warning");
                    displayTitleWarning(playerName, reason);
                    if (settings.warningSound) World.playSound("note.pling", 1, 0.8);
                }
                playCustomJoinSound();
            }
        }
    }
}).setCriteria("${message}");

// Hauptbefehl
register("command", (...args) => {
    if (!args || args.length === 0) {
        slLog("general", "Befehle:", "info");
        ChatLib.chat("&e/sl add <name> [reason] &7- Spieler hinzufügen");
        ChatLib.chat("&e/sl remove <name> &7- Spieler entfernen");
        ChatLib.chat("&e/sl check <name> &7- Status prüfen");
        ChatLib.chat("&e/sl list &7- Liste anzeigen");
        ChatLib.chat("&e/sl search <term> &7- In Liste suchen");
        ChatLib.chat("&e/sl random &7- Zufälligen Shitter anzeigen");
        ChatLib.chat("&e/sl stats &7- Statistiken anzeigen");
        ChatLib.chat("&e/sl online &7- Online Shitter prüfen");
        ChatLib.chat("&e/sl export &7- Liste exportieren");
        ChatLib.chat("&e/sl players &7- Klickbare Spielerliste");
        ChatLib.chat("&e/sl quick <category> <name> &7- Schnell kategorisieren");
        ChatLib.chat("&e/sl toggle <setting> &7- Einstellung umschalten");
        ChatLib.chat("&6=== API-Befehle ===");
        ChatLib.chat("&e/sl sync &7- Manueller API-Sync");
        ChatLib.chat("&e/sl upload &7- Lokale Daten hochladen");
        ChatLib.chat("&e/sl download &7- API-Daten herunterladen");
        ChatLib.chat("&e/sl apistatus &7- API-Status prüfen");
        ChatLib.chat("&e/sl testdetection <name> &7- Teste Spieler-Erkennung");
        ChatLib.chat("&e/sl testmessage <msg> &7- Teste Chat-Pattern");
        ChatLib.chat("&e/sl testkick <name> &7- Teste Party-Kick-Befehle");
        ChatLib.chat("&7Alternativ: /slconfig für Einstellungen");
        ChatLib.chat("&7Für Hilfe: /sl help");
        return;
    }
    
    const subcommand = args[0].toLowerCase();
    
    switch (subcommand) {
        case "add":
            if (args.length < 3) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl add <username> <Grund>");
                ChatLib.chat("&c[Shitterlist] &f<Grund> darf nicht leer sein!");
                return;
            }
            if (API_ONLY) { ChatLib.chat("&7[Shitterlist] &fSende direkt zur API..."); }
            const reason = args.slice(2).join(" ").trim();
            if (!reason) {
                ChatLib.chat("&c[Shitterlist] &fGrund darf nicht leer sein!");
                return;
            }
            const added = addShitter(args[1], reason);
            try {
                if (added && reason.toLowerCase() === 'cheating') {
                    const msg = new Message(
                        new TextComponent(`&6[Shitterlist-Report] &eKlicke hier um /wdr ${added.name} auszuführen`)
                            .setHover("show_text", `&cReport ${added.name} via /wdr`)
                            .setClick("run_command", `/wdr ${added.name}`)
                    );
                    ChatLib.chat(msg);
                }
            } catch(e) { if (settings.debugMode) ChatLib.chat(`&7[DEBUG] WDR Click Msg Fehler: ${e.message}`); }
            break;
            
        case "remove":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl remove <username>");
                return;
            }
            removeShitter(args[1]);
            break;
            
        case "check":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl check <username>");
                return;
            }
            checkShitter(args[1]);
            break;
            
        case "list":
            showList(args[1]);
            break;
            
        case "search":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl search <suchbegriff>");
                return;
            }
            const searchTerm = args.slice(1).join(" ");
            searchShitters(searchTerm);
            break;
            
        case "random":
            getRandomShitter();
            break;
            
        case "stats":
            getShitterStats();
            break;
            
        case "online":
            checkOnlineShitters();
            break;
            
        case "export":
            exportShitterlist();
            break;

        case "debugcache":
            ChatLib.chat("&6[Shitterlist] &fCache Debug:");
            ChatLib.chat(`&7API_ONLY: ${API_ONLY}`);
            ChatLib.chat(`&7Cache Größe: &a${apiPlayersCache.length}`);
            ChatLib.chat(`&7Namen (bis 20): &f${apiPlayersCache.slice(0,20).map(p=>p.name).join(', ') || 'leer'}`);
            break;
            
        case "quick":
            if (args.length < 3) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl quick <kategorie> <name> [grund]");
                ChatLib.chat("&7Kategorien: toxic, scammer, griefer, cheater, spammer, troll, annoying");
                return;
            }
            const category = args[1].toLowerCase();
            const quickName = args[2];
            const quickReason = args.slice(3).join(" ") || "Keine Angabe";
            addShitterWithCategory(quickName, category, quickReason);
            break;
            
        case "clear":
            ChatLib.chat("&c[Shitterlist] &fWirklich alle Einträge löschen? Verwende '/sl confirmclear'");
            break;
            
        case "confirmclear":
            clearList();
            break;
            
        case "addcurrent":
            try {
                const tabList = TabList.getNames();
                if (tabList && tabList.length > 1) {
                    const myName = Player.getName();
                    const firstColumn = tabList.slice(0, 20);
                    
                    const otherPlayers = firstColumn.filter(name => {
                        const cleanName = cleanPlayerName(name);
                        return cleanName !== myName && cleanName.length > 0 && !cleanName.includes("Players");
                    });
                    
                    if (otherPlayers.length > 0) {
                        const targetName = cleanPlayerName(otherPlayers[0]);
                        addShitter(targetName, "Quick Add");
                        ChatLib.chat(`&a[Shitterlist] &7Ersten Spieler hinzugefügt: ${targetName}`);
                    } else {
                        ChatLib.chat("&c[Shitterlist] &fKeine anderen Spieler gefunden");
                    }
                } else {
                    ChatLib.chat("&c[Shitterlist] &fKeine Tab-Liste verfügbar");
                }
            } catch (e) {
                ChatLib.chat("&c[Shitterlist] &fFehler: " + e.message);
            }
            break;
            
        case "players":
            try {
                const tabList = TabList.getNames();
                if (tabList && tabList.length > 0) {
                    ChatLib.chat("&a[Shitterlist] &f&lKlickbare Spielerliste:");
                    ChatLib.chat("&7Klicke zum Hinzufügen/Entfernen");
                    ChatLib.chat("&7" + "=".repeat(35));
                    
                    const myName = Player.getName();
                    const firstColumn = tabList.slice(0, 20);
                    let playerCount = 0;
                    
                    firstColumn.forEach((name) => {
                        const cleanName = cleanPlayerName(name);
                        if (cleanName !== myName && cleanName.length > 0 && !cleanName.includes("Players")) {
                            playerCount++;
                            const isShitterStatus = isShitter(cleanName) ? "&c●" : "&a●";
                            const statusText = isShitter(cleanName) ? "VON LISTE ENTFERNEN" : "ZUR LISTE HINZUFÜGEN";
                            
                            const message = new Message(
                                `${isShitterStatus} `,
                                new TextComponent(`&f${cleanName}`)
                                    .setHover("show_text", `&e${statusText}\n&7Player: &f${cleanName}`)
                                    .setClick("run_command", isShitter(cleanName) ? `/sl remove ${cleanName}` : `/sl add ${cleanName} Manual`)
                            );
                            ChatLib.chat(message);
                        }
                    });
                    
                    ChatLib.chat("&7" + "=".repeat(35));
                    ChatLib.chat(`&7Gefunden: &a${playerCount} &7Spieler`);
                } else {
                    ChatLib.chat("&c[Shitterlist] &fKeine Tab-Liste verfügbar");
                }
            } catch (e) {
                ChatLib.chat("&c[Shitterlist] &fFehler: " + e.message);
            }
            break;
            
        // === API-BEFEHLE ===
        case "sync":
            if (!settings.enableAPI) {
                ChatLib.chat("&c[Shitterlist] &fAPI ist nicht aktiviert! Setze apiUrl in den Settings");
                return;
            }
            showApiSyncMessage("Starte API-Synchronisation...", "info");
            syncWithAPI();
            break;
        case "breakdown":
            const bd = getBreakdown();
            ChatLib.chat(`&6[Shitterlist] &fZähl-Diagnose:`);
            ChatLib.chat(`&7Gesamt: &a${bd.total}`);
            ChatLib.chat(`&7API: &a${bd.api} &7| Lokal: &a${bd.local}`);
            if (bd.duplicates.length > 0) {
                ChatLib.chat(`&cDuplikate (${bd.duplicates.length}): &7${bd.duplicates.join(', ')}`);
            } else {
                ChatLib.chat(`&7Duplikate: &aKeine`);
            }
            if (bd.mismatch && !API_ONLY) {
                ChatLib.chat(`&eHinweis: &7${bd.apiByReason} Einträge haben [API]-Reason aber nur ${bd.apiBySource} sind als source=api markiert. Re-Sync (/sl download) oder manuell korrigieren.`);
            }
            if (API_ONLY) ChatLib.chat(`&7Modus: &aNur API (keine lokalen Einträge gespeichert)`);
            break;
        case "reclass":
            let changed = 0;
            shitterData.players.forEach(p => {
                if ((p.reason || '').startsWith('[API]') && p.source !== 'api') {
                    p.source = 'api';
                    changed++;
                }
            });
            if (changed > 0) { saveData(); ChatLib.chat(`&a[Shitterlist] &f${changed} Einträge reklassifiziert (source=api gesetzt).`);} else { ChatLib.chat('&7[Shitterlist] &fKeine Änderungen.'); }
            break;
            
        case "upload":
            if (!settings.enableAPI) {
                ChatLib.chat("&c[Shitterlist] &fAPI ist nicht aktiviert! Setze apiUrl in den Settings");
                return;
            }
            if (API_ONLY) { ChatLib.chat("&c[Shitterlist] &fAPI-Only – Upload deaktiviert"); return; }
            showApiSyncMessage("Upload lokaler Daten...", "info");
            uploadToAPI(function(success) {
                if (success) {
                    ChatLib.chat("&a[Shitterlist] &fUpload abgeschlossen");
                } else {
                    ChatLib.chat("&c[Shitterlist] &fUpload fehlgeschlagen");
                }
            });
            break;
            
        case "download":
            if (!settings.enableAPI) {
                ChatLib.chat("&c[Shitterlist] &fAPI ist nicht aktiviert! Setze apiUrl in den Settings");
                return;
            }
            showApiSyncMessage("Download von API...", "info");
            downloadFromAPI(function(success) {
                if (success) {
                    ChatLib.chat("&a[Shitterlist] &fDownload abgeschlossen");
                } else {
                    ChatLib.chat("&c[Shitterlist] &fDownload fehlgeschlagen");
                }
            });
            break;
            
        case "apistatus":
            ChatLib.chat("&7[Shitterlist] &fAPI-Status:");
            ChatLib.chat("&7URL: " + (settings.apiUrl || 'Nicht gesetzt'));
            ChatLib.chat("&7Status: " + getAPIStatusColor() + apiData.apiStatus);
            ChatLib.chat("&7Auto-Sync: " + (settings.autoSync ? '&aAktiviert' : '&cDeaktiviert'));
            ChatLib.chat("&7Modus: &aNur API (keine lokalen Daten)");           
            ChatLib.chat("&7Letzter Sync: " + (apiData.lastSync > 0 ? 
                new Date(apiData.lastSync).toLocaleString() : '&7Noch nie'));
            
            // Test Verbindung
            if (settings.enableAPI && settings.apiUrl) {
                checkAPIStatus(function(isOnline) {
                    ChatLib.chat("&7Verbindungstest: " + (isOnline ? '&a✓ Online' : '&c✗ Offline'));
                });
            } else {
                ChatLib.chat("&7Verbindungstest: &7Nicht konfiguriert");
            }
            break;
            
        case "toggle":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl toggle <setting>");
                ChatLib.chat("&7Verfügbare Settings:");
                ChatLib.chat("&7• enabled, debugMode, showJoinWarnings, partyWarnings");
                ChatLib.chat("&7• dungeonWarnings, showTitleWarning, warningSound, autoPartyKick");
                ChatLib.chat("&7• autoUpdaterEnabled, autoinstallupdates, checkUpdatesOnLoad");
                ChatLib.chat("&7• api aktiviert, autoSync, downloadFromAPI, uploadToAPI");
                return;
            }
            const setting = args[1].toLowerCase();
            
            switch (setting) {
                case "enabled":
                    settings.enabled = !settings.enabled;
                    ChatLib.chat("&a[Shitterlist] &fAktiviert: " + (settings.enabled ? "&aJa" : "&cNein"));
                    break;
                case "debugmode":
                case "debug":
                    settings.debugMode = !settings.debugMode;
                    ChatLib.chat("&a[Shitterlist] &fDebug-Modus: " + (settings.debugMode ? "&aJa" : "&cNein"));
                    break;
                case "showjoinwarnings":
                case "joinwarnings":
                    settings.showJoinWarnings = !settings.showJoinWarnings;
                    ChatLib.chat("&a[Shitterlist] &fJoin-Warnungen: " + (settings.showJoinWarnings ? "&aJa" : "&cNein"));
                    break;
                case "partywarnings":
                case "party":
                    settings.partyWarnings = !settings.partyWarnings;
                    ChatLib.chat("&a[Shitterlist] &fParty-Warnungen: " + (settings.partyWarnings ? "&aJa" : "&cNein"));
                    break;
                case "dungeonwarnings":
                case "dungeon":
                    settings.dungeonWarnings = !settings.dungeonWarnings;
                    ChatLib.chat("&a[Shitterlist] &fDungeon-Warnungen: " + (settings.dungeonWarnings ? "&aJa" : "&cNein"));
                    break;
                case "showtitlewarning":
                case "titlewarning":
                case "title":
                    settings.showTitleWarning = !settings.showTitleWarning;
                    ChatLib.chat("&a[Shitterlist] &fTitle-Warnungen: " + (settings.showTitleWarning ? "&aJa" : "&cNein"));
                    break;
                case "warningsound":
                case "sound":
                    settings.warningSound = !settings.warningSound;
                    ChatLib.chat("&a[Shitterlist] &fWarnsound: " + (settings.warningSound ? "&aJa" : "&cNein"));
                    break;
                case "autopartykick":
                case "partykick":
                    settings.autoPartyKick = !settings.autoPartyKick;
                    ChatLib.chat("&a[Shitterlist] &fAuto Party Kick: " + (settings.autoPartyKick ? "&aJa" : "&cNein"));
                    break;
                case "enableapi":
                case "api":
                    settings.enableAPI = !settings.enableAPI;
                    ChatLib.chat("&a[Shitterlist] &fAPI aktiviert: " + (settings.enableAPI ? "&aJa" : "&cNein"));
                    break;
                case "autoinstallupdates":
                case "autoinstall":
                    settings.autoInstallUpdates = !settings.autoInstallUpdates;
                    ChatLib.chat("&a[Shitterlist] &fAutomatisch installieren: " + (settings.autoInstallUpdates ? "&aJa" : "&cNein"));
                    break;
                // apionly Toggle entfernt – permanenter API-Only Modus
                default:
                    ChatLib.chat("&c[Shitterlist] &fUnbekannte Einstellung: " + setting);
                    break;
            }
            break;
            
        case "reloadgui":
        case "reloadsettings":
            ChatLib.chat("&a[Shitterlist] &fReload der Vigilance Settings...");
            try {
                ChatLib.command('ct load', true);
                ChatLib.chat("&a[Shitterlist] &7Module neu geladen! Verwende /slconfig");
            } catch (e) {
                ChatLib.chat("&c[Shitterlist] &7Module-Reload fehlgeschlagen: " + e.message);
            }
            break;
            
        case "settings":
        case "config":
        case "cfg":
            showSettingsAlternative();
            break;
            
        case "testdetection":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl testdetection <username>");
                return;
            }
            const testUsername = args[1];
            ChatLib.chat("&6[Shitterlist] &f=== TEST DETECTION ===");
            ChatLib.chat("&7Testing username: " + testUsername);
            ChatLib.chat("&7Settings enabled: " + settings.enabled);
            ChatLib.chat("&7Show Join Warnings: " + settings.showJoinWarnings);
            ChatLib.chat("&7Players in list: " + shitterData.players.length);
            ChatLib.chat("&7Player names: " + getActivePlayerList().map(p => p.name).join(", "));
            
            const testResult = isShitter(testUsername);
            ChatLib.chat("&7isShitter result: " + testResult);
            
            if (testResult) {
                ChatLib.chat("&a✓ Detection would work!");
                // Simuliere die Join-Warnung
                const shitterInfo = shitterData.players.find(p => p.name.toLowerCase() === testUsername.toLowerCase());
                const reason = shitterInfo ? shitterInfo.reason : "Unknown";
                ChatLib.chat("&c[SIMULATION] &c" + testUsername + " &7ist ein bekannter Shitter! Grund: &c" + reason);
            } else {
                ChatLib.chat("&c✗ Detection failed!");
            }
            break;
            
        case "testmessage":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl testmessage <message>");
                return;
            }
            const testMessage = args.slice(1).join(" ");
            ChatLib.chat("&6[Shitterlist] &f=== TEST MESSAGE ===");
            ChatLib.chat("&7Simuliere Chat-Nachricht: " + testMessage);
            
            // Simuliere das Chat-Event
            if (settings.enabled) {
                if (settings.debugMode) {
                    ChatLib.chat("&7[DEBUG] Chat message: " + testMessage);
                }
                
                // Test Dungeon Pattern - Verwende dieselbe Logik wie im echten Event
                if (testMessage.includes("joined the dungeon group!") && settings.dungeonWarnings) {
                    const dungeonMatch = testMessage.match(/^(.+?) joined the dungeon group!/);
                    if (dungeonMatch) {
                        let playerName = dungeonMatch[1].trim();
                        
                        // Entferne "Party Finder > " am Anfang falls vorhanden
                        playerName = playerName.replace(/^Party Finder > /, "");
                        
                        if (settings.debugMode) {
                            ChatLib.chat("&7[DEBUG] Raw dungeon name: '" + dungeonMatch[1] + "'");
                            ChatLib.chat("&7[DEBUG] Cleaned dungeon name: '" + playerName + "'");
                        }
                        
                        if (isShitter(playerName)) {
                            const shitterInfo = shitterData.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
                            const reason = shitterInfo ? shitterInfo.reason : "Unknown";
                            ChatLib.chat(`&c[DUNGEON WARNUNG] &c${playerName} &7ist im Dungeon-Team! Grund: &c${reason}`);
                        } else {
                            ChatLib.chat("&a[TEST] " + playerName + " ist nicht in der Shitterliste");
                        }
                    } else {
                        ChatLib.chat("&7[TEST] Kein Dungeon-Pattern erkannt");
                    }
                } else {
                    ChatLib.chat("&7[TEST] Kein Dungeon-Pattern erkannt oder Dungeon-Warnungen deaktiviert");
                }
            } else {
                ChatLib.chat("&7[TEST] Shitterlist ist deaktiviert");
            }
            break;
            
        case "testkick":
            if (args.length < 2) {
                ChatLib.chat("&c[Shitterlist] &fUsage: /sl testkick <playername>");
                return;
            }
            const kickPlayerName = args[1];
            ChatLib.chat("&6[Shitterlist] &f=== TEST KICK COMMANDS ===");
            ChatLib.chat("&7Teste alle Kick-Befehle (Rate Limited) für: " + kickPlayerName);
            // ALT: ChatLib.command(`party kick ${kickPlayerName}`);
            safeCommand(`party kick ${kickPlayerName}`);
            break;
            
        case "update-now":
            performSelfUpdate(true);
            break;

        case "checkupdate":
            triggerManualUpdateCheck();
            break;

        default:
            ChatLib.chat("&c[Shitterlist] &fUnbekannter Befehl. Verwende /sl für Hilfe");
            break;
    }
}).setName("shitterlist").setAliases(["sl"]);

// Settings GUI Befehl
register("command", () => {
    settings.openGUI();
}).setName("slconfig").setAliases(["shitterlistconfig", "slgui"]);

// Test-Befehl um zu prüfen, ob das Modul überhaupt lädt
register("command", () => {
    ChatLib.chat("&a[Shitterlist] &fModul ist geladen und funktionsfähig!");
    ChatLib.chat("&7Verwende /slconfig für Settings");
}).setName("sltest");


// Game Unload Event
register("gameUnload", () => {
    saveData();
    if (settings.debugMode) {
        ChatLib.chat("&a[Shitterlist] &7Daten gespeichert");
    }
});

// === NEU: Suppression für /pl Ausgabe ===
let suppressPartyListOutput = false;
let partyListSuppressExpire = 0;

function beginPartyListSuppression(ms = 2000) {
    suppressPartyListOutput = true;
    partyListSuppressExpire = Date.now() + ms;
}

// (falls noch nicht vorhanden) Leader-Handling Variablen:
let partyLeader = null;
let partyInfoPending = false;
let partyInfoLastUpdate = 0;
let partyInfoCallbacks = [];

// Aktualisiere ensurePartyLeader (nur diesen Block ersetzen / erweitern)
function ensurePartyLeader(cb) {
    const now = Date.now();
    // Cache 10s
    if (partyLeader && (now - partyInfoLastUpdate) < 10000) {
        if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Leader Cache: ${partyLeader}`);
        return cb(partyLeader);
    }
    partyInfoCallbacks.push(cb);
    if (partyInfoPending) return;

    partyInfoPending = true;
    beginPartyListSuppression(2000);
    if (settings.debugMode) ChatLib.chat("&7[DEBUG] Sende (queued) /p list für Leader-Ermittlung");
    // ALT: ChatLib.command("p list");
    safeCommand("p list");

    const sentAt = Date.now();
    setTimeout(() => {
        if (partyInfoPending) {
            partyInfoPending = false;
            suppressPartyListOutput = false;
            if (settings.debugMode) ChatLib.chat("&7[DEBUG] Leader Timeout – keine Antwort");
            const cbs = partyInfoCallbacks.slice(); partyInfoCallbacks = [];
            cbs.forEach(f => f(partyLeader));
        }
    }, 1600);
}

// Verbesserter Listener für Party-List-Ausgabe
register("chat", (rawLine, event) => {
    // Prüfe Suppression Timeout
    if (suppressPartyListOutput && Date.now() > partyListSuppressExpire) {
        suppressPartyListOutput = false;
    }

    // Farbcodes entfernen
    const line = rawLine.replace(/§./g, "").trim();

    // Debug optional
    if (partyInfoPending && settings.debugMode) {
        ChatLib.chat("&8[PLDBG] " + line);
    }

    // Match Leader / Owner
    // Erweitertes Pattern: erlaubt Farben, Rang-Tags vor dem Namen, Punkt am Ende optional
    const leaderMatch = line.match(/^Party (?:Leader|Owner):\s+(?:\[[^\]]+\]\s*)*([A-Za-z0-9_]{1,16})(?:\s|$)/);
    if (leaderMatch) {
        partyLeader = leaderMatch[1];
        partyInfoLastUpdate = Date.now();
        partyInfoPending = false;
        suppressPartyListOutput = false;
        if (settings.debugMode) ChatLib.chat("&7[DEBUG] Party-Leader erkannt: " + partyLeader);
        const cbs = partyInfoCallbacks.slice(); partyInfoCallbacks = [];
        partyInfoCallbacks = [];
        cbs.forEach(f => f(partyLeader));
    } else if (/^Party (?:Leader|Owner):/.test(line)) {
        // Fallback: extrahiere letzten Token ohne Rang Symbole
        const raw = line.replace(/^Party (?:Leader|Owner):\s+/, "");
        const parts = raw.split(/\s+/).filter(Boolean);
        if (parts.length) {
            const candidate = parts[parts.length-1].replace(/[^A-Za-z0-9_]/g, "");
            if (candidate.length >=1 && candidate.length <= 16) {
                partyLeader = candidate;
                partyInfoLastUpdate = Date.now();
                partyInfoPending = false;
                suppressPartyListOutput = false;
                if (settings.debugMode) ChatLib.chat("&7[DEBUG] Party-Leader (Fallback) erkannt: " + partyLeader);
                const cbs2 = partyInfoCallbacks.slice(); partyInfoCallbacks = [];
                partyInfoCallbacks = [];
                cbs2.forEach(f => f(partyLeader));
            }
        }
    }

    // Optional: Wenn „You are not in a party.“ kommt -> kein Leader
    if (/^You are not in a party\./.test(line)) {
        partyLeader = null;
        partyInfoLastUpdate = Date.now();
        partyInfoPending = false;
        suppressPartyListOutput = false;
        if (settings.debugMode) ChatLib.chat("&7[DEBUG] Nicht in Party");
        const cbs = partyInfoCallbacks.slice(); partyInfoCallbacks = [];
        partyInfoCallbacks = [];
        cbs.forEach(f => f(null));
    }

    // Unterdrückbare Zeilen (nur während Suppression)
    if (suppressPartyListOutput) {
        if (
            /^Party (?:Leader|Owner): /.test(line) ||
            /^Party Moderators?: /.test(line) ||
            /^Party Members?: /.test(line) ||
            /^Party Finder Queue: /.test(line) ||
            /^You are not in a party\./.test(line)
        ) {
            cancel(event);
            if (settings.debugMode) ChatLib.chat("&7[DEBUG] /p list Zeile unterdrückt");
        }
    }
}).setCriteria("${rawLine}");
