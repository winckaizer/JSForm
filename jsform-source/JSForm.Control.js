// File: core/JSForm.Control.js

/**
 * JSForm Control Base
 * Permite la creación, configuración e inyección dinámica de elementos HTML
 * simulando la instanciación de controles en WinForms.
 */
export class Control {
    /**
     * @param {string} tagName - Tipo de elemento HTML (ej. 'input', 'button', 'div')
     * @param {string} id - ID único del control
     * @param {object} options - Atributos iniciales (text, className, style, events)
     */
    constructor(tagName, id, options = {}) {
        this.element = document.createElement(tagName);
        this.element.id = id;
        this.applyOptions(options);
    }

    // Aplica propiedades, estilos y eventos de forma masiva
    applyOptions(options) {
        if (options.text) this.element.innerText = options.text;
        if (options.html) this.element.innerHTML = options.html;
        if (options.className) this.element.className = options.className;
        if (options.value) this.element.value = options.value;
        
        // Aplicar estilos inline si existen
        if (options.style) {
            Object.assign(this.element.style, options.style);
        }

        // Suscribir eventos dinámicos (ej. { click: () => alert('Hola') })
        if (options.events) {
            for (const [eventName, handler] of Object.entries(options.events)) {
                this.element.addEventListener(eventName, handler);
            }
        }
    }

    /**
     * Inyecta este control dentro de un contenedor en la vista HTML.
     * @param {string|HTMLElement} parent - El ID del contenedor o el elemento directamente.
     * @returns {HTMLElement} El elemento HTML creado.
     */
    renderTo(parent) {
        const target = typeof parent === 'string' ? document.getElementById(parent) : parent;
        
        if (target) {
            target.appendChild(this.element);
        } else {
            console.error(`[JSForm Control] ❌ No se pudo inyectar el control #${this.element.id}. Contenedor no encontrado.`);
        }
        
        return this.element;
    }

    // Método útil para destruir el control dinámico si ya no se necesita
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}