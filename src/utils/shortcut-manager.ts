/**
 * ZyncPDF - Shortcut Manager
 * Handles global keyboard shortcuts with context awareness
 */

import { KeyboardShortcut } from '../types/index.js';
import { EventEmitter } from './event-emitter.js';

export class ShortcutManager extends EventEmitter {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private pressedKeys: Set<string> = new Set();
  private isInputFocused = false;
  private context = 'global';

  constructor() {
    super();
    this.init();
  }

  private init(): void {
    // Track key states
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Track input focus
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));

    // Prevent default browser shortcuts we want to override
    document.addEventListener('keydown', (e) => {
      const combo = this.getKeyCombo(e);
      if (this.shortcuts.has(combo)) {
        // Only prevent default if not in input
        if (!this.isInputFocused || this.shortcuts.get(combo)?.allowInInput) {
          e.preventDefault();
        }
      }
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.pressedKeys.add(this.normalizeKey(e.key));
    
    // Update modifier states
    this.pressedKeys.add(e.ctrlKey ? 'Control' : '');
    this.pressedKeys.add(e.metaKey ? 'Meta' : '');
    this.pressedKeys.add(e.shiftKey ? 'Shift' : '');
    this.pressedKeys.add(e.altKey ? 'Alt' : '');
    
    // Remove empty strings
    this.pressedKeys.delete('');
    
    const combo = this.getKeyCombo(e);
    const shortcut = this.shortcuts.get(combo);
    
    if (shortcut && (!this.isInputFocused || shortcut.allowInInput)) {
      if (shortcut.when && !this.matchContext(shortcut.when)) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      this.emit('shortcut:triggered', { shortcut, combo, event: e });
      shortcut.action(e);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.pressedKeys.delete(this.normalizeKey(e.key));
    this.pressedKeys.delete(e.ctrlKey ? 'Control' : '');
    this.pressedKeys.delete(e.metaKey ? 'Meta' : '');
    this.pressedKeys.delete(e.shiftKey ? 'Shift' : '');
    this.pressedKeys.delete(e.altKey ? 'Alt' : '');
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    this.isInputFocused = this.isEditableElement(target);
  }

  private handleFocusOut(): void {
    this.isInputFocused = false;
  }

  private isEditableElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tagName)) return true;
    if (element.isContentEditable) return true;
    if (element.closest('[contenteditable="true"]')) return true;
    
    return false;
  }

  private normalizeKey(key: string): string {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
      'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
      'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
    };
    return keyMap[key] || key.toUpperCase();
  }

  private getKeyCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (e.ctrlKey) parts.push('Control');
    if (e.metaKey) parts.push('Meta');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    
    const key = this.normalizeKey(e.key);
    if (!['Control', 'Meta', 'Shift', 'Alt'].includes(key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  private matchContext(context: string): boolean {
    // Simple context matching - can be extended
    if (context === 'global') return true;
    if (context === 'editor' && this.context === 'editor') return true;
    if (context === 'viewer' && this.context === 'viewer') return true;
    if (context === 'sidebar' && this.context === 'sidebar') return true;
    return false;
  }

  /**
   * Register a single shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    const combo = this.shortcutToCombo(shortcut);
    this.shortcuts.set(combo, shortcut);
  }

  /**
   * Register multiple shortcuts
   */
  registerMultiple(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(s => this.register(s));
  }

  /**
   * Unregister a shortcut
   */
  unregister(shortcut: KeyboardShortcut): void {
    const combo = this.shortcutToCombo(shortcut);
    this.shortcuts.delete(combo);
  }

  /**
   * Unregister by combo string
   */
  unregisterCombo(combo: string): void {
    this.shortcuts.delete(combo);
  }

  /**
   * Convert shortcut object to combo string
   */
  private shortcutToCombo(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Control');
    if (shortcut.meta) parts.push('Meta');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getByCategory(category: string): KeyboardShortcut[] {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * Get shortcut by combo
   */
  getByCombo(combo: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(combo);
  }

  /**
   * Set current context
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Get current context
   */
  getContext(): string {
    return this.context;
  }

  /**
   * Check if a shortcut is registered
   */
  has(combo: string): boolean {
    return this.shortcuts.has(combo);
  }

  /**
   * Format shortcut for display
   */
  static format(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    if (shortcut.meta) parts.push('⌘');
    if (shortcut.shift) parts.push('⇧');
    if (shortcut.alt) parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
    
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);
    
    return parts.join(' + ');
  }

  /**
   * Parse shortcut string (e.g., "Ctrl+K")
   */
  static parse(str: string): Partial<KeyboardShortcut> {
    const parts = str.split('+').map(p => p.trim());
    const result: Partial<KeyboardShortcut> = { key: '' };
    
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === 'ctrl' || lower === 'control') result.ctrl = true;
      else if (lower === 'meta' || lower === 'cmd' || lower === '⌘') result.meta = true;
      else if (lower === 'shift' || lower === '⇧') result.shift = true;
      else if (lower === 'alt' || lower === 'option' || lower === '⌥') result.alt = true;
      else result.key = part;
    }
    
    return result;
  }
}