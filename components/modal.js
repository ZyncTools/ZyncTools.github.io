/**
 * @file Modal Component
 * Accessible modal dialog with focus trapping, animations, and keyboard support
 * @module components/modal
 */

/**
 * @typedef {Object} ModalOptions
 * @property {string} [id] - Unique ID for the modal
 * @property {string} title - Modal title
 * @property {HTMLElement|string} content - Modal content
 * @property {string} [size='md'] - Size: 'sm', 'md', 'lg', 'xl', 'full'
 * @property {boolean} [closeOnOverlayClick=true] - Close on backdrop click
 * @property {boolean} [closeOnEscape=true] - Close on Escape key
 * @property {boolean} [showCloseButton=true] - Show close button
 * @property {Object[]} [actions] - Action buttons
 * @property {string} actions[].label - Button label
 * @property {Function} actions[].onClick - Click handler
 * @property {string} [actions[].variant='primary'] - Button variant: 'primary', 'secondary', 'ghost', 'danger'
 * @property {boolean} [actions[].closeOnClick=true] - Close modal on click
 * @property {Function} [onOpen] - Called when modal opens
 * @property {Function} [onClose] - Called when modal closes
 * @property {boolean} [destroyOnClose=true] - Remove from DOM on close
 */

/**
 * Modal size classes
 */
const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4 my-4'
};

/**
 * Create modal element
 * @param {ModalOptions} options - Modal options
 * @returns {HTMLElement} Modal overlay element
 */
export function createModal(options = {}) {
  const {
    id = `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title = '',
    content = '',
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    actions = [],
    onOpen,
    onClose,
    destroyOnClose = true
  } = options;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', `${id}-title`);
  overlay.id = id;
  overlay.dataset.destroyOnClose = destroyOnClose;
  
  const modal = document.createElement('div');
  modal.className = `modal ${SIZE_CLASSES[size] || SIZE_CLASSES.md}`;
  
  let actionButtons = '';
  if (actions.length > 0) {
    actionButtons = `
      <div class="modal-footer">
        ${actions.map((action, i) => `
          <button 
            `<button class="btn btn-${action.variant || 'secondary'}" data-action="${i}" type="button">${action.label}</button>`
          ).join('')}
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-header">
      <h2 id="${id}-title" class="modal-title">${title}</h2>
      ${showCloseButton ? `
        <button class="modal-close" type="button" aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
    </div>
    <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
    ${actionButtons}
  `;
  
  // Append content if it's an element
  if (content instanceof HTMLElement) {
    const body = modal.querySelector('.modal-body');
    body.innerHTML = '';
    body.appendChild(content);
  }
  
  overlay.appendChild(modal);
  
  // Store action handlers
  overlay._actions = actions;
  overlay._onClose = onClose;
  overlay._onOpen = onOpen;
  overlay._closeOnEscape = closeOnEscape;
  
  // Event listeners
  if (closeOnOverlayClick) {
    overlay.addEventListener('click', handleOverlayClick);
  }
  
  modal.addEventListener('click', handleModalClick);
  
  // Close button
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal(overlay));
  }
  
  // Action buttons
  modal.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.action, 10);
      const action = actions[index];
      if (action?.onClick) {
        const shouldClose = action.closeOnClick !== false;
        Promise.resolve(action.onClick(e, overlay)).then(() => {
          if (shouldClose) closeModal(overlay);
        });
      } else if (action?.closeOnClick !== false) {
        closeModal(overlay);
      }
    });
  });
  
  // Keyboard handling
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      closeModal(overlay);
    } else if (e.key === 'Tab') {
      trapFocus(e, modal);
    }
  };
  
  overlay._handleKeyDown = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown);
  
  // Focus management
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  overlay._firstFocusable = focusableElements[0];
  overlay._lastFocusable = focusableElements[focusableElements.length - 1];
  overlay._previousActiveElement = document.activeElement;
  
  return overlay;
}

/**
 * Handle overlay click
 * @param {Event} e - Click event
 */
function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    closeModal(e.currentTarget);
  }
}

/**
 * Handle modal click (prevent closing when clicking inside)
 * @param {Event} e - Click event
 */
function handleModalClick(e) {
  e.stopPropagation();
}

/**
 * Trap focus within modal
 * @param {KeyboardEvent} e - Key event
 * @param {HTMLElement} modal - Modal element
 */
function trapFocus(e, modal) {
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
}

/**
 * Open modal
 * @param {HTMLElement} overlay - Modal overlay
 * @returns {Promise<void>}
 */
export function openModal(overlay) {
  return new Promise((resolve) => {
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    
    // Force reflow
    overlay.offsetHeight;
    
    overlay.classList.add('open');
    
    // Focus management
    setTimeout(() => {
      const focusable = overlay.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
      overlay._onOpen?.(overlay);
      resolve();
    }, 50);
  });
}

/**
 * Close modal
 * @param {HTMLElement} overlay - Modal overlay
 * @returns {Promise<void>}
 */
export function closeModal(overlay) {
  return new Promise((resolve) => {
    overlay.classList.remove('open');
    
    const cleanup = () => {
      document.removeEventListener('keydown', overlay._handleKeyDown);
      
      if (overlay._previousActiveElement) {
        overlay._previousActiveElement.focus();
      }
      
      document.body.style.overflow = '';
      
      if (overlay.dataset.destroyOnClose === 'true') {
        overlay.remove();
      }
      
      overlay._onClose?.(overlay);
      resolve();
    };
    
    // Wait for animation
    overlay.addEventListener('transitionend', cleanup, { once: true });
    
    // Fallback
    setTimeout(cleanup, 300);
  });
}

/**
 * Show modal with options
 * @param {ModalOptions} options - Modal options
 * @returns {Promise<HTMLElement>} Modal overlay
 */
export function showModal(options) {
  const overlay = createModal(options);
  return openModal(overlay).then(() => overlay);
}

/**
 * Alert modal
 * @param {string} message - Message
 * @param {string} [title='Alert'] - Title
 * @param {Object} [options] - Additional options
 * @returns {Promise<void>}
 */
export function alert(message, title = 'Alert', options = {}) {
  return showModal({
    title,
    content: `<p class="modal-alert-message">${message}</p>`,
    size: 'sm',
    actions: [{ label: 'OK', variant: 'primary', onClick: () => {} }],
    ...options
  });
}

/**
 * Confirm modal
 * @param {string} message - Message
 * @param {string} [title='Confirm'] - Title
 * @param {Object} [options] - Additional options
 * @returns {Promise<boolean>} True if confirmed
 */
export function confirm(message, title = 'Confirm', options = {}) {
  return new Promise((resolve) => {
    showModal({
      title,
      content: `<p class="modal-confirm-message">${message}</p>`,
      size: 'sm',
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: () => resolve(false) },
        { label: 'Confirm', variant: options.danger ? 'danger' : 'primary', onClick: () => resolve(true) }
      ],
      ...options
    });
  });
}

/**
 * Prompt modal
 * @param {string} message - Message
 * @param {string} [title='Prompt'] - Title
 * @param {string} [defaultValue=''] - Default value
 * @param {Object} [options] - Additional options
 * @returns {Promise<string|null>} Entered value or null if cancelled
 */
export function prompt(message, title = 'Prompt', defaultValue = '', options = {}) {
  return new Promise((resolve) => {
    const inputId = `prompt-input-${Date.now()}`;
    
    showModal({
      title,
      content: `
        <p class="modal-prompt-message">${message}</p>
        <input type="text" id="${inputId}" class="input" value="${defaultValue}" autofocus>
      `,
      size: 'sm',
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: () => resolve(null) },
        { 
          label: 'OK', 
          variant: 'primary', 
          onClick: (e, overlay) => {
            const input = overlay.querySelector(`#${inputId}`);
            resolve(input?.value || '');
          }
        }
      ],
      onOpen: (overlay) => {
        const input = overlay.querySelector(`#${inputId}`);
        input?.focus();
        input?.select();
      },
      ...options
    });
  });
}

/**
 * Update modal content
 * @param {HTMLElement} overlay - Modal overlay
 * @param {HTMLElement|string} content - New content
 */
export function updateModalContent(overlay, content) {
  const body = overlay.querySelector('.modal-body');
  if (body) {
    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.innerHTML = '';
      body.appendChild(content);
    }
  }
}

/**
 * Update modal title
 * @param {HTMLElement} overlay - Modal overlay
 * @param {string} title - New title
 */
export function updateModalTitle(overlay, title) {
  const titleEl = overlay.querySelector('.modal-title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}

/**
 * Set modal loading state
 * @param {HTMLElement} overlay - Modal overlay
 * @param {boolean} loading - Loading state
 */
export function setModalLoading(overlay, loading) {
  const actions = overlay.querySelectorAll('.modal-footer .btn');
  actions.forEach(btn => {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.innerHTML = '<span class="btn-spinner"></span> Loading...';
    } else if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  });
}

export default createModal;