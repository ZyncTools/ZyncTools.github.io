/**
 * @file Navbar Component
 * Responsive navigation bar with theme toggle, search, and user menu
 * @module components/navbar
 */

import { themeManager } from '../utils/theme.js';
import { showToast } from '../utils/ui.js';

/**
 * Navigation link configuration
 * @typedef {Object} NavLink
 * @property {string} href - Link URL
 * @property {string} label - Link label
 * @property {string} [icon] - Icon HTML or class
 * @property {boolean} [external] - External link
 * @property {string} [ariaLabel] - Accessibility label
 */

/**
 * Navbar configuration
 * @typedef {Object} NavbarConfig
 * @property {string} logoSrc - Logo image source
 * @property {string} logoAlt - Logo alt text
 * @property {string} brandName - Brand name
 * @property {NavLink[]} links - Navigation links
 * @property {boolean} [showSearch=true] - Show search button
 * @property {Function} [onSearch] - Search handler
 * @property {boolean} [showThemeToggle=true] - Show theme toggle
 * @property {NavLink[]} [userMenu] - User menu items
 */

const DEFAULT_CONFIG = {
  logoSrc: '/logo.png',
  logoAlt: 'ZyncPDF',
  brandName: 'ZyncPDF',
  links: [
    { href: '/', label: 'Home', icon: 'fas fa-home' },
    { href: '#tools', label: 'Tools', icon: 'fas fa-tools' },
    { href: '#features', label: 'Features', icon: 'fas fa-star' },
    { href: 'support.html', label: 'Support', icon: 'fas fa-heart' }
  ],
  showSearch: true,
  showThemeToggle: true,
  userMenu: []
};

/**
 * Create navbar component
 * @param {NavbarConfig} config - Navbar configuration
 * @returns {HTMLElement} Navbar element
 */
export function createNavbar(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');
  
  nav.innerHTML = `
    <div class="navbar-container">
      <a href="${cfg.links[0]?.href || '/'}" class="navbar-brand" aria-label="${cfg.brandName} - Home">
        <img src="${cfg.logoSrc}" alt="${cfg.logoAlt}" class="navbar-logo">
        <span class="navbar-brand-text">${cfg.brandName}</span>
      </a>
      
      <div class="navbar-center">
        <ul class="navbar-links" role="menubar">
          ${cfg.links.map((link, i) => `
            <li role="none">
              <a href="${link.href}" 
                 class="navbar-link" 
                 role="menuitem"
                 ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ''}
                 ${link.ariaLabel ? `aria-label="${link.ariaLabel}"` : ''}>
                ${link.icon ? `<i class="${link.icon}" aria-hidden="true"></i>` : ''}
                <span>${link.label}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        
        ${cfg.showSearch ? `
          <button class="navbar-search-btn" aria-label="Search tools (Ctrl+K)" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="navbar-search-shortcut">⌘K</span>
          </button>
        ` : ''}
      </div>
      
      <div class="navbar-actions">
        ${cfg.showThemeToggle ? `
          <button class="navbar-theme-toggle" aria-label="Toggle theme" type="button">
            <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        ` : ''}
        
        ${cfg.userMenu.length > 0 ? `
          <div class="navbar-user-menu dropdown">
            <button class="navbar-user-btn" aria-expanded="false" aria-haspopup="true" type="button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            <div class="dropdown-menu" role="menu">
              ${cfg.userMenu.map(item => `
                <a href="${item.href}" class="dropdown-item" role="menuitem" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                  ${item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : ''}
                  ${item.label}
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <button class="navbar-menu-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="navbar-menu" type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="navbar-mobile-menu" id="navbar-menu" role="navigation" aria-label="Mobile menu">
      <ul class="navbar-mobile-links" role="menubar">
        ${cfg.links.map(link => `
          <li role="none">
            <a href="${link.href}" class="navbar-mobile-link" role="menuitem" ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
              ${link.icon ? `<i class="${link.icon}" aria-hidden="true"></i>` : ''}
              ${link.label}
            </a>
          </li>
        `).join('')}
      </ul>
      ${cfg.userMenu.length > 0 ? `
        <div class="navbar-mobile-divider"></div>
        <ul class="navbar-mobile-user" role="menu">
          ${cfg.userMenu.map(item => `
            <li role="none">
              <a href="${item.href}" class="navbar-mobile-link" role="menuitem" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                ${item.icon ? `<i class="${item.icon}" aria-hidden="true"></i>` : ''}
                ${item.label}
              </a>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `;
  
  // Initialize interactions
  initNavbarInteractions(nav, cfg);
  
  return nav;
}

/**
 * Initialize navbar interactions
 * @param {HTMLElement} nav - Navbar element
 * @param {NavbarConfig} config - Navbar configuration
 */
function initNavbarInteractions(nav, config) {
  // Theme toggle
  const themeToggle = nav.querySelector('.navbar-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      themeManager.toggle();
    });
    
    // Update icons on theme change
    themeManager.subscribe((theme) => {
      nav.classList.toggle('theme-dark', theme === 'dark');
    });
    
    // Initial theme
    nav.classList.toggle('theme-dark', themeManager.isDark());
  }
  
  // Search button
  const searchBtn = nav.querySelector('.navbar-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (config.onSearch) {
        config.onSearch();
      } else {
        // Default: open command palette
        window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    });
  }
  
  // Mobile menu toggle
  const menuToggle = nav.querySelector('.navbar-menu-toggle');
  const mobileMenu = nav.querySelector('.navbar-mobile-menu');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        menuToggle.focus();
      }
    });
  }
  
  // User menu dropdown
  const userMenu = nav.querySelector('.navbar-user-menu');
  if (userMenu) {
    const btn = userMenu.querySelector('.navbar-user-btn');
    const dropdown = userMenu.querySelector('.dropdown-menu');
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userMenu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen);
    });
    
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Keyboard navigation
    dropdown.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.dropdown-item');
      const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        items[prevIndex].focus();
      } else if (e.key === 'Escape') {
        userMenu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }
  
  // Active link highlighting
  const currentPath = window.location.pathname;
  nav.querySelectorAll('.navbar-link, .navbar-mobile-link').forEach(link => {
    if (link.getAttribute('href') === currentPath || 
        (currentPath !== '/' && link.getAttribute('href') !== '/' && currentPath.startsWith(link.getAttribute('href')))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
  
  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    nav.classList.toggle('scrolled', currentScroll > 10);
    nav.classList.toggle('nav-hidden', currentScroll > lastScroll && currentScroll > 100);
    lastScroll = currentScroll;
  }, { passive: true });
}

/**
 * Mount navbar to DOM
 * @param {NavbarConfig} config - Navbar configuration
 * @param {HTMLElement} [container] - Container element (defaults to body prepend)
 * @returns {HTMLElement} Navbar element
 */
export function mountNavbar(config, container = null) {
  const navbar = createNavbar(config);
  
  if (container) {
    container.insertBefore(navbar, container.firstChild);
  } else {
    document.body.insertBefore(navbar, document.body.firstChild);
  }
  
  return navbar;
}

/**
 * Update navbar active state
 * @param {HTMLElement} nav - Navbar element
 * @param {string} path - Current path
 */
export function setNavbarActive(nav, path) {
  nav.querySelectorAll('.navbar-link, .navbar-mobile-link').forEach(link => {
    const href = link.getAttribute('href');
    const isActive = href === path || (path !== '/' && href !== '/' && path.startsWith(href));
    
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

export default createNavbar;