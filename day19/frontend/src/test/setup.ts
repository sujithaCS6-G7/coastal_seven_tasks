import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import { resetMockCart } from './mocks/handlers';

// Mock IntersectionObserver for jsdom (used by infinite scrolling hook)
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock window.scrollTo for pagination navigation
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

// Controllable MockWebSocket for jsdom real-time testing
export class MockWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: MockWebSocket[] = [];

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  sentMessages: string[] = [];

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send = vi.fn((data: string) => {
    this.sentMessages.push(data);
  });

  close = vi.fn((code = 1000, reason = 'Normal Closure') => {
    this.readyState = MockWebSocket.CLOSED;
    const ev = new CloseEvent('close', { code, reason, wasClean: code === 1000 });
    if (this.onclose) {
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
  });

  // Helper methods for unit/integration tests
  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    const ev = new Event('open');
    if (this.onopen) {
      this.onopen(ev);
    }
    this.dispatchEvent(ev);
  }

  triggerMessage(payload: unknown): void {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const ev = new MessageEvent('message', { data });
    if (this.onmessage) {
      this.onmessage(ev);
    }
    this.dispatchEvent(ev);
  }

  triggerError(): void {
    const ev = new Event('error');
    if (this.onerror) {
      this.onerror(ev);
    }
    this.dispatchEvent(ev);
  }

  triggerClose(code = 1006, reason = 'Abnormal Closure'): void {
    this.readyState = MockWebSocket.CLOSED;
    const ev = new CloseEvent('close', { code, reason, wasClean: code === 1000 });
    if (this.onclose) {
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
  }
}

const installMockWebSocket = () => {
  Object.defineProperty(globalThis, 'WebSocket', {
    writable: true,
    configurable: true,
    value: MockWebSocket,
  });

  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    configurable: true,
    value: MockWebSocket,
  });
};

installMockWebSocket();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  installMockWebSocket();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockCart();
  localStorage.clear();
  MockWebSocket.instances = [];
  installMockWebSocket();
});

afterAll(() => {
  server.close();
});


