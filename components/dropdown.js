/**
 * @file Dropdown Component
 * Accessible dropdown menu component
 * @module components/dropdown
 */

/**
 * Dropdown item configuration
 * @typedef {Object} DropdownItem
 * @property {string} label - Item label
 * @property {string} [icon] - Icon HTML
 * @property {string} [shortcut] - Keyboard shortcut display
 * @property {Function} [onClick] - Click handler
 * @property {boolean} [disabled=false] - Disabled state
 * @property {boolean} [divider=false] - Divider item
 * @property {string} [variant] - Variant: 'default', 'danger'
 * @property {boolean} [toggle=false] - Toggle item
 * @property {boolean} [pressed=false] - Pressed state (for toggle)
 */

/**
 * Dropdown configuration
 * @typedef {Object} DropdownConfig
 * @property {HTMLElement} trigger - Trigger element
 * @property {DropdownItem[]} items - Menu items
 * @property {string} [placement='bottom-end'] - Placement
 * @property {boolean} [closeOnClick=true] - Close on item click
 * @property {Function} [onOpen] - Open callback
 * @property {Function} [onClose] - Close callback
 */

/**
 * Create dropdown menu
 * @param {DropdownConfig} config - Dropdown configuration
 * @returns {Object} Dropdown controller
 */
export function createDropdown(config = {}) {
  const {
    trigger,
    items = [],
    placement = 'bottom-end',
    closeOnClick = true,
    onOpen,
    onClose
  } = config;
  
  if (!trigger) {
    throw new Error('Dropdown requires a trigger element');
  }
  
  const menu = document.createElement('div');
  menu.className = `dropdown-menu dropdown-${placement}`;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-orientation', 'vertical');
  menu.hidden = true;
  
  menu.innerHTML = items.map((item, index) => {
    if (item.divider) {
      return '<hr class="dropdown-divider" role="separator" aria-orientation="horizontal">';
    }
    
    return `
      <button
        class="dropdown-item ${item.variant || ''} ${item.disabled ? 'disabled' : ''} ${item.toggle ? 'dropdown-toggle-item' : ''}"
        role="menuitem${item.toggle ? 'checkbox' : ''}"
        type="button"
        data-index="${index}"
        ${item.disabled ? 'disabled' : ''}
        ${item.toggle ? `aria-checked="${item.pressed || false}"` : ''}
        tabindex="-1"
      >
        ${item.icon ? `<span class="dropdown-item-icon" aria-hidden="true">${item.icon}</span>` : ''}
        <span class="dropdown-item-label">${escapeHtml(item.label)}</span>
        ${item.shortcut ? `<kbd class="dropdown-item-shortcut">${escapeHtml(item.shortcut)}</kbd>` : ''}
        ${item.toggle && item.pressed ? `<span class="dropdown-item-check" aria-hidden="true">✓</span>` : ''}
      </button>
    `;
  }).join('');
  
  document.body.appendChild(menu);
  
  let isOpen = false;
  let focusIndex = -1;
  
  // Position menu
  function positionMenu() {
    const rect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    
    let top, left;
    
    if (placement.includes('bottom')) {
      top = rect.bottom + window.scrollY + 4;
    } else {
      top = rect.top + window.scrollY - menuRect.height - 4;
    }
    
    if (placement.includes('end') || placement.includes('right')) {
      left = rect.right + window.scrollX - menuRect.width;
    } else {
      left = rect.left + window.scrollX;
    }
    
    // Keep in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left + menuRect.width > viewportWidth - 8) {
      left = viewportWidth - menuRect.width - 8;
    }
    if (left < 8) left = 8;
    
    if (top + menuRect.height > viewportHeight + window.scrollY - 8) {
      top = rect.top + window.scrollY - menuRect.height - 4;
    }
    if (top < window.scrollY;
    
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }
  
  // Open dropdown
  function open() {
    if (isOpen) return;
    isOpen = true;
    focusIndex = -1;
    
    menu.hidden = false;
    positionMenu();
    
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('dropdown-trigger-open');
    
    // Focus first item
    requestAnimationFrame(() => {
      const firstItem = menu.querySelector('[role="menuitem"]:not(.disabled)');
      firstItem?.focus();
    });
    
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('scroll', positionMenu, { passive: true });
    window.addEventListener('resize', positionMenu);
    
    onOpen?.(menu);
  }
  
  // Close dropdown
  function close() {
    if (!isOpen) return;
    isOpen = false;
    
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('dropdown-trigger-open');
    
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('scroll', positionMenu);
    window.removeEventListener('resize', positionMenu);
    
    trigger.focus();
    onClose?.(menu);
  }
  
  // Toggle dropdown
  function toggle() {
    if (isOpen) close();
    else open();
  }
  
  // Handle outside click
  function handleOutsideClick(e) {
    if (!menu.contains(e.target) && !trigger.contains(e.target)) {
      close();
    }
  }
  
  // Handle keyboard navigation
  function handleKeydown(e) {
    const items = menu.querySelectorAll('[role="menuitem"]:not(.disabled)');
    if (items.length === 0) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusIndex = (focusIndex + 1) % items.length;
        items[focusIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusIndex = (focusIndex - 1 + items.length) % items.length;
        items[focusIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        focusIndex = 0;
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        focusIndex = items.length - 1;
        items[focusIndex]?.focus();
        break;
      case 'Enter':
      case ' ':
        if (document.activeElement && items[focusIndex] === document.activeElement) {
          e.preventDefault();
          document.activeElement.click();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  }
  
  // Bind trigger click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  
  // Bind menu item clicks
  menu.querySelectorAll('[role="menuitem"]:not(.disabled)').forEach((btn, index) => {
    const item = items[index];
    
    btn.addEventListener('click', (e) => {
      if (item?.onClick) {
        item.onClick(e, btn);
      }
      
      if (item?.toggle) {
        const pressed = btn.getAttribute('aria-checked') === 'true';
        btn.setAttribute('aria-checked', !pressed);
        btn.classList.toggle('pressed');
        const check = btn.querySelector('.dropdown-item-check');
        if (check) check.style.display = !pressed ? 'inline' : 'none';
      }
      
      if (closeOnClick) close();
    });
  });
  
  // Cleanup
  function destroy() {
    close();
    menu.remove();
    trigger.removeEventListener('click', toggle);
  }
  
  return {
    open,
    close,
    toggle,
    destroy,
    get isOpen() { return isOpen; },
    get menu() { return menu; },
    updateItems: (newItems) => {
      // Re-render menu
      const oldMenu = menu;
      const newMenu = createDropdown({ ...config, items: newItems }).menu;
      oldMenu.replaceWith(newMenu);
    }
  };
}

/**
 * Create dropdown from trigger with data attributes
 * @param {HTMLElement} trigger - Trigger element
 * @returns {Object|null} Dropdown controller or null
 */
export function createDropdownFromTrigger(trigger) {
  const menuId = trigger.getAttribute('aria-controls');
  const menu = menuId ? document.getElementById(menuId) : null;
  
  if (!menu) return null;
  
  const items = Array.from(menu.querySelectorAll('[role="menuitem"]')).map(btn => ({
    label: btn.querySelector('.dropdown-item-label')?.textContent || btn.textContent,
    onClick: () => btn.click()
  }));
  
  return createDropdown({ trigger, items });
}

/**
 * Escape HTML
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default createDropdown;