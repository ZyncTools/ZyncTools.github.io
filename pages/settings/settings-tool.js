/**
 * @file Settings Page
 * Application settings with theme, animations, shortcuts, etc.
 * @module pages/settings/settings-tool
 */

import { createToolbar } from '../../../components/toolbar.js';
import { showToast, showSuccess, showError, showInfo } from '../../../components/toast.js';
import { themeManager } from '../../../utils/theme.js';
import { getSettings, saveSettings, exportData, importData, clearAllData, getStorageInfo } from '../../../utils/history.js';
import { formatFileSize } from '../../../utils/file.js';

/**
 * Settings Page Component
 */
export class SettingsTool {
  constructor({ tool, state, utils }) {
    this.tool = tool;
    this.state = state;
    this.utils = utils;
    this.settings = getSettings();
    this.container = null;
  }
  
  async render() {
    this.container = document.getElementById('app');
    this.container.innerHTML = this.getHTML();
    
    this.bindElements();
    this.bindEvents();
    this.loadSettings();
  }
  
  getHTML() {
    return `
      <div class="tool-page settings-tool">
        <header class="tool-header">
          <div class="tool-header-content">
            <div class="tool-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 1 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0-1.51 1H15a1.65 1.65 0 0 0-1 1.51V15a1.65 1.65 0 0 0 1.51 1z"></path>
              </svg>
            </div>
            <div class="tool-info">
              <h1>Settings</h1>
              <p>Customize your ZyncPDF experience</p>
            </div>
          </div>
        </header>
        
        <main class="tool-main settings-main">
          <div class="settings-container">
            <nav class="settings-nav" aria-label="Settings categories">
              <ul>
                <li><button class="settings-nav-item active" data-tab="appearance" aria-selected="true">Appearance</button></li>
                <li><button class="settings-nav-item" data-tab="behavior" aria-selected="false">Behavior</button></li>
                <li><button class="settings-nav-item" data-tab="shortcuts" aria-selected="false">Shortcuts</button></li>
                <li><button class="settings-nav-item" data-tab="data" aria-selected="false">Data</button></li>
                <li><button class="settings-nav-item" data-tab="about" aria-selected="false">About</button></li>
              </ul>
            </nav>
            
            <div class="settings-content">
              <!-- Appearance -->
              <section class="settings-panel active" id="panel-appearance" role="tabpanel" aria-labelledby="tab-appearance">
                <h2>Appearance</h2>
                
                <div class="settings-group">
                  <h3>Theme</h3>
                  <div class="theme-options">
                    <label class="theme-option" data-theme="light">
                      <input type="radio" name="theme" value="light">
                      <div class="theme-preview light">
                        <div class="preview-header"></div>
                        <div class="preview-content"></div>
                      </div>
                      <span>Light</span>
                    </label>
                    <label class="theme-option" data-theme="dark">
                      <input type="radio" name="theme" value="dark">
                      <div class="theme-preview dark">
                        <div class="preview-header"></div>
                        <div class="preview-content"></div>
                      </div>
                      <span>Dark</span>
                    </label>
                    <label class="theme-option" data-theme="system">
                      <input type="radio" name="theme" value="system">
                      <div class="theme-preview system">
                        <div class="preview-header"></div>
                        <div class="preview-content"></div>
                      </div>
                      <span>System</span>
                    </label>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Animations</h3>
                  <label class="setting-item">
                    <span class="setting-label">Enable animationsToggle">Animations</span>
                    <span class="setting-description">Enable smooth transitions and animations</span>
                    <button class="toggle" id="animations-toggle" role="switch" aria-checked="true"></button>
                  </label>
                </div>
                
                <div class="settings-group">
                  <h3>Reduced Motion</h3>
                  <label class="setting-item">
                    <span class="setting-label">Reduce Motion</span>
                    <span class="setting-description">Minimize animations for accessibility</span>
                    <button class="toggle" id="reduced-motion-toggle" role="switch" aria-checked="false"></button>
                  </label>
                </div>
                
                <div class="settings-group">
                  <h3>Font Size</h3>
                  <div class="font-size-options">
                    <button class="font-size-btn" data-size="small">Small</button>
                    <button class="font-size-btn active" data-size="medium">Medium</button>
                    <button class="font-size-btn" data-size="large">Large</button>
                  </div>
                </div>
              </section>
              
              <!-- Behavior -->
              <section class="settings-panel" id="panel-behavior" role="tabpanel" aria-labelledby="tab-behavior" hidden>
                <h2>Behavior</h2>
                
                <div class="settings-group">
                  <h3>File Handling</h3>
                  <label class="setting-item">
                    <span class="setting-label">Auto-save history</span>
                    <span class="setting-description">Automatically save conversion history</span>
                    <button class="toggle" id="auto-save-toggle" role="switch" aria-checked="true"></button>
                  </label>
                  <label class="setting-item">
                    <span class="setting-label">Remember recent files</span>
                    <span class="setting-description">Keep track of recently used files</span>
                    <button class="toggle" id="recent-files-toggle" role="switch" aria-checked="true"></button>
                  </label>
                  <label class="setting-item">
                    <span class="setting-label">Show file size estimates</span>
                    <span class="setting-description">Display estimated output sizes</span>
                    <button class="toggle" id="size-estimates-toggle" role="switch" aria-checked="true"></button>
                  </label>
                </div>
                
                <div class="settings-group">
                  <h3>Notifications</h3>
                  <label class="setting-item">
                    <span class="setting-label">Show notifications</span>
                    <span class="setting-description">Display toast notifications for actions</span>
                    <button class="toggle" id="notifications-toggle" role="switch" aria-checked="true"></button>
                  </label>
                  <label class="setting-item">
                    <span class="setting-label">Notification duration</span>
                    <span class="setting-description">How long notifications stay visible</span>
                    <select id="notification-duration" class="setting-select">
                      <option value="3000">3 seconds</option>
                      <option value="5000" selected>5 seconds</option>
                      <option value="8000">8 seconds</option>
                      <option value="0">Never auto-dismiss</option>
                    </select>
                  </label>
                </div>
                
                <div class="settings-group">
                  <h3>Keyboard Shortcuts</h3>
                  <label class="setting-item">
                    <span class="setting-label">Enable shortcuts</span>
                    <span class="setting-description">Enable global keyboard shortcuts</span>
                    <button class="toggle" id="shortcuts-toggle" role="switch" aria-checked="true"></button>
                  </label>
                </div>
              </section>
              
              <!-- Shortcuts -->
              <section class="settings-panel" id="panel-shortcuts" role="tabpanel" aria-labelledby="tab-shortcuts" hidden>
                <h2>Keyboard Shortcuts</h2>
                <p class="shortcuts-intro">Press <kbd>⌘K</kbd> or <kbd>Ctrl+K</kbd> to open the command palette</p>
                
                <div class="shortcuts-list">
                  <div class="shortcut-category">
                    <h3>Global</h3>
                    <ul class="shortcuts">
                      <li><kbd>⌘K</kbd><span>Open Command Palette</span></li>
                      <li><kbd>⌘,</kbd><span>Open Settings</span></li>
                      <li><kbd>⌘/</kbd><span>Show Shortcuts</span></li>
                      <li><kbd>⌘⇧T</kbd><span>Toggle Theme</span></li>
                      <li><kbd>⌘⇧A</kbd><span>Toggle Animations</span></li>
                      <li><kbd>Escape</kbd><span>Close Modal / Cancel</span></li>
                    </ul>
                  </div>
                  
                  <div class="shortcut-category">
                    <h3>File Operations</h3>
                    <ul class="shortcuts">
                      <li><kbd>⌘N</kbd><span>New / Home</span></li>
                      <li><kbd>⌘⇧O</kbd><span>Open Recent Files</span></li>
                      <li><kbd>⌘S</kbd><span>Save / Download</span></li>
                    </ul>
                  </div>
                  
                  <div class="shortcut-category">
                    <h3>PDF Editor</h3>
                    <ul class="shortcuts">
                      <li><kbd>⌘Z</kbd><span>Undo</span></li>
                      <li><kbd>⌘⇧Z</kbd><span>Redo</span></li>
                      <li><kbd>⌘←/→</kbd><span>Previous/Next Page</span></li>
                      <li><kbd>⌘+/-</kbd><span>Zoom In/Out</span></li>
                      <li><kbd>⌘0</kbd><span>Reset Zoom</span></li>
                    </ul>
                  </div>
                </div>
              </section>
              
              <!-- Data -->
              <section class="settings-panel" id="panel-data" role="tabpanel" aria-labelledby="tab-data" hidden>
                <h2>Data Management</h2>
                
                <div class="settings-group">
                  <h3>Storage</h3>
                  <div class="storage-info" id="storage-info">
                    <div class="storage-bar">
                      <div class="storage-bar-fill" id="storage-bar-fill"></div>
                    </div>
                    <div class="storage-details">
                      <span id="storage-used">0 B</span> / <span id="storage-total">5 MB</span>
                    </div>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>History & Favorites</h3>
                  <div class="data-actions">
                    <button class="btn btn-secondary" id="export-data">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Export Data
                    </button>
                    <button class="btn btn-secondary" id="import-data">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Import Data
                    </button>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Clear Data</h3>
                  <p class="warning-text">Warning: These actions cannot be undone.</p>
                  <div class="data-actions danger">
                    <button class="btn btn-secondary" id="clear-history">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      Clear History
                    </button>
                    <button class="btn btn-danger" id="clear-all-data">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                      Clear All Data
                    </button>
                  </div>
                </div>
              </section>
              
              <!-- About -->
              <section class="settings-panel" id="panel-about" role="tabpanel" aria-labelledby="tab-about" hidden>
                <h2>About ZyncPDF</h2>
                
                <div class="about-info">
                  <div class="about-logo">
                    <img src="/logo.png" alt="ZyncPDF" width="64" height="64">
                  </div>
                  <h3>ZyncPDF</h3>
                  <p class="version">Version 2.0.0</p>
                  <p class="description">Open-source, privacy-first PDF toolkit. All processing happens in your browser - no uploads, no tracking.</p>
                  
                  <div class="about-links">
                    <a href="https://github.com/alanjollyc/ZyncPDF.git" target="_blank" rel="noopener noreferrer" class="about-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.44 5.44 0 0 0 17.44 7C14.08 7 11 10.24 11 13.77a3.37 3.37 0 0 0 .94 2.61C13.08 17.76 14.56 17 16 17h5v3"></path></svg>
                      GitHub
                    </a>
                    <a href="https://x.com/ZyncPDF" target="_blank" rel="noopener noreferrer" class="about-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                      Twitter
                    </a>
                    <a href="mailto:adm.converto@gmail.com" class="about-link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      Email
                    </a>
                  </div>
                  
                  <div class="about-credits">
                    <h4>Built with</h4>
                    <ul>
                      <li>PDF-lib - PDF manipulation</li>
                      <li>PDF.js - PDF rendering</li>
                      <li>Inter font - Typography</li>
                      <li>Font Awesome - Icons</li>
                    </ul>
                  </div>
                  
                  <div class="license">
                    <p>Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">GNU AGPL v3.0</a></p>
                    <p>&copy; 2025 ZyncPDF Team</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    `;
  }
  
  bindElements() {
    this.navItems = this.container.querySelectorAll('.settings-nav-item');
    this.panels = this.container.querySelectorAll('.settings-panel');
    
    // Toggles
    this.animationsToggle = this.container.querySelector('#animations-toggle');
    this.reducedMotionToggle = this.container.querySelector('#reduced-motion-toggle');
    this.autoSaveToggle = this.container.querySelector('#auto-save-toggle');
    this.recentFilesToggle = this.container.querySelector('#recent-files-toggle');
    this.sizeEstimatesToggle = this.container.querySelector('#size-estimates-toggle');
    this.notificationsToggle = this.container.querySelector('#notifications-toggle');
    this.shortcutsToggle = this.container.querySelector('#shortcuts-toggle');
    
    // Selects
    this.notificationDuration = this.container.querySelector('#notification-duration');
    
    // Font size buttons
    this.fontSizeBtns = this.container.querySelectorAll('.font-size-btn');
    
    // Theme options
    this.themeOptions = this.container.querySelectorAll('.theme-option input');
    
    // Action buttons
    this.exportDataBtn = this.container.querySelector('#export-data');
    this.importDataBtn = this.container.querySelector('#import-data');
    this.clearHistoryBtn = this.container.querySelector('#clear-history');
    this.clearAllDataBtn = this.container.querySelector('#clear-all-data');
    
    // File input for import
    this.importInput = document.createElement('input');
    this.importInput.type = 'file';
    this.importInput.accept = '.json';
    this.importInput.style.display = 'none';
    this.container.appendChild(this.importInput);
  }
  
  bindEvents() {
    // Navigation
    this.navItems.forEach(item => {
      item.addEventListener('click', () => this.switchTab(item.dataset.tab));
    });
    
    // Theme
    this.themeOptions.forEach(input => {
      input.addEventListener('change', () => this.setTheme(input.value));
    });
    
    // Toggles
    this.animationsToggle.addEventListener('click', () => this.toggleSetting('animations', this.animationsToggle));
    this.reducedMotionToggle.addEventListener('click', () => this.toggleSetting('reducedMotion', this.reducedMotionToggle));
    this.autoSaveToggle.addEventListener('click', () => this.toggleSetting('autoSave', this.autoSaveToggle));
    this.recentFilesToggle.addEventListener('click', () => this.toggleSetting('recentFiles', this.recentFilesToggle));
    this.sizeEstimatesToggle.addEventListener('click', () => this.toggleSetting('sizeEstimates', this.sizeEstimatesToggle));
    this.notificationsToggle.addEventListener('click', () => this.toggleSetting('notifications', this.notificationsToggle));
    this.shortcutsToggle.addEventListener('click', () => this.toggleSetting('keyboardShortcuts', this.shortcutsToggle));
    
    // Selects
    this.notificationDuration.addEventListener('change', () => this.saveSetting('notificationDuration', this.notificationDuration.value));
    
    // Font size
    this.fontSizeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setFontSize(btn.dataset.size));
    });
    
    // Data actions
    this.exportDataBtn.addEventListener('click', () => this.exportData());
    this.importDataBtn.addEventListener('click', () => this.importInput.click());
    this.importInput.addEventListener('change', (e) => this.importData(e.target.files[0]));
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
  }
  
  loadSettings() {
    // Apply current theme
    const theme = this.settings.theme || 'system';
    this.container.querySelector(`input[name="theme"][value="${theme}"]`)?.checked = true;
    
    // Apply toggles
    this.updateToggle(this.animationsToggle, this.settings.animations !== false);
    this.updateToggle(this.reducedMotionToggle, this.settings.reducedMotion === true);
    this.updateToggle(this.autoSaveToggle, this.settings.autoSave !== false);
    this.updateToggle(this.recentFilesToggle, this.settings.recentFiles !== false);
    this.updateToggle(this.sizeEstimatesToggle, this.settings.sizeEstimates !== false);
    this.updateToggle(this.notificationsToggle, this.settings.notifications !== false);
    this.updateToggle(this.shortcutsToggle, this.settings.keyboardShortcuts !== false);
    
    // Notification duration
    this.notificationDuration.value = this.settings.notificationDuration || '5000';
    
    // Font size
    this.setFontSize(this.settings.fontSize || 'medium');
    
    // Update storage info
    this.updateStorageInfo();
  }
  
  switchTab(tabId) {
    this.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
      item.setAttribute('aria-selected', item.dataset.tab === tabId);
    });
    
    this.panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
      panel.hidden = panel.id !== `panel-${tabId}`;
    });
  }
  
  setTheme(theme) {
    themeManager.setTheme(theme);
    this.saveSetting('theme', theme);
  }
  
  toggleSetting(key, toggle) {
    const enabled = !toggle.getAttribute('aria-checked') === 'true';
    this.updateToggle(toggle, enabled);
    this.saveSetting(key, enabled);
  }
  
  updateToggle(toggle, enabled) {
    toggle.setAttribute('aria-checked', enabled);
    toggle.classList.toggle('on', enabled);
  }
  
  setFontSize(size) {
    this.fontSizeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    document.documentElement.style.setProperty('--font-size-base', 
      size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem');
    this.saveSetting('fontSize', size);
  }
  
  saveSetting(key, value) {
    this.settings[key] = value;
    saveSettings(this.settings);
  }
  
  updateStorageInfo() {
    const info = getStorageInfo();
    const used = info.total;
    const total = 5 * 1024 * 1024; // 5MB estimate
    const percent = Math.min((used / total) * 100, 100);
    
    this.container.querySelector('#storage-bar-fill').style.width = `${percent}%`;
    this.container.querySelector('#storage-used').textContent = formatFileSize(used);
    this.container.querySelector('#storage-total').textContent = formatFileSize(total);
  }
  
  async exportData() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zyncpdf-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Data exported successfully');
  }
  
  async importData(file) {
    if (!file) return;
    
    const text = await file.text();
    if (importData(text)) {
      showSuccess('Data imported successfully');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showError('Failed to import data');
    }
  }
  
  clearHistory() {
    if (confirm('Clear all conversion history? This cannot be undone.')) {
      localStorage.removeItem('zyncpdf_history');
      showSuccess('History cleared');
    }
  }
  
  clearAllData() {
    if (confirm('Clear ALL data including settings, history, and favorites? This cannot be undone.')) {
      if (confirm('Are you absolutely sure?')) {
        clearAllData();
        showSuccess('All data cleared');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  }
  
  destroy() {
    this.container.innerHTML = '';
  }
}

export default SettingsTool;