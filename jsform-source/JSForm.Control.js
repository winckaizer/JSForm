// File: core/JSForm.Control.js

/**
 * JSForm Control Base
 * Permite la creación, configuración e inyección dinámica de elementos HTML
 * simulando la instanciación de controles en WinForms.
 * Soporta creación declarativa por tagName y creación a partir de cadenas HTML (ej. tablas, tarjetas, layouts).
 */
export class Control {
    /**
     * Crea una nueva instancia de Control.
     * @param {string} tagOrHtml - Tipo de elemento HTML (ej. 'input', 'button', 'div') o una cadena HTML completa (ej. '<table><tr><td>hola</td></tr></table>').
     * @param {string|object} [idOrOptions=null] - ID único del control o el objeto de opciones si se omite el ID.
     * @param {object} [options={}] - Atributos y configuraciones iniciales (text, html, className, style, events, etc.).
     */
    constructor(tagOrHtml, idOrOptions = null, options = {}) {
        let id = null;
        let opts = options;

        // Si el segundo argumento es un objeto de opciones, permitimos omitir el ID
        if (typeof idOrOptions === 'object' && idOrOptions !== null && Object.keys(options).length === 0) {
            opts = idOrOptions;
            id = opts.id || null;
        } else if (typeof idOrOptions === 'string') {
            id = idOrOptions;
        }

        const trimmed = (tagOrHtml || '').trim();

        // Detectar si se pasó un string HTML (contiene tags HTML como <tag>...</tag>)
        if (trimmed.includes('<') && trimmed.includes('>')) {
            const template = document.createElement('template');
            template.innerHTML = trimmed;
            this.element = template.content.firstElementChild;

            if (!this.element) {
                console.error(`[JSForm.Control] ❌ No se pudo crear el elemento desde el HTML proporcionado:`, tagOrHtml);
                this.element = document.createElement('div');
            }

            if (id) {
                this.element.id = id;
            }
        } else {
            this.element = document.createElement(tagOrHtml);
            if (id) {
                this.element.id = id;
            }
        }

        this.applyOptions(opts);
    }

    /**
     * Crea una instancia de Control a partir de un fragmento o string de código HTML.
     * Ideal para tablas, tarjetas, diálogos o layouts completos generados dinámicamente.
     * @param {string} htmlString - Cadena de código HTML (ej. '<table><tr><td>hola</td></tr></table>').
     * @param {object} [options={}] - Opciones de configuración (id, className, style, events, etc.).
     * @returns {Control} Instancia del control creado.
     */
    static fromHtml(htmlString, options = {}) {
        const id = options.id || null;
        const opts = { ...options };
        delete opts.id;
        return new Control(htmlString, id, opts);
    }

    /**
     * Alias de fromHtml para instanciar controles desde cadenas de texto HTML.
     * @param {string} htmlString - Cadena de código HTML.
     * @param {object} [options={}] - Opciones adicionales.
     * @returns {Control}
     */
    static fromString(htmlString, options = {}) {
        return Control.fromHtml(htmlString, options);
    }

    /**
     * Aplica propiedades, clases, estilos y eventos al elemento.
     * @param {object} options - Opciones a aplicar.
     */
    applyOptions(options) {
        if (!options || typeof options !== 'object') return;

        for (const [key, value] of Object.entries(options)) {
            switch (key) {
                case 'id':
                    if (value) this.element.id = value;
                    break;
                case 'text':
                    this.element.innerText = value;
                    break;
                case 'html':
                    this.element.innerHTML = value;
                    break;
                case 'className':
                case 'class':
                    if (value) this.element.className = value;
                    break;
                case 'style':
                    if (typeof value === 'string') {
                        this.element.style.cssText = value;
                    } else if (typeof value === 'object' && value !== null) {
                        Object.assign(this.element.style, value);
                    }
                    break;
                case 'events':
                    if (typeof value === 'object' && value !== null) {
                        for (const [eventName, handler] of Object.entries(value)) {
                            this.element.addEventListener(eventName, handler);
                        }
                    }
                    break;
                case 'children':
                    if (Array.isArray(value)) {
                        this.append(...value);
                    }
                    break;
                default:
                    // Cualquier otra opción se aplica como atributo HTML estándar
                    if (value !== undefined && value !== null) {
                        this.element.setAttribute(key, value);
                    }
                    break;
            }
        }
    }

    /**
     * Busca el primer elemento descendiente que coincida con el selector CSS.
     * @param {string} selector - Selector CSS (ej. 'td', '.btn-accion').
     * @returns {HTMLElement|null}
     */
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    /**
     * Busca todos los elementos descendientes que coincidan con el selector CSS.
     * @param {string} selector - Selector CSS.
     * @returns {Array<HTMLElement>}
     */
    findAll(selector) {
        return this.element ? Array.from(this.element.querySelectorAll(selector)) : [];
    }

    /**
     * Añade un escuchador de eventos al elemento.
     * @param {string} eventName - Nombre del evento (ej. 'click', 'input', 'change').
     * @param {function} handler - Función manejadora del evento.
     * @returns {Control} Retorna esta instancia para encadenamiento.
     */
    on(eventName, handler) {
        if (this.element && typeof handler === 'function') {
            this.element.addEventListener(eventName, handler);
        }
        return this;
    }

    /**
     * Remueve un escuchador de eventos del elemento.
     * @param {string} eventName - Nombre del evento.
     * @param {function} handler - Función manejadora previa.
     * @returns {Control}
     */
    off(eventName, handler) {
        if (this.element && typeof handler === 'function') {
            this.element.removeEventListener(eventName, handler);
        }
        return this;
    }

    /**
     * Añade una o más clases CSS al elemento.
     * @param {...string} classNames
     * @returns {Control}
     */
    addClass(...classNames) {
        if (this.element) {
            this.element.classList.add(...classNames.filter(Boolean));
        }
        return this;
    }

    /**
     * Remueve una o más clases CSS del elemento.
     * @param {...string} classNames
     * @returns {Control}
     */
    removeClass(...classNames) {
        if (this.element) {
            this.element.classList.remove(...classNames.filter(Boolean));
        }
        return this;
    }

    /**
     * Alterna una clase CSS en el elemento.
     * @param {string} className
     * @param {boolean} [force]
     * @returns {Control}
     */
    toggleClass(className, force) {
        if (this.element) {
            this.element.classList.toggle(className, force);
        }
        return this;
    }

    /**
     * Agrega elementos hijos (pueden ser instancias de Control, HTMLElements o strings HTML).
     * @param {...(Control|HTMLElement|string)} children
     * @returns {Control}
     */
    append(...children) {
        if (!this.element) return this;
        children.forEach(child => {
            if (child instanceof Control) {
                this.element.appendChild(child.element);
            } else if (child instanceof HTMLElement || child instanceof DocumentFragment) {
                this.element.appendChild(child);
            } else if (typeof child === 'string') {
                this.element.insertAdjacentHTML('beforeend', child);
            }
        });
        return this;
    }

    /**
     * Inyecta este control dentro de un contenedor en la vista HTML.
     * @param {string|HTMLElement|Control} parent - El ID del contenedor, el elemento DOM o una instancia de Control.
     * @returns {HTMLElement} El elemento HTML creado.
     */
    renderTo(parent) {
        let target = parent;
        if (parent instanceof Control) {
            target = parent.element;
        } else if (typeof parent === 'string') {
            target = document.getElementById(parent);
        }

        if (target && typeof target.appendChild === 'function') {
            target.appendChild(this.element);
        } else {
            console.error(`[JSForm.Control] ❌ No se pudo inyectar el control #${this.element?.id || ''}. Contenedor no encontrado:`, parent);
        }

        return this.element;
    }

    /**
     * Destruye y remueve el control del DOM si ya no se necesita.
     */
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}