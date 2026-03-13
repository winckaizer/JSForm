// File: core/JSForm.State.js

/**
 * Global State Management for JSForm.
 * Handles in-memory data storage with fallback to SessionStorage or LocalStorage.
 */
export class State {
    
    static _store = {};
    static _listeners = {};

    /**
     * Saves a value in the global state and notifies subscribers.
     * @param {string} key - The identifier for the data.
     * @param {any} value - The data to store.
     * @param {string|null} [persistType=null] - 'session' (survives F5) or 'local' (survives browser restart). Null for memory only.
     */
    static set(key, value, persistType = null) {
        this._store[key] = value;
        
        // Notify any active listeners that the data changed
        if (this._listeners[key]) {
            this._listeners[key].forEach(callback => callback(value));
        }

        // Save to browser storage if requested
        if (persistType === 'session') {
            sessionStorage.setItem(`jsform_${key}`, JSON.stringify(value));
        } else if (persistType === 'local') {
            localStorage.setItem(`jsform_${key}`, JSON.stringify(value));
        }
    }

    /**
     * Retrieves a value from the global state.
     * @param {string} key - The identifier to look up.
     * @returns {any} The stored data, or null if not found.
     */
    static get(key) {
        // 1. Check fast in-memory store
        if (this._store[key] !== undefined) {
            return this._store[key];
        }

        // 2. Fallback to storage (check session first, then local)
        const savedData = sessionStorage.getItem(`jsform_${key}`) || localStorage.getItem(`jsform_${key}`);
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            this._store[key] = parsedData; // Restore to memory for future fast access
            return parsedData;
        }

        return null;
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
     * Clears specific key or all state (useful for Logout).
     * @param {string} [key=null] - The specific key to remove. If null, clears everything.
     */
    static clear(key = null) {
        if (key) {
            delete this._store[key];
            delete this._listeners[key];
            sessionStorage.removeItem(`jsform_${key}`);
            localStorage.removeItem(`jsform_${key}`);
        } else {
            this._store = {};
            this._listeners = {};
            sessionStorage.clear();
            localStorage.clear();
        }
    }
}