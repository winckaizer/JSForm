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
        // MEJORA: Iterar sobre las opciones para mayor flexibilidad
        for (const [key, value] of Object.entries(options)) {
            switch (key) {
                case 'text':
                    this.element.innerText = value;
                    break;
                case 'html':
                    this.element.innerHTML = value;
                    break;
                case 'className':
                    this.element.className = value;
                    break;
                case 'style':
                    Object.assign(this.element.style, value);
                    break;
                case 'events':
                    for (const [eventName, handler] of Object.entries(value)) {
                        this.element.addEventListener(eventName, handler);
                    }
                    break;
                default:
                    // Para cualquier otra opción, la tratamos como un atributo HTML
                    this.element.setAttribute(key, value);
                    break;
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