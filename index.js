// Shitterlist Loader – minimal. Alle Logik liegt in den Modul-Dateien.
import { settings } from './settings';
import './utils/core';
import './utils/data';
import './utils/api';
import './updater';
import './utils/visual';
import './utils/party';
import './maintenance';
import './commands';
import './utils/events';

try { ChatLib.chat('&7[Shitterlist] &fModule geladen'); } catch(_) {}

// Start Auto-Updater if enabled and optionally check on load
try {
	if (typeof startAutoUpdater === 'function' && settings.autoUpdaterEnabled) startAutoUpdater();
	if (settings.checkUpdatesOnLoad && typeof checkForUpdate === 'function') {
		checkForUpdate((has,_m,_lv,_rv)=>{ if(has && settings.autoInstallUpdates && typeof performSelfUpdate==='function') performSelfUpdate(true); });
	}
} catch(_) {}

