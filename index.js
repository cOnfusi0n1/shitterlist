// Shitterlist Loader – minimal. Alle Logik liegt in den Modul-Dateien.
import './settings';
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

// Kein weiterer Code hier – vermeidet doppelte Event- & Command-Registrierungen.
