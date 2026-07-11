/**
 * ZyncPDF - Event Emitter
 * Lightweight event system for decoupled communication
 */

type EventHandler = (...args: any[]) => void;
type EventMap = Record<string, EventHandler[]>;

export class EventEmitter {
  private events: EventMap = {};
  private onceEvents: EventMap = {};

  /**
   * Register an event listener
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, handler: EventHandler): () => void {
    if (!this.onceEvents[event]) {
      this.onceEvents[event] = [];
    }
    this.onceEvents[event].push(handler);

    return () => this.off(event, handler);
  }

  /**
   * Remove an event listener
   */
  off(event: string, handler: EventHandler): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(h => h !== handler);
    }
    if (this.onceEvents[event]) {
      this.onceEvents[event] = this.onceEvents[event].filter(h => h !== handler);
    }
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, ...args: any[]): void {
    // Regular listeners
    if (this.events[event]) {
      this.events[event].forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in handler for "${event}":`, error);
        }
      });
    }

    // One-time listeners
    if (this.onceEvents[event]) {
      this.onceEvents[event].forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in once handler for "${event}":`, error);
        }
      });
      delete this.onceEvents[event];
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
      delete this.onceEvents[event];
    } else {
      this.events = {};
      this.onceEvents = {};
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return (this.events[event]?.length || 0) + (this.onceEvents[event]?.length || 0);
  }

  /**
   * Check if event has listeners
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Wait for an event to be emitted (Promise-based)
   */
  waitFor(event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      const handler = (...args: any[]) => {
        clearTimeout(timer);
        resolve(args.length === 1 ? args[0] : args);
      };

      this.once(event, handler);
    });
  }

  /**
   * Create a namespaced emitter
   */
  namespace(prefix: string): EventEmitter {
    const emitter = new EventEmitter();
    const originalEmit = emitter.emit.bind(emitter);
    
    emitter.emit = (event: string, ...args: any[]) => {
      originalEmit(event, ...args);
      this.emit(`${prefix}:${event}`, ...args);
    };

    return emitter;
  }
}

/**
 * Typed event emitter for better TypeScript support
 */
export class TypedEventEmitter<Events extends Record<string, any[]>> {
  private emitter = new EventEmitter();

  on<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): () => void {
    return this.emitter.on(event as string, handler);
  }

  once<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): () => void {
    return this.emitter.once(event as string, handler);
  }

  off<K extends keyof Events>(event: K, handler: (...args: Events[K]) => void): void {
    this.emitter.off(event as string, handler);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    this.emitter.emit(event as string, ...args);
  }

  removeAllListeners(event?: keyof Events): void {
    this.emitter.removeAllListeners(event as string);
  }
}