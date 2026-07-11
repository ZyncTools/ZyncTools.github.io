/**
 * @file Toolbar Component
 * Reusable toolbar with buttons, groups, and overflow menu
 * @module components/toolbar
 */

/**
 * Toolbar item configuration
 * @typedef {Object} ToolbarItem
 * @property {string} id - Unique identifier
 * @property {string} [label] - Button label
 * @property {string} [icon] - Icon HTML or class
 * @property {string} [variant='secondary'] - Button variant: 'primary', 'secondary', 'ghost', 'danger'
 * @property {boolean} [disabled=false] - Disabled state
 * @property {boolean} [toggle=false] - Toggle button
 * @property {boolean} [pressed=false] - Initial pressed state (for toggle)
 * @property {string} [tooltip] - Tooltip text
 * @property {Function} [onClick] - Click handler
 * @property {ToolbarItem[]} [submenu] - Submenu items
 * @property {string} [type='button'] - Type: 'button', 'divider', 'spacer', 'input', 'select'
 * @property {Object} [inputProps] - Input properties (for type 'input')
 * @property {Object} [selectProps] - Select properties (for type 'select')
 */

/**
 * Toolbar configuration
 * @typedef {Object} ToolbarConfig
 * @property {ToolbarItem[]} items - Toolbar items
 * @property {string} [orientation='horizontal'] - Orientation: 'horizontal', 'vertical'
 * @property {boolean} [overflowMenu=true] - Show overflow menu
 * @property {string} [className] - Additional CSS classes
 * @property {string} [ariaLabel='Toolbar'] - ARIA label
 */

/**
 * Create toolbar component
 * @param {ToolbarConfig} config - Toolbar configuration
 * @returns {HTMLElement} Toolbar element
 */
export function createToolbar(config = {}) {
  const {
    items = [],
    orientation = 'horizontal',
    overflowMenu = true,
    className = '',
    ariaLabel = 'Toolbar'
  } = config;
  
  const toolbar = document.createElement('div');
  toolbar.className = `toolbar toolbar-${orientation} ${className}`.trim();
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', ariaLabel);
  
  // Main toolbar content
  const toolbarContent = document.createElement('div');
  toolbarContent.className = 'toolbar-content';
  toolbarContent.setAttribute('role', 'group');
  
  // Overflow menu
  let overflowMenuBtn = null;
  let overflowMenu = null;
  let overflowItems = [];
  
  // Render items
  const renderItems = (items, container, isOverflow = false) => {
    items.forEach((item, index) => {
      if (item.type === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'toolbar-divider';
        divider.setAttribute('role', 'separator');
        divider.setAttribute('aria-orientation', orientation);
        container.appendChild(divider);
        return;
      }
      
      if (item.type === 'spacer') {
        const spacer = document.createElement('div');
        spacer.className = 'toolbar-spacer';
        spacer.style.flexGrow = '1';
        container.appendChild(spacer);
        return;
      }
      
      if (item.type === 'input') {
        const input = createInput(item);
        container.appendChild(input);
        return;
      }
      
      if (item.type === 'select') {
        const select = createSelect(item);
        container.appendChild(select);
        return;
      }
      
      // Button
      const btn = createButton(item, isOverflow);
      container.appendChild(btn);
    });
  };
  
  // Create button
  const createButton = (item, isOverflow) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `toolbar-btn toolbar-btn-${item.variant || 'secondary'} ${item.toggle ? 'toolbar-btn-toggle' : ''} ${item.pressed ? 'pressed' : ''} ${item.disabled ? 'disabled' : ''}`;
    btn.dataset.toolbarId = item.id;
    
    if (item.disabled) {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }
    
    if (item.toggle) {
      btn.setAttribute('role', 'switch');
      btn.setAttribute('aria-checked', item.pressed);
    } else {
      btn.setAttribute('role', 'button');
    }
    
    if (item.tooltip) {
      btn.setAttribute('data-tooltip', item.tooltip);
      btn.classList.add('has-tooltip');
    }
    
    // Icon
    let iconHtml = '';
    if (item.icon) {
      if (item.icon.startsWith('<')) {
        iconHtml = item.icon;
      } else {
        iconHtml = `<i class="${item.icon}" aria-hidden="true"></i>`;
      }
    }
    
    // Label
    const labelHtml = item.label ? `<span class="toolbar-btn-label">${item.label}</span>` : '';
    
    // Submenu indicator
    const submenuHtml = item.submenu ? `
      <svg class="toolbar-btn-submenu" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    ` : '';
    
    btn.innerHTML = `
      <span class="toolbar-btn-icon">${iconHtml}</span>
      ${labelHtml}
      ${submenuHtml}
    `;
    
    // Click handler
    btn.addEventListener('click', (e) => {
      if (item.disabled) return;
      
      if (item.toggle) {
        const pressed = btn.getAttribute('aria-checked') === 'true';
        btn.setAttribute('aria-checked', !pressed);
        btn.classList.toggle('pressed');
      }
      
      if (item.submenu) {
        e.stopPropagation();
        showSubmenu(btn, item.submenu);
      } else {
        item.onClick?.(e, btn);
      }
    });
    
    // Keyboard support for submenu
    if (item.submenu) {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          showSubmenu(btn, item.submenu);
        } else if (e.key === 'ArrowRight' && !isOverflow) {
          e.preventDefault();
          showSubmenu(btn, item.submenu);
        }
      });
    }
    
    return btn;
  };
  
  // Create input
  const createInput = (item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-input-wrapper';
    
    const input = document.createElement('input');
    input.type = item.inputProps?.type || 'text';
    input.className = 'toolbar-input';
    input.placeholder = item.inputProps?.placeholder || '';
    input.value = item.inputProps?.value || '';
    input.disabled = item.disabled || false;
    
    if (item.inputProps?.onChange) {
      input.addEventListener('input', (e) => item.inputProps.onChange(e, input));
    }
    if (item.inputProps?.onBlur) {
      input.addEventListener('blur', (e) => item.inputProps.onBlur(e, input));
    }
    
    wrapper.appendChild(input);
    
    if (item.label) {
      const label = document.createElement('label');
      label.className = 'toolbar-input-label';
      label.textContent = item.label;
      wrapper.insertBefore(label, input);
    }
    
    return wrapper;
  };
  
  // Create select
  const createSelect = (item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-select-wrapper';
    
    const select = document.createElement('select');
    select.className = 'toolbar-select';
    select.disabled = item.disabled || false;
    
    if (item.selectProps?.options) {
      item.selectProps.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        option.selected = opt.selected || false;
        select.appendChild(option);
      });
    }
    
    if (item.selectProps?.onChange) {
      select.addEventListener('change', (e) => item.selectProps.onChange(e, select));
    }
    
    wrapper.appendChild(select);
    
    if (item.label) {
      const label = document.createElement('label');
      label.className = 'toolbar-select-label';
      label.textContent = item.label;
      wrapper.insertBefore(label, select);
    }
    
    return wrapper;
  };
  
  // Show submenu
  const showSubmenu = (trigger, submenuItems) => {
    // Close existing submenu
    hideSubmenu();
    
    const submenu = document.createElement('div');
    submenu.className = 'toolbar-submenu';
    submenu.setAttribute('role', 'menu');
    submenu.dataset.toolbarSubmenu = 'true';
    
    submenuItems.forEach((item, index) => {
      if (item.type === 'divider') {
        const divider = document.createElement('div');
        divider.className = 'toolbar-submenu-divider';
        divider.setAttribute('role', 'separator');
        submenu.appendChild(divider);
        return;
      }
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toolbar-submenu-item';
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('tabindex', '-1');
      
      if (item.disabled) {
        btn.disabled = true;
        btn.classList.add('disabled');
      }
      
      let iconHtml = '';
      if (item.icon) {
        if (item.icon.startsWith('<')) {
          iconHtml = item.icon;
        } else {
          iconHtml = `<i class="${item.icon}" aria-hidden="true"></i>`;
        }
      }
      
      const labelHtml = item.label ? `<span class="toolbar-submenu-label">${item.label}</span>` : '';
      const shortcutHtml = item.shortcut ? `<span class="toolbar-submenu-shortcut">${item.shortcut}</span>` : '';
      
      btn.innerHTML = `${iconHtml}${labelHtml}${shortcutHtml}`;
      
      btn.addEventListener('click', (e) => {
        if (item.disabled) return;
        item.onClick?.(e, btn);
        hideSubmenu();
      });
      
      submenu.appendChild(btn);
    });
    
    document.body.appendChild(submenu);
    
    // Position submenu
    const rect = trigger.getBoundingClientRect();
    const orientation = toolbar.classList.contains('toolbar-horizontal') ? 'horizontal' : 'vertical';
    
    if (orientation === 'horizontal') {
      submenu.style.top = `${rect.bottom + 4}px`;
      submenu.style.left = `${rect.left}px`;
    } else {
      submenu.style.top = `${rect.top}px`;
      submenu.style.left = `${rect.right + 4}px`;
    }
    
    // Focus first item
    const firstItem = submenu.querySelector('[role="menuitem"]:not(.disabled)');
    firstItem?.focus();
    
    // Keyboard navigation
    submenu.addEventListener('keydown', (e) => {
      const items = submenu.querySelectorAll('[role="menuitem"]:not(.disabled)');
      if (items.length === 0) return;
      
      const currentIndex = Array.from(items).findIndex(i => i === document.activeElement);
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          hideSubmenu();
          trigger.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % items.length;
          items[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          items[prevIndex]?.focus();
          break;
        case 'Tab':
          hideSubmenu();
          break;
      }
    });
    
    // Store reference
    toolbar._activeSubmenu = submenu;
    toolbar._submenuTrigger = trigger;
    
    // Close on outside click
    const handleClick = (e) => {
      if (!submenu.contains(e.target) && e.target !== trigger) {
        hideSubmenu();
        document.removeEventListener('click', handleClick);
      }
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
  };
  
  // Hide submenu
  const hideSubmenu = () => {
    if (toolbar._activeSubmenu) {
      toolbar._activeSubmenu.remove();
      toolbar._activeSubmenu = null;
      toolbar._submenuTrigger = null;
    }
  };
  
  // Handle overflow
  const handleOverflow = () => {
    if (!overflowMenu || orientation !== 'horizontal') return;
    
    const toolbarRect = toolbarContent.getBoundingClientRect();
    const items = toolbarContent.querySelectorAll('.toolbar-btn:not(.toolbar-overflow-btn)');
    
    let overflowIndex = -1;
    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      if (itemRect.right > toolbarRect.right - 48) { // 48px for overflow button
        if (overflowIndex === -1) overflowIndex = index;
      }
    });
    
    if (overflowIndex !== -1) {
      const overflowItems = Array.from(items).slice(overflowIndex);
      
      // Create overflow button
      if (!overflowMenuBtn) {
        overflowMenuBtn = document.createElement('button');
        overflowMenuBtn.type = 'button';
        overflowMenuBtn.className = 'toolbar-btn toolbar-btn-secondary toolbar-overflow-btn';
        overflowMenuBtn.setAttribute('aria-label', 'More actions');
        overflowMenuBtn.setAttribute('aria-haspopup', 'true');
        overflowMenuBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
        `;
        
        toolbarContent.appendChild(overflowMenuBtn);
        
        // Create overflow menu
        overflowMenu = document.createElement('div');
        overflowMenu.className = 'toolbar-overflow-menu';
        overflowMenu.setAttribute('role', 'menu');
        document.body.appendChild(overflowMenu);
        
        overflowMenuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleOverflowMenu();
        });
      }
      
      // Move items to overflow
      overflowItems.forEach(item => {
        item.remove();
        overflowMenu.appendChild(item);
        item.classList.add('toolbar-overflow-item');
      });
      
      overflowMenuBtn.hidden = false;
    } else if (overflowMenuBtn) {
      // Move items back
      if (overflowMenu) {
        const items = overflowMenu.querySelectorAll('.toolbar-overflow-item');
        items.forEach(item => {
          item.classList.remove('toolbar-overflow-item');
          toolbarContent.appendChild(item);
        });
      }
      overflowMenuBtn.hidden = true;
    }
  };
  
  // Toggle overflow menu
  const toggleOverflowMenu = () => {
    if (!overflowMenu) return;
    
    const isOpen = overflowMenu.classList.toggle('open');
    overflowMenuBtn.setAttribute('aria-expanded', isOpen);
    
    if (isOpen) {
      const rect = overflowMenuBtn.getBoundingClientRect();
      overflowMenu.style.top = `${rect.bottom + 4}px`;
      overflowMenu.style.right = `${window.innerWidth - rect.right}px`;
      
      // Focus first item
      const firstItem = overflowMenu.querySelector('[role="menuitem"]:not(.disabled)');
      firstItem?.focus();
      
      // Keyboard navigation
      const handleKeydown = (e) => {
        const items = overflowMenu.querySelectorAll('[role="menuitem"]:not(.disabled)');
        if (items.length === 0) return;
        
        const currentIndex = Array.from(items).findIndex(i => i === document.activeElement);
        
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            closeOverflowMenu();
            overflowMenuBtn.focus();
            break;
          case 'ArrowDown':
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % items.length;
            items[nextIndex]?.focus();
            break;
          case 'ArrowUp':
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + items.length) % items.length;
            items[prevIndex]?.focus();
            break;
          case 'Tab':
            closeOverflowMenu();
            break;
        }
      };
      
      overflowMenu.addEventListener('keydown', handleKeydown);
      overflowMenu._handleKeydown = handleKeydown;
      
      // Close on outside click
      const handleClick = (e) => {
        if (!overflowMenu.contains(e.target) && e.target !== overflowMenuBtn) {
          closeOverflowMenu();
          document.removeEventListener('click', handleClick);
        }
      };
      setTimeout(() => document.addEventListener('click', handleClick), 0);
    }
  };
  
  const closeOverflowMenu = () => {
    if (overflowMenu) {
      overflowMenu.classList.remove('open');
      overflowMenuBtn.setAttribute('aria-expanded', 'false');
      if (overflowMenu._handleKeydown) {
        overflowMenu.removeEventListener('keydown', overflowMenu._handleKeydown);
      }
    }
  };
  
  // Initial render
  renderItems(items, toolbarContent);
  toolbar.appendChild(toolbarContent);
  
  // Handle resize for overflow
  if (overflowMenu && orientation === 'horizontal') {
    const resizeObserver = new ResizeObserver(handleOverflow);
    resizeObserver.observe(toolbarContent);
    toolbar._resizeObserver = resizeObserver;
  }
  
  // Cleanup
  toolbar.destroy = () => {
    if (toolbar._resizeObserver) {
      toolbar._resizeObserver.disconnect();
    }
    hideSubmenu();
    closeOverflowMenu();
    if (overflowMenu) overflowMenu.remove();
    toolbar.remove();
  };
  
  // API
  toolbar.getItem = (id) => toolbar.querySelector(`[data-toolbar-id="${id}"]`);
  toolbar.setItemDisabled = (id, disabled) => {
    const btn = toolbar.getItem(id);
    if (btn) {
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
      btn.setAttribute('aria-disabled', disabled);
    }
  };
  toolbar.setItemPressed = (id, pressed) => {
    const btn = toolbar.getItem(id);
    if (btn && btn.classList.contains('toolbar-btn-toggle')) {
      btn.classList.toggle('pressed', pressed);
      btn.setAttribute('aria-checked', pressed);
    }
  };
  toolbar.setItemHidden = (id, hidden) => {
    const btn = toolbar.getItem(id);
    if (btn) btn.hidden = hidden;
  };
  toolbar.addItem = (item, index = -1) => {
    if (index >= 0) {
      const items = toolbarContent.querySelectorAll('.toolbar-btn:not(.toolbar-overflow-btn)');
      if (index < items.length) {
        const btn = createButton(item);
        toolbarContent.insertBefore(btn, items[index]);
      } else {
        const btn = createButton(item);
        toolbarContent.appendChild(btn);
      }
    } else {
      const btn = createButton(item);
      toolbarContent.appendChild(btn);
    }
    if (overflowMenu) handleOverflow();
  };
  toolbar.removeItem = (id) => {
    const btn = toolbar.getItem(id);
    if (btn) btn.remove();
    if (overflowMenu) handleOverflow();
  };
  
  return toolbar;
}

/**
 * Mount toolbar to DOM
 * @param {ToolbarConfig} config - Toolbar configuration
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement} Toolbar element
 */
export function mountToolbar(config, container) {
  const toolbar = createToolbar(config);
  container.appendChild(toolbar);
  return toolbar;
}

export default createToolbar;