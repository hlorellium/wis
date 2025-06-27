import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStateProxy } from '../src/stateProxy';

describe('createStateProxy', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('basic reactivity', () => {
    it('should trigger onChange when property is modified', () => {
      const target = { count: 0, name: 'test' };
      const proxy = createStateProxy(target, mockOnChange);

      proxy.count = 5;
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      proxy.name = 'updated';
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should not trigger onChange when property value does not change', () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange);

      proxy.count = 0; // Same value
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should trigger onChange for property deletion', () => {
      const target: Record<string, any> = { temp: 'value' };
      const proxy = createStateProxy(target, mockOnChange);

      delete proxy.temp;
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('deep reactivity (shallow = false)', () => {
    it('should trigger onChange for nested object modifications', () => {
      const target = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' }
      };
      const proxy = createStateProxy(target, mockOnChange);

      proxy.user.name = 'Jane';
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      proxy.settings.theme = 'light';
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should trigger onChange for nested array modifications', () => {
      const target = {
        items: [1, 2, 3],
        nested: { list: ['a', 'b'] }
      };
      const proxy = createStateProxy(target, mockOnChange);

      proxy.items.push(4);
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      proxy.nested.list[0] = 'x';
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should return the same proxy instance for the same nested object', () => {
      const target = { nested: { value: 1 } };
      const proxy = createStateProxy(target, mockOnChange);

      const nested1 = proxy.nested;
      const nested2 = proxy.nested;

      expect(nested1).toBe(nested2);
    });
  });

  describe('shallow reactivity (shallow = true)', () => {
    it('should not create proxies for nested objects when shallow is true', () => {
      const target = {
        user: { name: 'John', age: 30 }
      };
      const proxy = createStateProxy(target, mockOnChange, { shallow: true });

      // Direct modification should trigger
      proxy.user = { name: 'Jane', age: 25 };
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      // Nested modification should not trigger (shallow mode)
      proxy.user.name = 'Bob';
      expect(mockOnChange).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('versioning (versioning = true)', () => {
    it('should expose __v property that increments on changes', () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { versioning: true });

      expect(proxy.__v).toBe(0);

      proxy.count = 1;
      expect(proxy.__v).toBe(1);

      proxy.count = 2;
      expect(proxy.__v).toBe(2);
    });

    it('should not increment version when value does not change', () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { versioning: true });

      expect(proxy.__v).toBe(0);

      proxy.count = 0; // Same value
      expect(proxy.__v).toBe(0); // Version should not increment
    });

    it('should make __v property non-enumerable', () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { versioning: true });

      const keys = Object.keys(proxy);
      expect(keys).not.toContain('__v');

      const descriptors = Object.getOwnPropertyDescriptors(proxy);
      expect(descriptors.__v?.enumerable).toBe(false);
    });

    it('should increment version for nested changes when versioning is enabled', () => {
      const target = { nested: { value: 1 } };
      const proxy = createStateProxy(target, mockOnChange, { versioning: true });

      expect(proxy.__v).toBe(0);

      proxy.nested.value = 2;
      expect(proxy.__v).toBe(1);
    });
  });

  describe('RAF throttling (raf = true)', () => {
    it('should throttle onChange calls using requestAnimationFrame', async () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { raf: true });

      // Make multiple changes rapidly
      proxy.count = 1;
      proxy.count = 2;
      proxy.count = 3;

      // Should not have called onChange yet (throttled)
      expect(mockOnChange).not.toHaveBeenCalled();

      // Wait for RAF
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Should have called onChange only once
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should update version correctly even with RAF throttling', async () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { raf: true, versioning: true });

      proxy.count = 1;
      proxy.count = 2;

      // Version should update immediately even with RAF
      expect(proxy.__v).toBe(2);

      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('option combinations', () => {
    it('should work with versioning + shallow mode', () => {
      const target = { nested: { value: 1 } };
      const proxy = createStateProxy(target, mockOnChange, { 
        versioning: true, 
        shallow: true 
      });

      expect(proxy.__v).toBe(0);

      // Should increment for direct property changes
      proxy.nested = { value: 2 };
      expect(proxy.__v).toBe(1);

      // Should not increment for nested changes (shallow mode)
      proxy.nested.value = 3;
      expect(proxy.__v).toBe(1);
    });

    it('should work with versioning + RAF throttling', async () => {
      const target = { count: 0 };
      const proxy = createStateProxy(target, mockOnChange, { 
        versioning: true, 
        raf: true 
      });

      proxy.count = 1;
      proxy.count = 2;

      expect(proxy.__v).toBe(2);
      expect(mockOnChange).not.toHaveBeenCalled();

      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined and null values', () => {
      const target: Record<string, any> = { value: null };
      const proxy = createStateProxy(target, mockOnChange);

      proxy.value = undefined;
      expect(mockOnChange).toHaveBeenCalledTimes(1);

      proxy.value = null;
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should handle circular references gracefully', () => {
      const target: any = { name: 'root' };
      target.self = target;
      
      const proxy = createStateProxy(target, mockOnChange);
      
      // Should not throw when accessing circular reference
      expect(() => proxy.self.name).not.toThrow();
      
      proxy.self.name = 'updated';
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should preserve original object prototype', () => {
      class TestClass {
        constructor(public value: number) {}
        getValue() { return this.value; }
      }

      const target = new TestClass(42);
      const proxy = createStateProxy(target, mockOnChange);

      expect(proxy).toBeInstanceOf(TestClass);
      expect(proxy.getValue()).toBe(42);
    });
  });
});
