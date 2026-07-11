/**
 * @file Footer Component
 * Reusable footer with links, social media, and copyright
 * @module components/footer
 */

/**
 * @typedef {Object} FooterLink
 * @property {string} label - Link text
 * @property {string} href - Link URL
 * @property {boolean} [external=false] - Whether link opens in new tab
 * @property {string} [icon] - Font Awesome icon class
 */

/**
 * @typedef {Object} FooterConfig
 * @property {FooterLink[]} [links] - Navigation links
 * @property {FooterLink[]} [social] - Social media links
 * @property {string} [copyright] - Copyright text
 * @property {string} [contactEmail] - Contact email
 * @property {boolean} [showVisitCount=false] - Show visit counter
 * @property {string} [visitCountKey='zyncpdf-visits'] - LocalStorage key for visit count
 * @property {string} [className] - Additional CSS classes
 */

/**
 * Create footer element
 * @param {FooterConfig} config - Footer configuration
 * @returns {HTMLElement} Footer element
 */
export function createFooter(config = {}) {
  const {
    links = [],
    social = [],
    copyright = `© ${new Date().getFullYear()} ZyncPDF. Open source, privacy-first PDF tools.`,
    contactEmail = 'adm.converto@gmail.com',
    showVisitCount = true,
    visitCountKey = 'zyncpdf-visits',
    className = ''
  } = config;
  
  const footer = document.createElement('footer');
  footer.className = `footer ${className}`.trim();
  footer.setAttribute('role', 'contentinfo');
  
  // Default links if none provided
  const defaultLinks = [
    { label: 'Terms of Service', href: '/terms.html' },
    { label: 'Privacy Policy', href: '/privacy.html' },
    { label: 'Changelog', href: '/changelog.html' },
    { label: 'GitHub', href: 'https://github.com/alanjollyc/ZyncPDF.git', external: true, icon: 'fab fa-github' }
  ];
  
  const finalLinks = links.length > 0 ? links : defaultLinks;
  
  // Default social links if none provided
  const defaultSocial = [
    { label: 'GitHub', href: 'https://github.com/alanjollyc/ZyncPDF.git', external: true, icon: 'fab fa-github' },
    { label: 'Twitter', href: 'https://x.com/ZyncPDF', external: true, icon: 'fab fa-twitter' }
  ];
  
  const finalSocial = social.length > 0 ? social : defaultSocial;
  
  footer.innerHTML = `
    <div class="footer-container container">
      <div class="footer-brand">
        <div class="footer-logo">
          <img src="/logo.png" alt="ZyncPDF" class="footer-logo-img" loading="lazy">
          <span class="footer-logo-text">ZyncPDF</span>
        </div>
        <p class="footer-tagline">Your Files Stay With You. Convert, Merge, Edit — Privately.</p>
      </div>
      
      <div class="footer-links">
        <ul class="footer-nav" role="list" aria-label="Footer navigation">
          ${finalLinks.map(link => `
            <li>
              <a href="${link.href}" class="footer-link" ${link.external ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="${link.label}">
                ${link.icon ? `<i class="${link.icon}" aria-hidden="true"></i>` : ''}
                ${link.label}
              </a>
            </li>
          `).join('')}
        </ul>
        
        ${finalSocial.length > 0 ? `
          <div class="footer-social" role="list" aria-label="Social media links">
            ${finalSocial.map(link => `
              <a href="${link.href}" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="${link.label}">
                <i class="${link.icon || 'fab fa-github'}" aria-hidden="true"></i>
              </a>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="footer-contact">
          <a href="mailto:${contactEmail}" class="footer-email" aria-label="Email us">
            <i class="fas fa-envelope" aria-hidden="true"></i>
            ${contactEmail}
          </a>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p class="footer-copyright">${copyright}</p>
        
        ${showVisitCount ? `
          <div class="footer-visit-count" aria-live="polite" aria-atomic="true">
            <i class="fas fa-eye" aria-hidden="true"></i>
            <span>Total Visits: <span id="footer-visit-count" class="visit-count-number">0</span></span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Initialize visit counter
  if (showVisitCount) {
    initVisitCounter(footer, visitCountKey);
  }
  
  return footer;
}

/**
 * Initialize visit counter
 * @param {HTMLElement} footer - Footer element
 * @param {string} key - LocalStorage key
 */
function initVisitCounter(footer, key) {
  try {
    let count = parseInt(localStorage.getItem(key) || '0', 10);
    const isNewVisit = !sessionStorage.getItem(`${key}-session`);
    
    if (isNewVisit) {
      count++;
      localStorage.setItem(key, count.toString());
      sessionStorage.setItem(`${key}-session`, 'true');
    }
    
    const countEl = footer.querySelector('#footer-visit-count');
    if (countEl) {
      animateCount(countEl, count);
    }
  } catch (e) {
    console.warn('Visit counter failed:', e);
  }
}

/**
 * Animate number count
 * @param {HTMLElement} element - Element to update
 * @param {number} target - Target number
 */
function animateCount(element, target) {
  const duration = 1000;
  const start = 0;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.floor(start + (target - start) * eased);
    
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}

/**
 * Mount footer to DOM
 * @param {FooterConfig} config - Footer configuration
 * @param {HTMLElement} [container] - Container element (defaults to body append)
 * @returns {HTMLElement} Footer element
 */
export function mountFooter(config, container = null) {
  const footer = createFooter(config);
  
  if (container) {
    container.appendChild(footer);
  } else {
    document.body.appendChild(footer);
  }
  
  return footer;
}

/**
 * Update footer visit count
 * @param {HTMLElement} footer - Footer element
 * @param {number} count - New count
 */
export function updateFooterVisitCount(footer, count) {
  const countEl = footer.querySelector('#footer-visit-count');
  if (countEl) {
    countEl.textContent = count.toLocaleString();
  }
}

export default createFooter;