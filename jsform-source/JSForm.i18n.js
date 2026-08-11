// File: core/JSForm.i18n.js
import Config from '../jsform.config.js';
import { State } from './JSForm.State.js';

/**
 * Servicio de Internacionalización (i18n) para JSForm.
 * Carga y aplica traducciones automáticamente.
 */
export class i18n {
    static _translations = {};
    static _currentLang = null;

    /**
     * Inicializa el servicio y carga el idioma por defecto o el guardado en sesión.
     * @returns {Promise<void>}
     */
    static async init() {
        const lang = State.get('jsform_lang') || Config.ui.defaultLanguage || 'es';
        await this.load(lang);
    }

    /**
     * Carga un archivo de idioma desde la ruta configurada.
     * @param {string} lang - El código del idioma (ej. 'es', 'en').
     * @returns {Promise<boolean>} True si se cargó correctamente, false en caso contrario.
     */
    static async load(lang) {
        if (this._currentLang === lang && Object.keys(this._translations).length > 0) {
            return true; // El idioma ya está cargado.
        }

        const path = Config.ui.i18n?.path || '/app/i18n';
        const url = `${path}/${lang}.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`No se encontró el archivo de idioma: ${url}`);
            }
            this._translations = await response.json();
            this._currentLang = lang;
            State.set('jsform_lang', lang, 'session'); // Guardar el idioma actual en la sesión
            console.log(`[JSForm.i18n] ✅ Idioma '${lang}' cargado.`);
            return true;
        } catch (error) {
            console.error(`[JSForm.i18n] ❌ ${error.message}`);
            if (this._currentLang === null) {
                // Si falla la carga inicial, usamos un objeto vacío para no romper la app.
                this._translations = {};
                this._currentLang = lang;
            }
            return false;
        }
    }

    /**
     * Aplica las traducciones a los elementos del DOM dentro de un contenedor.
     * @param {HTMLElement} container - El elemento contenedor donde buscar.
     */
    static apply(container) {
        if (!container) return;

        // MEJORA: Un solo query para todos los elementos, iterando su dataset.
        // Es más genérico y a menudo más eficiente que múltiples querySelectorAll.
        container.querySelectorAll('*').forEach(element => {
            if (Object.keys(element.dataset).length === 0) return;

            for (const dataAttr in element.dataset) {
                const key = element.dataset[dataAttr];
                if (!key) continue;

                if (dataAttr === 'i18n') {
                    const translation = this.get(key);
                    const tagName = element.tagName.toUpperCase();
                    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        element.innerHTML = translation;
                    }
                } else if (dataAttr === 'i18nTitle') {
                    element.title = this.get(key);
                } else if (dataAttr.startsWith('i18nAttr')) {
                    const attributeName = dataAttr.substring(8).replace(/([A-Z])/g, "-$1").toLowerCase();
                    if (attributeName) element.setAttribute(attributeName, this.get(key));
                }
            }
        });
    }

    /**
     * Cambia el idioma actual, recarga las traducciones y vuelve a aplicar.
     * @param {string} lang - El nuevo código de idioma.
     * @param {HTMLElement} container - El contenedor para reaplicar las traducciones.
     */
    static async setLanguage(lang, container) {
        const loaded = await this.load(lang);
        if (loaded) {
            this.apply(container);
        }
    }

    /**
     * Obtiene una traducción específica por su clave.
     * Útil para usar en código (ej. en un MessageBox).
     * MEJORA: Ahora soporta parámetros.
     * @param {string} key - La clave de la traducción.
     * @param {object} [params] - Un objeto con los parámetros a reemplazar.
     * @returns {string} El texto traducido o la clave si no se encuentra.
     */
    static get(key, params = null) {
        let translation = this._resolveKey(key, this._translations);
        if (translation === undefined) {
            console.warn(`[JSForm.i18n] ⚠️ Clave no encontrada en get(): '${key}'`);
            return key;
        }

        if (params) {
            Object.keys(params).forEach(paramKey => {
                translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
            });
        }
        return translation;
    }

    /**
     * MEJORA: Resuelve una clave anidada (ej. 'titles.success') en el objeto de traducciones.
     * @param {string} key - La clave a resolver.
     * @param {object} obj - El objeto de traducciones donde buscar.
     * @returns {string|undefined} El valor encontrado o undefined si no existe.
     * @private
     */
    static _resolveKey(key, obj) {
        // Si la clave no contiene un punto, es una búsqueda simple y rápida.
        if (!key.includes('.')) {
            return obj[key];
        }

        // Si la clave es anidada, la recorremos.
        // 'titles.success'.split('.') -> ['titles', 'success']
        return key.split('.').reduce((acc, part) => {
            // En cada paso, verificamos que el acumulador sea un objeto y tenga la siguiente parte.
            // Si no, la cadena se rompe y el resultado final será 'undefined'.
            return acc && acc[part] !== undefined ? acc[part] : undefined;
        }, obj);
    }
}
