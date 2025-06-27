/**
 * Configuration options for the state proxy
 */
export interface ProxyOptions {
  /** If true, throttle onChange callbacks using requestAnimationFrame */
  raf?: boolean;
  /** If true, wrap nested objects/arrays in proxies for deep reactivity */
  shallow?: boolean;
  /** If true, expose a read-only __v property that increments on each change */
  versioning?: boolean;
}

/**
 * Creates a reactive proxy wrapper around a state object that triggers
 * a callback whenever any property is modified (including nested properties).
 */
export function createStateProxy<S>(
  target: S,
  onChange: () => void,
  options: ProxyOptions = {}
): S & { readonly __v?: number } {
  const { raf = false, shallow = false, versioning = false } = options;

  let dirty = false;
  let version = 0;
  const proxyCache = new WeakMap<object, any>();

  const trigger = () => {
    onChange();
  };

  const schedule = () => {
    if (versioning) {
      version++;
    }

    if (raf) {
      if (!dirty) {
        dirty = true;
        requestAnimationFrame(() => {
          dirty = false;
          trigger();
        });
      }
    } else {
      trigger();
    }
  };

  const handler: ProxyHandler<any> = {
    get(obj, prop, recv) {
      // Expose version if versioning is enabled
      if (versioning && prop === "__v") {
        return version;
      }

      const value = Reflect.get(obj, prop, recv);

      // If the value is an object/array and we're doing deep proxying,
      // wrap it in a proxy as well
      if (typeof value === "object" && value !== null && !shallow) {
        const cached = proxyCache.get(value);
        if (cached) return cached;

        const proxied = new Proxy(value, handler);
        proxyCache.set(value, proxied);
        return proxied;
      }

      return value;
    },

    set(obj, prop, value, recv) {
      const oldValue = Reflect.get(obj, prop, recv);
      const result = Reflect.set(obj, prop, value, recv);

      // Trigger onChange callback only when value actually changes
      if (result && oldValue !== value) {
        schedule();
      }

      return result;
    },

    deleteProperty(obj, prop) {
      const hadProperty = Reflect.has(obj, prop);
      const result = Reflect.deleteProperty(obj, prop);

      // Trigger onChange callback only when property was actually deleted
      if (result && hadProperty) {
        schedule();
      }

      return result;
    },
  };

  const proxy = new Proxy(target, handler);

  // Make __v non-enumerable and read-only if versioning is enabled
  if (versioning) {
    Object.defineProperty(proxy, "__v", {
      get: () => version,
      enumerable: false,
      configurable: false,
    });
  }

  return proxy as S & { readonly __v?: number };
}
