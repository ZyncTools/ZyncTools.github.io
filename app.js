/**
 * @file ZyncPDF Main Application Entry Point
 * SPA initialization, routing, and global state management
 * @module app
 */

import { themeManager } from './utils/theme.js';
import { initCommandPalette, getCommandPalette } from './components/command-palette.js';
import { showToast, showSuccess, showError, showInfo } from './components/toast.js';
import { initStorage, getHistory, getRecentFiles, getSettings, saveSettings } from './utils/history.js';
import { getFileInfo, formatFileSize } from './utils/file.js';

// ============================================
// GLOBAL STATE
// ============================================
const state = {
  currentTool: null,
  currentToolInstance: null,
  history: [],
  recentFiles: [],
  favorites: [],
  settings: {},
  isLoading: false
};

// ============================================
// TOOL REGISTRY
// ============================================
const TOOL_REGISTRY = {
  'merge-pdf': () => import('./pages/merge/merge-tool.js').then(m => m.default),
  'split-pdf': () => import('./pages/split/split-tool.js').then(m => m.default),
  'compress-pdf': () => import('./pages/compress/compress-tool.js').then(m => m.default),
  'rotate-pdf': () => import('./pages/rotate/rotate-tool.js').then(m => m.default),
  'pdf-to-png': () => import('./pages/convert/pdf-to-image-tool.js').then(m => m.default),
  'pdf-to-jpeg': () => import('./pages/convert/pdf-to-image-tool.js').then(m => m.default),
  'pdf-to-txt': () => import('./pages/convert/pdf-to-text-tool.js').then(m => m.default),
  'png-to-pdf': () => import('./pages/convert/image-to-pdf-tool.js').then(m => m.default),
  'jpeg-to-pdf': () => import('./pages/convert/image-to-pdf-tool.js').then(m => m.default),
  'txt-to-pdf': () => import('./pages/convert/text-to-pdf-tool.js').then(m => m.default),
  'pdf-text-editor': () => import('./pages/editor/pdf-editor-tool.js').then(m => m.default),
  'remove-pages': () => import('./pages/extract/remove-pages-tool.js').then(m => m.default),
  'extract-pages': () => import('./pages/extract/extract-pages-tool.js').then(m => m.default),
  'sort-pages': () => import('./pages/extract/sort-pages-tool.js').then(m => m.default),
  'add-password': () => import('./pages/security/password-tool.js').then(m => m.default),
  'remove-password': () => import('./pages/security/password-tool.js').then(m => m.default),
  'remove-metadata': () => import('./pages/metadata/metadata-tool.js').then(m => m.default),
  'edit-metadata': () => import('./pages/metadata/metadata-tool.js').then(m => m.default),
  'flatten-pdf': () => import('./pages/security/flatten-tool.js').then(m => m.default),
  'compare-pdfs': () => import('./pages/compare/compare-tool.js').then(m => m.default),
  'word-to-pdf': () => import('./pages/office/office-to-pdf-tool.js').then(m => m.default),
  'excel-to-pdf': () => import('./pages/office/office-to-pdf-tool.js').then(m => m.default),
  'ppt-to-pdf': () => import('./pages/office/office-to-pdf-tool.js').then(m => m.default),
  'html-to-pdf': () => import('./pages/convert/html-to-pdf-tool.js').then(m => m.default),
  'markdown-to-pdf': () => import('./pages/convert/markdown-to-pdf-tool.js').then(m => m.default),
  'webp-to-pdf': () => import('./pages/convert/image-to-pdf-tool.js').then(m => m.default),
  'heif-to-pdf': () => import('./pages/convert/image-to-pdf-tool.js').then(m => m.default),
  'svg-to-pdf': () => import('./pages/convert/svg-tool.js').then(m => m.default),
  'svg-to-png': () => import('./pages/convert/svg-tool.js').then(m => m.default),
  'svg-to-jpeg': () => import('./pages/convert/svg-tool.js').then(m => m.default),
  'webp-to-png': () => import('./pages/convert/image-convert-tool.js').then(m => m.default),
  'webp-to-jpeg': () => import('./pages/convert/image-convert-tool.js').then(m => m.default),
  'compress-image': () => import('./pages/image/compress-image-tool.js').then(m => m.default),
  'settings': () => import('./pages/settings/settings-tool.js').then(m => m.default)
};

// Tool metadata for command palette
const TOOL_METADATA = {
  'merge-pdf': { name: 'Merge PDF', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', section: 'PDF Tools', shortcut: '', keywords: ['combine', 'join', 'merge'] },
  'split-pdf': { name: 'Split PDF', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>', section: 'PDF Tools', shortcut: '', keywords: ['extract', 'separate', 'pages'] },
  'compress-pdf': { name: 'Compress PDF', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"></rect><path d="M17 8h-5"></path><path d="M17 12h-5"></path><path d="M17 16h-5"></path></svg>', section: 'PDF Tools', shortcut: '', keywords: ['reduce', 'shrink', 'optimize'] },
  'pdf-text-editor': { name: 'PDF Text Editor', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>', section: 'PDF Tools', shortcut: '', keywords: ['edit', 'modify', 'change', 'text'] },
  'rotate-pdf': { name: 'Rotate PDF', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>', section: 'PDF Tools', shortcut: '', keywords: ['turn', 'spin', 'orientation'] },
  'pdf-to-png': { name: 'PDF to PNG', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>', section: 'Convert', shortcut: '', keywords: ['image', 'export', 'raster'] },
  'pdf-to-jpeg': { name: 'PDF to JPEG', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path></svg>', section: 'Convert', shortcut: '', keywords: ['jpg', 'image', 'photo'] },
  'png-to-pdf': { name: 'PNG to PDF', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="22" y2="13"></line><line x1="16" y1="17" x2="22" y2="17"></line><line x1="10" y1="9" x2="10" y2="9"></line></svg>', section: 'Convert', shortcut: '', keywords: ['image', 'create', 'document'] },
  'settings': { name: 'Settings', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 1 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0-1.51 1H15a1.65 1.65 0 0 0-1 1.51V15a1.65 1.65 0 0 0 1.51 1z"></path></svg>', section: 'Settings', shortcut: '⌘,', keywords: ['preferences', 'options', 'config'] }
};

// ============================================
// INITIALIZATION
// ============================================
async function initApp() {
  try {
    // Initialize storage
    await initStorage();
    
    // Load state
    state.history = getHistory();
    state.recentFiles = getRecentFiles();
    state.settings = getSettings();
    
    // Apply theme
    themeManager.init();
    
    // Initialize command palette
    initCommandPalette(buildCommandPaletteItems());
    
    // Register global shortcuts
    registerGlobalShortcuts();
    
    // Handle routing
    handleRouting();
    window.addEventListener('popstate', handleRouting);
    
    // Initialize PDF.js worker
    await initPDFWorker();
    
    // Mark performance
    if (window.performance) {
      window.performance.mark('zyncpdf:ready');
      window.performance.measure('zyncpdf:init', 'zyncpdf:start', 'zyncpdf:ready');
    }
    
    console.log('[ZyncPDF] Application initialized');
    
  } catch (error) {
    console.error('[ZyncPDF] Initialization failed:', error);
    showError('Failed to initialize application');
  }
}

// ============================================
// ROUTING
// ============================================
function handleRouting() {
  const path = window.location.pathname;
  const toolMatch = path.match(/\/([^/]+)\.html$/);
  const toolId = toolMatch ? toolMatch[1] : null;
  
  if (toolId && TOOL_REGISTRY[toolId]) {
    loadTool(toolId);
  } else {
    renderHomePage();
  }
}

async function loadTool(toolId) {
  if (state.currentTool === toolId && state.currentToolInstance) return;
  
  // Cleanup previous tool
  if (state.currentToolInstance?.destroy) {
    state.currentToolInstance.destroy();
  }
  
  state.currentTool = toolId;
  state.isLoading = true;
  
  const loadingToast = showToast({ 
    message: `Loading ${TOOL_METADATA[toolId]?.name || toolId}...`, 
    type: 'loading', 
    duration: 0 
  });
  
  try {
    const ToolClass = await TOOL_REGISTRY[toolId]();
    state.currentToolInstance = new ToolClass({ 
      tool: { id: toolId, ...TOOL_METADATA[toolId] }, 
      state, 
      utils: getUtils() 
    });
    
    await state.currentToolInstance.render();
    loadingToast();
    showSuccess(`${TOOL_METADATA[toolId]?.name || toolId} loaded`);
    
    // Update URL without reload
    window.history.pushState({ tool: toolId }, '', `/${toolId}.html`);
    
    // Register command palette item for this tool
    registerToolCommand(toolId);
    
  } catch (error) {
    console.error('Failed to load tool:', error);
    loadingToast();
    showError(`Failed to load tool: ${error.message}`);
    renderHomePage();
  } finally {
    state.isLoading = false;
  }
}

function renderHomePage() {
  if (state.currentToolInstance?.destroy) {
    state.currentToolInstance.destroy();
  }
  state.currentTool = null;
  state.currentToolInstance = null;
  
  const app = document.getElementById('app');
  app.innerHTML = getHomeHTML();
  
  // Bind events
  bindHomeEvents(app);
  
  // Update URL
  window.history.pushState({ tool: null }, '', '/');
  
  // Register home commands
  registerHomeCommands();
}

// ============================================
// HOME PAGE
// ============================================
function getHomeHTML() {
  return `
    <header class="hero-section">
      <div class="container">
        <div class="hero-badge">
          <i class="fas fa-code"></i> Open Source • 100% Private
        </div>
        <h1 class="hero-title">
          Your Files Stay With You.<br>
          Convert, Merge, Edit — Privately.
        </h1>
        <p class="hero-subtitle">
          <strong>ZyncPDF</strong> is the open-source, privacy-first PDF toolkit. 
          Over <strong>30+ tools</strong> to convert, merge, compress, and edit documents — all directly in your browser. 
          <strong>No uploads. No registration. Ever.</strong>
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" data-action="browse-tools">
            <i class="fas fa-tools"></i> Browse Tools
          </button>
          <button class="btn btn-secondary btn-lg" data-action="recent-files">
            <i class="fas fa-history"></i> Recent Files
          </button>
        </div>
        <div class="privacy-badge">
          <i class="fas fa-shield-alt"></i>
          100% Private — Zero Data Collection • No File Uploads • No Ads • No Registration
        </div>
      </div>
    </header>

    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">30+</div>
            <div class="stat-label">Powerful Tools</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">100%</div>
            <div class="stat-label">Privacy Guaranteed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">∞</div>
            <div class="stat-label">Free & Unlimited</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">0</div>
            <div class="stat-label">Uploads Required</div>
          </div>
        </div>
      </div>
    </section>

    <section class="featured-tool-section">
      <div class="container">
        <div class="featured-card">
          <div class="featured-content">
            <h3><i class="fas fa-edit"></i> PDF Text Editor</h3>
            <p>Extract, edit, and modify text in any PDF document. Perfect for correcting typos, updating content, or rewriting sections — all in your browser, completely private.</p>
            <button class="btn btn-primary btn-lg featured-btn" data-tool="pdf-text-editor">
              Try PDF Text Editor <i class="fas fa-arrow-right"></i>
            </button>
          </div>
          <div class="featured-icon">
            <i class="fas fa-file-alt"></i>
          </div>
        </div>
      </div>
    </section>

    <section id="tools" class="tools-section">
      <div class="container">
        <h2 class="section-title">Everything You Need, One Place</h2>
        <p class="section-subtitle">From conversion to editing — all tools work offline, right in your browser.</p>
        
        <div class="search-container">
          <i class="fas fa-search search-icon"></i>
          <input type="text" id="tool-search" placeholder="Search for any tool... (e.g., PDF to PNG)" autocomplete="off">
        </div>

        <div class="tools-grid" id="tools-grid"></div>
      </div>
    </section>

    <section class="features-section">
      <div class="container">
        <h2 class="section-title">Why ZyncPDF?</h2>
        <div class="features-grid">
          <div class="feature-card">
            <i class="fas fa-shield-alt feature-icon"></i>
            <h4>Client-Side Privacy</h4>
            <p>Your files never leave your device. All processing happens locally in your browser — no servers, no uploads, no tracking.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-edit feature-icon"></i>
            <h4>Edit PDF Text</h4>
            <p>Extract and modify text from any PDF document. Correct typos, update content, or rewrite sections with our text editor.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-code feature-icon"></i>
            <h4>Open Source Forever</h4>
            <p>Fully transparent code. Anyone can audit, contribute, or self-host. Trust is built into every line of code.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-infinity feature-icon"></i>
            <h4>Unlimited & Free</h4>
            <p>No paywalls, no premium tiers, no usage limits. Use every tool as much as you need — always free.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="comparison-section">
      <div class="container">
        <h2 class="section-title">How We Compare</h2>
        <p class="section-subtitle">See why ZyncPDF is the clear choice for privacy-conscious users.</p>
        <div class="comparison-table-container">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Features</th>
                <th>ZyncPDF</th>
                <th>Other Tools</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Privacy-Focused (No Uploads)</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>Completely Free & Unlimited</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>No Registration Required</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>No Ads, No Trackers</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>Open Source & Transparent</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>Batch Processing</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
              <tr><td>PDF Text Editor</td><td class="check"><i class="fas fa-check"></i></td><td class="x-mark"><i class="fas fa-times"></i></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="faq-section">
      <div class="container">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <div class="faq-container">
          <div class="faq-item">
            <div class="faq-question">
              <span>Can I edit text in PDF with ZyncPDF?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
              <p>Yes! Our PDF Text Editor lets you extract, edit, and save text from any PDF document. Perfect for fixing typos, updating content, or rewriting sections.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>Is ZyncPDF really free forever?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
              <p>Yes! ZyncPDF is completely free with no premium tiers, no usage limits, and no hidden costs. We're committed to keeping essential tools accessible to everyone.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>How does ZyncPDF protect my privacy?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
              <p>All processing happens directly in your browser. Your files are never uploaded to any server — they stay on your device from start to finish.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>What file formats are supported?</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
              <p>We support PDF, PNG, JPEG, JPG, TXT, HTML, Markdown, Word, Excel, PowerPoint, HEIF, WEBP, SVG, and many more formats.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function bindHomeEvents(app) {
  // Search
  const searchInput = app.querySelector('#tool-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderTools(e.target.value));
  }
  
  // Tool cards
  app.addEventListener('click', (e) => {
    const toolCard = e.target.closest('.tool-card');
    if (toolCard?.dataset.tool) {
      loadTool(toolCard.dataset.tool);
    }
    
    // Featured button
    if (e.target.closest('[data-tool]')) {
      loadTool(e.target.closest('[data-tool]').dataset.tool);
    }
    
    // Actions
    if (e.target.closest('[data-action="browse-tools"]')) {
      document.getElementById('tools-grid')?.scrollIntoView({ behavior: 'smooth' });
    }
    if (e.target.closest('[data-action="recent-files"]')) {
      showRecentFiles();
    }
  });
  
  // FAQ accordion
  app.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      item.classList.toggle('active');
    });
  });
  
  // Render tools
  renderTools();
}

function renderTools(searchTerm = '') {
  const grid = document.getElementById('tools-grid');
  if (!grid) return;
  
  const categories = {};
  Object.values(TOOL_METADATA).forEach(tool => {
    if (!categories[tool.section]) categories[tool.section] = [];
    categories[tool.section].push(tool);
  });
  
  const filtered = {};
  Object.entries(categories).forEach(([cat, tools]) => {
    filtered[cat] = tools.filter(t => 
      !searchTerm || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  grid.innerHTML = Object.entries(filtered)
    .filter(([_, tools]) => tools.length > 0)
    .map(([cat, tools]) => `
      <div class="tool-category">
        <h3>${cat}</h3>
        <div class="tools-row">
          ${tools.map(tool => `
            <button class="tool-card" data-tool="${Object.keys(TOOL_METADATA).find(k => TOOL_METADATA[k].name === tool.name)}" aria-label="${tool.name}">
              <span class="tool-icon">${tool.icon}</span>
              <span class="tool-name">${tool.name}</span>
              <span class="tool-desc">${tool.section === 'Convert' ? 'Convert' : tool.section === 'PDF Tools' ? 'PDF' : tool.section}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
}

// ============================================
// COMMAND PALETTE
// ============================================
function buildCommandPaletteItems() {
  const items = [
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      shortcut: '⌘⇧T',
      section: 'Appearance',
      keywords: ['dark', 'light', 'mode', 'theme'],
      action: () => themeManager.toggle()
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Show all available keyboard shortcuts',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01"></path></svg>',
      shortcut: '⌘/',
      section: 'Help',
      keywords: ['shortcuts', 'keys', 'hotkeys', 'help'],
      action: () => showKeyboardShortcuts()
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Open application settings',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 1 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06.06a2 2 0 0 0 2.83 0 2 2 0 0 0 0-2.83l.06-.06a1.65 1.65 0 0 1-.33-1.82 1.65 1.65 0 0 1 1.51-1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 1-1.51 1z"></path></svg>',
      shortcut: '⌘,',
      section: 'General',
      keywords: ['preferences', 'options', 'config'],
      action: () => loadTool('settings')
    }
  ];
  
  // Add tools
  Object.entries(TOOL_METADATA).forEach(([id, meta]) => {
    items.push({
      id: `tool-${id}`,
      title: meta.name,
      description: meta.section,
      icon: meta.icon,
      shortcut: meta.shortcut,
      section: meta.section,
      keywords: meta.keywords,
      action: () => loadTool(id)
    });
  });
  
  return items;
}

function registerToolCommand(toolId) {
  const meta = TOOL_METADATA[toolId];
  if (!meta) return;
  
  const palette = getCommandPalette();
  if (palette) {
    palette.register([{
      id: `tool-${toolId}`,
      title: meta.name,
      description: meta.section,
      icon: meta.icon,
      shortcut: meta.shortcut,
      section: meta.section,
      keywords: meta.keywords,
      action: () => loadTool(toolId)
    }]);
  }
}

function registerHomeCommands() {
  const palette = getCommandPalette();
  if (palette) {
    palette.register([{
      id: 'home',
      title: 'Home',
      description: 'Go to home page',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
      shortcut: '⌘H',
      section: 'Navigation',
      action: () => renderHomePage()
    }]);
  }
}

// ============================================
// GLOBAL SHORTCUTS
// ============================================
function registerGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }
    
    const isMac = navigator.platform.includes('Mac');
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Command palette: Ctrl/Cmd + K
    if (modKey && e.key === 'k') {
      e.preventDefault();
      const palette = getCommandPalette();
      if (palette) palette.toggle();
    }
    
    // Toggle theme: Ctrl/Cmd + Shift + T
    if (modKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      themeManager.toggle();
    }
    
    // Settings: Ctrl/Cmd + ,
    if (modKey && e.key === ',') {
      e.preventDefault();
      loadTool('settings');
    }
    
    // Help/Shortcuts: Ctrl/Cmd + /
    if (modKey && e.key === '/') {
      e.preventDefault();
      showKeyboardShortcuts();
    }
    
    // New file: Ctrl/Cmd + N
    if (modKey && e.key === 'n') {
      e.preventDefault();
      renderHomePage();
    }
    
    // Escape - close modals
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ============================================
// UTILITIES
// ============================================
function getUtils() {
  return {
    pdf: {
      loadPDFDocument: null, // Will be lazy loaded
      convertPDFToImages: null,
      mergePDFs: null,
      splitPDFByRanges: null,
      extractPDFPages: null,
      removePDFPages: null,
      reorderPDFPages: null,
      rotatePDFPages: null,
      compressPDF: null,
      addPDFPwd: null,
      removePDFPwd: null,
      updatePDFMetadata: null,
      flattenPDF: null,
      comparePDFs: null
    },
    image: {
      imagesToPDF: null,
      convertImage: null,
      compressImage: null,
      createThumbnail: null
    },
    file: {
      createFileInput: null,
      triggerFileInput: null,
      downloadBlob: null,
      downloadAsZip: null,
      getFileInfo: null,
      validateFile: null,
      formatFileSize: null
    },
    ui: {
      createDropZone: null,
      showToast: showToast,
      showSuccess: showSuccess,
      showError: showError,
      showInfo: showInfo,
      showLoading: (msg) => showToast({ message: msg, type: 'loading', duration: 0 })
    }
  };
}

async function initPDFWorker() {
  // PDF.js worker will be loaded lazily when needed
  if (typeof window !== 'undefined') {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
    } catch (e) {
      console.warn('PDF.js worker not loaded yet');
    }
  }
}

function showKeyboardShortcuts() {
  const shortcuts = [
    { keys: '⌘K', action: 'Open Command Palette' },
    { keys: '⌘⇧T', action: 'Toggle Theme' },
    { keys: '⌘/', action: 'Show Keyboard Shortcuts' },
    { keys: '⌘,', action: 'Open Settings' },
    { keys: '⌘N', action: 'New / Home' },
    { keys: 'Escape', action: 'Close Modal / Cancel' },
    { keys: 'Enter', action: 'Confirm / Execute' },
    { keys: 'Tab / ↑↓', action: 'Navigate Options' },
    { keys: 'Ctrl/Cmd + Click', action: 'Open in New Tab' },
    { keys: 'Drag & Drop', action: 'Upload Files' }
  ];
  
  const content = document.createElement('div');
  content.className = 'shortcuts-modal';
  content.innerHTML = `
    <div class="shortcuts-list">
      ${shortcuts.map(s => `
        <div class="shortcut-item">
          <kbd class="shortcut-keys">${s.keys.split(' + ').map(k => `<span>${k}</span>`).join('')}</kbd>
          <span class="shortcut-action">${s.action}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  import('./components/modal.js').then(m => m.showModal({
    title: 'Keyboard Shortcuts',
    content,
    size: 'md',
    actions: [{ label: 'Close', variant: 'primary', onClick: () => {} }]
  }));
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(modal => {
    modal.classList.remove('open');
  });
  document.querySelectorAll('.dropdown.open').forEach(dropdown => {
    dropdown.classList.remove('open');
  });
  const palette = getCommandPalette();
  if (palette?.isOpen) palette.close();
}

// ============================================
// START APP
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.ZyncPDF = {
  state,
  loadTool,
  renderHomePage,
  themeManager,
  showToast,
  showSuccess,
  showError,
  showInfo
};