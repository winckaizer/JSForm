// File: core/JSForm.State.js

/**
 * Global State Management for JSForm.
 * Handles in-memory data storage with fallback to SessionStorage or LocalStorage.
 * Soporta desacoplamiento estricto de ámbitos ('session', 'local', 'memory')
 * para prevenir resurrección de credenciales caducadas ("Zombie State").
 */
export class State {
    
    static _store = {};
    static _listeners = {};

    /**
     * Obtiene de forma segura el objeto de almacenamiento del navegador,
     * protegiendo ante SecurityError en navegación privada o iframes restrictivos.
     * @private
     */
    static _getStorage(type) {
        try {
            if (type === 'session' && typeof sessionStorage !== 'undefined') return sessionStorage;
            if (type === 'local' && typeof localStorage !== 'undefined') return localStorage;
        } catch (_) {
            return null;
        }
        return null;
    }

    /**
     * Limpia únicamente las claves pertenecientes al prefijo jsform_ en el storage especificado.
     * @private
     */
    static _clearPrefixedStorage(storage) {
        if (!storage) return;
        try {
            const keysToRemove = [];
            for (let i = 0; i < storage.length; i++) {
                const k = storage.key(i);
                if (k && k.startsWith('jsform_')) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => storage.removeItem(k));
        } catch (_) {
            // Degradación silenciosa
        }
    }

    /**
     * Saves a value in the global state and notifies subscribers.
     * Realiza limpieza cruzada para prevenir colisiones o estados zombi.
     * @param {string} key - The identifier for the data.
     * @param {any} value - The data to store.
     * @param {'session'|'local'|'memory'|null} [persistType=null] - 'session' (survives F5) or 'local' (survives browser restart). Null for memory only.
     */
    static set(key, value, persistType = null) {
        this._store[key] = value;
        
        // Notify any active listeners that the data changed
        if (this._listeners[key]) {
            this._listeners[key].forEach(callback => callback(value));
        }

        const sessionStore = this._getStorage('session');
        const localStore = this._getStorage('local');

        // Save to browser storage if requested con limpieza cruzada
        if (persistType === 'session') {
            if (sessionStore) {
                try { sessionStore.setItem(`jsform_${key}`, JSON.stringify(value)); } catch (_) {}
            }
            // Purgar de local para evitar resurrección de estados obsoletos
            if (localStore) {
                try { localStore.removeItem(`jsform_${key}`); } catch (_) {}
            }
        } else if (persistType === 'local') {
            if (localStore) {
                try { localStore.setItem(`jsform_${key}`, JSON.stringify(value)); } catch (_) {}
            }
            // Purgar de session para mantener paridad estricta
            if (sessionStore) {
                try { sessionStore.removeItem(`jsform_${key}`); } catch (_) {}
            }
        } else if (persistType === 'memory' || persistType === false) {
            // Si explícitamente se especifica 'memory', limpiar de ambos storages externos
            if (sessionStore) {
                try { sessionStore.removeItem(`jsform_${key}`); } catch (_) {}
            }
            if (localStore) {
                try { localStore.removeItem(`jsform_${key}`); } catch (_) {}
            }
        }
    }

    /**
     * Retrieves a value from the global state.
     * @param {string} key - The identifier to look up.
     * @param {'session'|'local'|'memory'|null} [storageScope=null] - Ámbito forzoso. Si es null, mantiene comportamiento en cascada retrocompatible.
     * @returns {any} The stored data, or null if not found.
     */
    static get(key, storageScope = null) {
        // 1. Ámbito estricto de memoria
        if (storageScope === 'memory') {
            return this._store[key] !== undefined ? this._store[key] : null;
        }

        const sessionStore = this._getStorage('session');
        const localStore = this._getStorage('local');

        // 2. Consulta según ámbito solicitado
        let savedData = null;
        if (storageScope === 'session') {
            if (sessionStore) {
                try { savedData = sessionStore.getItem(`jsform_${key}`); } catch (_) {}
            }
        } else if (storageScope === 'local') {
            if (localStore) {
                try { savedData = localStore.getItem(`jsform_${key}`); } catch (_) {}
            }
        } else {
            // Cascada por defecto (100% retrocompatible): primero memoria rápida
            if (this._store[key] !== undefined) {
                return this._store[key];
            }
            // Fallback: sessionStorage tiene precedencia estricta sobre localStorage
            try {
                savedData = sessionStore?.getItem(`jsform_${key}`) || localStore?.getItem(`jsform_${key}`);
            } catch (_) {}
        }

        if (savedData !== null && savedData !== undefined) {
            try {
                const parsedData = JSON.parse(savedData);
                this._store[key] = parsedData; // Restaurar a memoria para acceso rápido futuro
                return parsedData;
            } catch (_) {
                // Tolerancia a strings planos legacy no serializados como JSON
                this._store[key] = savedData;
                return savedData;
            }
        }

        return null;
    }

    /**
     * Comprueba si una clave existe en el estado global o en el ámbito especificado.
     * @param {string} key - El identificador a comprobar.
     * @param {'session'|'local'|'memory'|null} [storageScope=null] - Ámbito a inspeccionar.
     * @returns {boolean} True si la clave existe con un valor distinto de null/undefined.
     */
    static has(key, storageScope = null) {
        return this.get(key, storageScope) !== null;
    }

    /**
     * Subscribes to changes on a specific key.
     * @param {string} key - The identifier to watch.
     * @param {function} callback - Function to execute when the value changes.
     * @returns {function} An unsubscribe function to prevent memory leaks.
     */
    static subscribe(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);

        // MEJORA: Retornamos una función para que el controlador pueda cancelar la suscripción
        return () => {
            this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
        };
    }

    /**
     * Clears specific key or all JSForm state (useful for Logout).
     * Si no se especifica clave, limpia exclusivamente los datos con prefijo jsform_
     * para no interferir con otras aplicaciones o librerías en el mismo dominio.
     * @param {string|null} [key=null] - The specific key to remove. If null, clears all jsform data.
     * @param {'session'|'local'|'memory'|null} [storageScope=null] - Ámbito específico a limpiar. Si es null, limpia en todos.
     */
    static clear(key = null, storageScope = null) {
        const sessionStore = this._getStorage('session');
        const localStore = this._getStorage('local');

        if (key) {
            if (!storageScope || storageScope === 'memory') {
                delete this._store[key];
                delete this._listeners[key];
            }
            if (!storageScope || storageScope === 'session') {
                try { sessionStore?.removeItem(`jsform_${key}`); } catch (_) {}
            }
            if (!storageScope || storageScope === 'local') {
                try { localStore?.removeItem(`jsform_${key}`); } catch (_) {}
            }
        } else {
            if (!storageScope || storageScope === 'memory') {
                this._store = {};
                this._listeners = {};
            }
            if (!storageScope || storageScope === 'session') {
                this._clearPrefixedStorage(sessionStore);
            }
            if (!storageScope || storageScope === 'local') {
                this._clearPrefixedStorage(localStore);
            }
        }
    }

    /**
     * Alias de clear(key, storageScope) para mayor claridad semántica.
     * @param {string} key - Identificador de la clave a remover.
     * @param {'session'|'local'|'memory'|null} [storageScope=null] - Ámbito específico.
     */
    static remove(key, storageScope = null) {
        this.clear(key, storageScope);
    }
}
