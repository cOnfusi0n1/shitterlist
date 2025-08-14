// visual.js – SINGLE IMPLEMENTATION (titles & sounds)
import { settings } from '../settings';
import { slInfo } from './core';

// Notification sound helper
export function playNotificationSound(type='warning') {
  try {
    if (type === 'warning' && settings.warningSound) World.playSound('note.pling', 1, 2);
    else if (type === 'success' && settings.successSound) World.playSound('note.pling', 1, 1.5);
  } catch (e) { if (settings.debugMode) slInfo('Sound Fehler: ' + e.message); }
}

// Custom join sound
export function playCustomJoinSound() {
  if (!settings.customJoinSoundEnabled) return;
  const evt = (settings.customJoinSoundEventName || '').trim(); if (!evt) return;
  const vol = Math.max(0, Math.min(100, settings.customJoinSoundVolume)) / 100;
  const pitch = Math.max(50, Math.min(200, settings.customJoinSoundPitch)) / 100;
  try { World.playSound(evt, vol, pitch); } catch (e) { if (settings.debugMode) slInfo('CustomSound Fehler: ' + e.message); }
}

// Title warning with cooldown
let lastTitleAt = 0;
export function displayTitleWarning(playerName, reason) {
  if (!reason || !reason.trim()) reason = 'Unknown';
  if (!settings.showTitleWarning) { if (settings.debugMode) ChatLib.chat('&7[DEBUG] Title übersprungen (Einstellung aus)'); return; }
  const now = Date.now();
  if (settings.warningCooldown && now - lastTitleAt < settings.warningCooldown * 1000) return;
  lastTitleAt = now;
  const rawTitle = '&c⚠ SHITTER DETECTED ⚠';
  const rawSubtitle = `&f${playerName} &7(${reason})`;
  const title = rawTitle.replace(/&/g, '§');
  const subtitle = rawSubtitle.replace(/&/g, '§');
  try { Client.showTitle(title, subtitle, 10, 80, 20); if (settings.debugMode) ChatLib.chat(`&7[DEBUG] Title gezeigt für &f${playerName}`); } catch (e) { slInfo('Title Fehler: ' + e.message); }
}

const __g_visual=(typeof globalThis!=='undefined')?globalThis:(typeof global!=='undefined'?global:this);
try { Object.assign(__g_visual, { displayTitleWarning, playCustomJoinSound, playNotificationSound }); } catch(_) {}
