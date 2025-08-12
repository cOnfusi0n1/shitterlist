// Shitterlist Loader – minimal. Alle Logik liegt in den Modul-Dateien.
import './settings';
import './core';
import './data';
import './api';
import './updater';
import './visual';
import './party';
import './maintenance';
import './commands';
import './events';

try { ChatLib.chat('&7[Shitterlist] &fModule geladen'); } catch(_) {}

// Kein weiterer Code hier – vermeidet doppelte Event- & Command-Registrierungen.
