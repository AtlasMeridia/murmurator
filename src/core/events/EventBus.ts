// Simple pub/sub event bus for decoupled communication

export type Unsubscribe = () => void;
export type EventCallback<T = unknown> = (data: T) => void;

export class EventBus {
  private channels: Map<string, Set<EventCallback>> = new Map();

  publish<T>(channel: string, data: T): void {
    const callbacks = this.channels.get(channel);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${channel}:`, error);
        }
      });
    }
  }

  subscribe<T>(channel: string, callback: EventCallback<T>): Unsubscribe {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    const callbacks = this.channels.get(channel)!;
    callbacks.add(callback as EventCallback);

    return () => {
      callbacks.delete(callback as EventCallback);
      if (callbacks.size === 0) {
        this.channels.delete(channel);
      }
    };
  }

  unsubscribe(channel: string, callback: EventCallback): void {
    const callbacks = this.channels.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.channels.delete(channel);
      }
    }
  }

  // Clear all subscriptions (useful for cleanup)
  clear(): void {
    this.channels.clear();
  }

  // Check if a channel has subscribers
  hasSubscribers(channel: string): boolean {
    const callbacks = this.channels.get(channel);
    return callbacks !== undefined && callbacks.size > 0;
  }
}

// Singleton instance for the application
export const eventBus = new EventBus();
