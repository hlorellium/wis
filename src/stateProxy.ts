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

    const trigger = () => {
        if (versioning) {
            version++;
        }
        onChange();
    };

    const schedule = () => {
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
            if (versioning && prop === '__v') {
                return version;
            }

            const value = Reflect.get(obj, prop, recv);

            // If the value is an object/array and we're doing deep proxying,
            // wrap it in a proxy as well
            if (typeof value === 'object' && value !== null && !shallow) {
                return new Proxy(value, handler);
            }

            return value;
        },

        set(obj, prop, value, recv) {
            const result = Reflect.set(obj, prop, value, recv);

            // Trigger onChange callback when any property is set
            if (result) {
                // Optional: Add logging for debugging (remove in production)
                // console.log('State changed:', prop, value, versioning ? `(v${version + 1})` : '');
                schedule();
            }

            return result;
        }
    };

    const proxy = new Proxy(target, handler);

    // Make __v non-enumerable and read-only if versioning is enabled
    if (versioning) {
        Object.defineProperty(proxy, '__v', {
            get: () => version,
            enumerable: false,
            configurable: false
        });
    }

    return proxy as S & { readonly __v?: number };
}
