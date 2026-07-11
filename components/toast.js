/**
 * @file Toast Component
 * Non-intrusive notification system with animations and accessibility
 * @module components/toast
 */

/**
 * Toast options
 * @typedef {Object} ToastOptions
 * @property {string} message - Toast message
 * @property {string} [type='info'] - Type: 'success', 'error', 'warning', 'info'
 * @property {string} [title] - Optional title
 * @property {number} [duration=5000] - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @property {boolean} [dismissible=true] - Allow manual dismiss
 * @property {Function} [onDismiss] - Callback when dismissed
 * @property {string} [actionLabel] - Action button label
 * @property {Function} [action] - Action button callback
 */

/**
 * Toast container instance
 */
let toastContainer = null;

/**
 * Get or create toast container
 * @returns {HTMLElement} Toast container element
 */
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'region');
    toastContainer.setAttribute('aria-label', 'Notifications');
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Toast icons
 */
const TOAST_ICONS = {
  success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
  warning: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  loading: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="spin"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>'
};

/**
 * Show toast notification
 * @param {ToastOptions} options - Toast options
 * @returns {Function} Dismiss function
 */
export function showToast(options = {}) {
  const {
    message,
    type = 'info',
    title,
    duration = 5000,
    dismissible = true,
    onDismiss,
    actionLabel,
    action
  } = options;
  
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  const hasAction = actionLabel && action;
  
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      <div class="toast-message">${escapeHtml(message)}</div>
      ${hasAction ? `<button class="toast-action" type="button">${escapeHtml(actionLabel)}</button>` : ''}
    </div>
    ${dismissible ? `
      <button class="toast-close" type="button" aria-label="Dismiss notification">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    ` : ''}
    <div class="toast-progress" aria-hidden="true"></div>
  `;
  
  let dismissed = false;
  let progressInterval = null;
  
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    
    if (progressInterval) clearInterval(progressInterval);
    
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
      onDismiss?.();
    }, { once: true });
    
    // Fallback cleanup
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
        onDismiss?.();
      }
    }, 300);
  };
  
  // Action button
  if (hasAction) {
    toast.querySelector('.toast-action').addEventListener('click', () => {
      action();
      dismiss();
    });
  }
  
  // Close button
  if (dismissible) {
    toast.querySelector('.toast-close').addEventListener('click', dismiss);
  }
  
  // Auto-dismiss with progress bar
  if (duration > 0) {
    const progressBar = toast.querySelector('.toast-progress');
    let elapsed = 0;
    const step = 50; // ms
    
    progressInterval = setInterval(() => {
      elapsed += step;
      const progress = Math.min(elapsed / duration, 1);
      progressBar.style.transform = `scaleX(${1 - progress})`;
      
      if (progress >= 1) {
        clearInterval(progressInterval);
        dismiss();
      }
    }, step);
    
    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    });
    
    toast.addEventListener('mouseleave', () => {
      if (!dismissed && duration > 0) {
        const remaining = duration - elapsed;
        progressInterval = setInterval(() => {
          elapsed += step;
          const progress = Math.min(elapsed / duration, 1);
          progressBar.style.transform = `scaleX(${1 - progress})`;
          
          if (progress >= 1) {
            clearInterval(progressInterval);
            dismiss();
          }
        }, step);
      }
    });
  }
  
  // Add to container
  container.appendChild(toast);
  
  // Trigger entrance animation
  requestAnimationFrame(() => {
    toast.style.animationPlayState = 'running';
  });
  
  return dismiss;
}

/**
 * Show success toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 * @returns {Function} Dismiss function
 */
export function showSuccess(message, options = {}) {
  return showToast({ ...options, message, type: 'success' });
}

/**
 * Show error toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 * @returns {Function} Dismiss function
 */
export function showError(message, options = {}) {
  return showToast({ ...options, message, type: 'error', duration: 8000 });
}

/**
 * Show warning toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 * @returns {Function} Dismiss function
 */
export function showWarning(message, options = {}) {
  return showToast({ ...options, message, type: 'warning', duration: 7000 });
}

/**
 * Show info toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 * @returns {Function} Dismiss function
 */
export function showInfo(message, options = {}) {
  return showToast({ ...options, message, type: 'info' });
}

/**
 * Show loading toast
 * @param {string} message - Message
 * @param {Object} options - Additional options
 * @returns {Function} Dismiss function
 */
export function showLoading(message, options = {}) {
  return showToast({ 
    ...options, 
    message, 
    type: 'loading', 
    duration: 0, 
    dismissible: false 
  });
}

/**
 * Update toast message
 * @param {Function} dismiss - Dismiss function from showToast
 * @param {string} message - New message
 * @param {string} type - New type
 */
export function updateToast(dismiss, message, type = 'info') {
  // This would require storing toast reference - simplified for now
  dismiss();
  return showToast({ message, type });
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  if (toastContainer) {
    toastContainer.querySelectorAll('.toast').forEach(toast => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    });
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default showToast;