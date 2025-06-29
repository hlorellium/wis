/**
 * BroadcastChannel polyfill for testing environments
 * Allows multi-tab sync tests to work in isolated browser contexts
 */

interface BroadcastChannelMessage {
  data: any;
  type: string;
  target: MockBroadcastChannel;
}

class MockBroadcastChannel implements BroadcastChannel {
  private static channels = new Map<string, Set<MockBroadcastChannel>>();
  
  public name: string;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: any): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (!channels) return;

    // Simulate async behavior with microtask
    Promise.resolve().then(() => {
      channels.forEach(channel => {
        if (channel !== this && channel.onmessage) {
          const event = new MessageEvent('message', {
            data: message,
            origin: 'http://localhost',
            source: null
          });
          channel.onmessage(event);
        }
      });
    });
  }

  close(): void {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.onmessage = listener as (event: MessageEvent) => void;
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'message') {
      this.onmessage = null;
    }
  }

  dispatchEvent(event: Event): boolean {
    if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent);
      return true;
    }
    return false;
  }

  /**
   * Test utility to clear all channels
   */
  static clearAll(): void {
    MockBroadcastChannel.channels.clear();
  }
}

// Install polyfill globally
if (typeof globalThis !== 'undefined' && !globalThis.BroadcastChannel) {
  globalThis.BroadcastChannel = MockBroadcastChannel as any;
}

export { MockBroadcastChannel };
