// File: core/JSForm.Logger.js

/**
 * JSForm Core Logger & Security Sanitizer (OWASP Top 10 Compliant)
 * 
 * Intercepta de forma transparente y no destructiva los métodos de window.console,
 * aplicando sanitización recursiva profunda sobre datos sensibles (passwords, tokens,
 * JWTs, credenciales, tarjetas) y controlando la visibilidad de logs según el entorno.
 */

const globalConsole = typeof window !== 'undefined' && window.console 
    ? window.console 
    : (typeof console !== 'undefined' ? console : null);

export class Logger {

    static _initialized = false;
    static _isPatched = false;
    static _environment = 'development';
    static _sanitizeEnabled = true;
    static _maskString = '[PROTECTED]';

    static _defaultSensitiveKeys = [
        'password', 'passwd', 'contrasena', 'contraseña', 'clave',
        'token', 'jwt', 'secret', 'authorization', 'auth',
        'cvv', 'pin', 'creditcard', 'tarjeta'
    ];

    static _sensitiveKeys = [
        'password', 'passwd', 'contrasena', 'contraseña', 'clave',
        'token', 'jwt', 'secret', 'authorization', 'auth',
        'cvv', 'pin', 'creditcard', 'tarjeta'
    ];

    /**
     * Referencias directas a la consola nativa original del entorno.
     */
    static _nativeConsole = {
        log: globalConsole?.log ? globalConsole.log.bind(globalConsole) : () => {},
        info: globalConsole?.info ? globalConsole.info.bind(globalConsole) : () => {},
        debug: (globalConsole?.debug || globalConsole?.log) ? (globalConsole.debug || globalConsole.log).bind(globalConsole) : () => {},
        warn: globalConsole?.warn ? globalConsole.warn.bind(globalConsole) : () => {},
        error: globalConsole?.error ? globalConsole.error.bind(globalConsole) : () => {}
    };

    /**
     * Inicializa el Logger y activa el parche global de consola según la configuración.
     * @param {Object} config - Configuración global de la aplicación (jsform.config.js o similar)
     */
    static init(config = {}) {
        if (config.environment) {
            this._environment = config.environment;
        } else if (config.AppConfig?.environment) {
            this._environment = config.AppConfig.environment;
        }

        const secConfig = config.security || config.AppConfig?.security || {};

        if (secConfig.sanitizeLogs !== undefined) {
            this._sanitizeEnabled = !!secConfig.sanitizeLogs;
        }
        if (secConfig.maskString) {
            this._maskString = secConfig.maskString;
        }
        if (Array.isArray(secConfig.sensitiveKeys)) {
            this.addSensitiveKeys(secConfig.sensitiveKeys);
        }

        if (!this._isPatched) {
            this._patchGlobalConsole();
        }

        this._initialized = true;
    }

    /**
     * Añade claves adicionales a la lista de inspección de datos sensibles.
     * @param {string|string[]} keys - Clave o arreglo de claves a proteger.
     */
    static addSensitiveKeys(keys) {
        if (Array.isArray(keys)) {
            keys.forEach(k => {
                if (typeof k === 'string' && !this._sensitiveKeys.includes(k)) {
                    this._sensitiveKeys.push(k);
                }
            });
        } else if (typeof keys === 'string' && !this._sensitiveKeys.includes(keys)) {
            this._sensitiveKeys.push(keys);
        }
    }

    /**
     * Determina si una clave coincide con patrones sensibles conocidos.
     * @private
     */
    static _isSensitiveKey(key) {
        if (!key || typeof key !== 'string') return false;
        const lowerKey = key.toLowerCase();

        // 1. Coincidencia exacta directa
        for (const sensitive of this._sensitiveKeys) {
            const cleanSens = sensitive.toLowerCase();
            if (lowerKey === cleanSens) return true;
        }

        // 2. Tokenización por camelCase, guiones y puntos (ej. userPassword -> ['user', 'password'])
        const parts = key
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[-_.]+/g, ' ')
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        for (const sensitive of this._sensitiveKeys) {
            const cleanSens = sensitive.toLowerCase();
            if (parts.includes(cleanSens)) return true;
        }

        // 3. Coincidencia en palabras compuestas sin separador (ej. "userpassword", "authtoken", "accesstoken")
        const strippedKey = lowerKey.replace(/[-_\s]/g, '');
        const compoundSensitives = [
            'password', 'passwd', 'contrasena', 'contraseña', 
            'clave', 'secret', 'token', 'creditcard', 'authorization'
        ];

        for (const sens of compoundSensitives) {
            if (this._sensitiveKeys.includes(sens) && strippedKey.includes(sens)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitiza de forma recursiva profunda cualquier tipo de dato u objeto.
     * Protege contra referencias circulares y preserva instancias de Error y HTMLElement.
     * @param {*} data - Dato a sanitizar.
     * @param {WeakSet} [seen=new WeakSet()] - Control interno de referencias circulares.
     * @returns {*} Versión sanitizada del dato.
     */
    static sanitize(data, seen = new WeakSet()) {
        if (!this._sanitizeEnabled || data === null || data === undefined) {
            return data;
        }

        // 1. Cadenas de texto
        if (typeof data === 'string') {
            const trimmed = data.trim();
            // Token JWT completo (formato ey...)
            if (/^ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(trimmed)) {
                return this._maskString;
            }
            // Cabecera o string con Bearer JWT
            if (/Bearer\s+ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i.test(data)) {
                return data.replace(/Bearer\s+ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, `Bearer ${this._maskString}`);
            }
            return data;
        }

        // 2. Primitivos que no son objetos
        if (typeof data !== 'object') {
            return data;
        }

        // 3. Nodos del DOM (HTMLElement) - evitar recursión infinita en propiedades del navegador
        if ((typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) || 
            (data.nodeType && typeof data.nodeName === 'string')) {
            return data;
        }

        // 4. Detección y prevención de referencias circulares
        if (seen.has(data)) {
            return '[Circular Reference]';
        }
        seen.add(data);

        // 5. Arreglos
        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item, seen));
        }

        // 6. Instancias de Error (preservar name, message y stack original para DevTools)
        if (data instanceof Error) {
            const errCopy = Object.create(Object.getPrototypeOf(data));
            errCopy.name = data.name;
            errCopy.message = data.message;
            errCopy.stack = data.stack;

            for (const key of Object.getOwnPropertyNames(data)) {
                if (key === 'name' || key === 'message' || key === 'stack') continue;
                if (this._isSensitiveKey(key)) {
                    errCopy[key] = this._maskString;
                } else {
                    errCopy[key] = this.sanitize(data[key], seen);
                }
            }
            return errCopy;
        }

        // 7. Objetos planos o instancias personalizadas
        const result = {};
        for (const key of Object.keys(data)) {
            if (this._isSensitiveKey(key)) {
                result[key] = this._maskString;
            } else {
                result[key] = this.sanitize(data[key], seen);
            }
        }
        return result;
    }

    /**
     * Intercepta console global con wrappers que aplican sanitización y silenciado.
     * @private
     */
    static _patchGlobalConsole() {
        if (this._isPatched || !globalConsole) return;

        globalConsole.log = (...args) => this.log(...args);
        globalConsole.info = (...args) => this.info(...args);
        globalConsole.debug = (...args) => this.debug(...args);
        globalConsole.warn = (...args) => this.warn(...args);
        globalConsole.error = (...args) => this.error(...args);

        this._isPatched = true;
    }

    /**
     * Restaura los métodos nativos originales de window.console.
     */
    static restore() {
        if (!this._isPatched || !globalConsole) return;

        globalConsole.log = this._nativeConsole.log;
        globalConsole.info = this._nativeConsole.info;
        globalConsole.debug = this._nativeConsole.debug;
        globalConsole.warn = this._nativeConsole.warn;
        globalConsole.error = this._nativeConsole.error;

        this._isPatched = false;
    }

    /**
     * Registro a nivel de depuración/general (silenciado en producción).
     */
    static log(...args) {
        if (this._environment === 'production') return;
        const sanitizedArgs = args.map(arg => this.sanitize(arg));
        this._nativeConsole.log(...sanitizedArgs);
    }

    /**
     * Registro informativo (silenciado en producción).
     */
    static info(...args) {
        if (this._environment === 'production') return;
        const sanitizedArgs = args.map(arg => this.sanitize(arg));
        this._nativeConsole.info(...sanitizedArgs);
    }

    /**
     * Registro detallado de depuración (silenciado en producción).
     */
    static debug(...args) {
        if (this._environment === 'production') return;
        const sanitizedArgs = args.map(arg => this.sanitize(arg));
        this._nativeConsole.debug(...sanitizedArgs);
    }

    /**
     * Registro de advertencia (siempre activo, siempre sanitizado).
     */
    static warn(...args) {
        const sanitizedArgs = args.map(arg => this.sanitize(arg));
        this._nativeConsole.warn(...sanitizedArgs);
    }

    /**
     * Registro de error (siempre activo, siempre sanitizado).
     */
    static error(...args) {
        const sanitizedArgs = args.map(arg => this.sanitize(arg));
        this._nativeConsole.error(...sanitizedArgs);
    }
}

