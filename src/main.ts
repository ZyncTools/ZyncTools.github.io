/**
 * ZyncPDF - Main Entry Point
 * Initializes the entire application
 */

import { ZyncPDFApp } from './core/app.js';
import { EventEmitter } from './utils/event-emitter.js';

// Make EventEmitter available globally for workers
(globalThis as any).EventEmitter = EventEmitter;

// Initialize app when DOM is ready
async function initApp(): Promise<void> {
  const app = new ZyncPDFApp();
  
  try {
    await app.initialize(document.getElementById('app')!);
    
    // Expose for debugging
    (window as any).ZyncPDF = app;
    
    console.log('[ZyncPDF] Application ready');
  } catch (error) {
    console.error('[ZyncPDF] Failed to initialize:', error);
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 2rem; text-align: center;">
        <div>
          <h1 style="color: var(--accent-danger); margin-bottom: 1rem;">Failed to Initialize</h1>
          <p style="color: var(--text-secondary);">ZyncPDF failed to start. Please refresh the page or check the console for errors.</p>
          <pre style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg); overflow: auto; margin-top: 1rem; text-align: left;">${error}</pre>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Handle unhandled errors
window.addEventListener('error', (e) => {
  console.error('[ZyncPDF] Unhandled error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[ZyncPDF] Unhandled rejection:', e.reason);
});

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker optional
    });
  });
}

export {};