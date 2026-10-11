// File: core/JSForm.MessageBox.js
import { Control } from './JSForm.Control.js';

/**
 * Un componente de diálogo modal moderno, movible y asíncrono.
 * Utiliza Promises para devolver el resultado de la acción del usuario.
 */
export class MessageBox {

    // Simula Enums para facilitar el uso, al estilo WinForms
    static Buttons = {
        OK: 'ok',
        OKCancel: 'ok_cancel',
        YesNo: 'yes_no',
        YesNoCancel: 'yes_no_cancel'
    };

    static Icon = {
        None: 'none',
        Info: 'info',
        Question: 'question',
        Warning: 'warning',
        Error: 'error'
    };

    /**
     * Muestra un cuadro de diálogo y espera la interacción del usuario.
     * @param {string} title - El texto que aparecerá en la cabecera.
     * @param {string} message - El mensaje principal del diálogo.
     * @param {MessageBox.Buttons} [buttons=MessageBox.Buttons.OK] - La combinación de botones a mostrar.
     * @param {MessageBox.Icon} [icon=MessageBox.Icon.None] - El icono a mostrar junto al mensaje.
     * @returns {Promise<string>} Una promesa que se resuelve con el ID del botón pulsado (ej. 'ok', 'cancel', 'yes', 'no').
     */
    static show(title, message, buttons = MessageBox.Buttons.OK, icon = MessageBox.Icon.None) {
        return new Promise(resolve => {
            // 1. Crear los elementos del DOM
            const overlay = document.createElement('div');
            overlay.className = 'jsform-messagebox-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'jsform-messagebox-window';

            const header = document.createElement('div');
            header.className = 'jsform-messagebox-header';
            header.innerHTML = `<span>${title}</span>`;

            const body = document.createElement('div');
            body.className = 'jsform-messagebox-body';
            body.innerHTML = `<div class="jsform-messagebox-icon icon-${icon}"></div><p>${message}</p>`;

            const footer = document.createElement('div');
            footer.className = 'jsform-messagebox-footer';

            // Función para cerrar y resolver la promesa
            const closeDialog = (result) => {
                document.body.removeChild(overlay);
                resolve(result);
            };

            // 2. Crear los botones según la configuración
            const buttonConfigs = {
                'ok': { text: 'OK', value: 'ok' },
                'cancel': { text: 'Cancelar', value: 'cancel' },
                'yes': { text: 'Sí', value: 'yes' },
                'no': { text: 'No', value: 'no' }
            };

            const buttonsToShow = buttons.split('_'); // 'ok_cancel' -> ['ok', 'cancel']
            buttonsToShow.forEach(btnKey => {
                const config = buttonConfigs[btnKey];
                if (config) {
                    // MEJORA: Usamos la clase Control para crear los botones
                    const buttonControl = new Control('button', `msgbox-btn-${config.value}`, {
                        text: config.text,
                        className: 'jsform-messagebox-button',
                        events: {
                            click: () => closeDialog(config.value)
                        }
                    });
                    buttonControl.renderTo(footer);
                }
            });

            // 3. Ensamblar el diálogo
            dialog.appendChild(header);
            dialog.appendChild(body);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Centrar el diálogo inicial
            dialog.style.left = `calc(50% - ${dialog.offsetWidth / 2}px)`;
            dialog.style.top = `calc(50% - ${dialog.offsetHeight / 2}px)`;

            // Inicializar las posiciones actuales para el drag and drop
            dialog.style.left = dialog.offsetLeft + "px";
            dialog.style.top = dialog.offsetTop + "px";

            // 4. Implementar la lógica de arrastre (drag and drop)
            this.makeDraggable(dialog, header);
        });
    }

    /**
     * Muestra un cuadro de diálogo con campo de entrada de texto y espera la interacción del usuario.
     * @param {string} title - El texto de la cabecera del diálogo.
     * @param {string} message - El mensaje descriptivo o instrucción.
     * @param {string} [defaultValue=''] - Valor inicial precargado en el campo de texto.
     * @param {object} [options={}] - Opciones adicionales de configuración:
     *    - placeholder: {string} Texto de ayuda en el input.
     *    - inputType: {string} 'text' | 'password' | 'email' | 'number' (por defecto 'text').
     *    - required: {boolean} Si es true, el campo no permite aceptar vacío.
     *    - okText: {string} Texto del botón de confirmación (por defecto 'Aceptar').
     *    - cancelText: {string} Texto del botón de cancelación (por defecto 'Cancelar').
     *    - icon: {MessageBox.Icon} Icono opcional a mostrar junto al mensaje.
     * @returns {Promise<string|null>} Resuelve con el string ingresado al presionar 'Aceptar', o null si cancela o cierra.
     */
    static prompt(title, message, defaultValue = '', options = {}) {
        return new Promise(resolve => {
            const inputType = options.inputType || 'text';
            const placeholder = options.placeholder || '';
            const required = options.required || false;
            const okText = options.okText || 'Aceptar';
            const cancelText = options.cancelText || 'Cancelar';
            const icon = options.icon || MessageBox.Icon.None;

            const overlay = document.createElement('div');
            overlay.className = 'jsform-messagebox-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'jsform-messagebox-window jsform-messagebox-prompt';

            const header = document.createElement('div');
            header.className = 'jsform-messagebox-header';
            header.innerHTML = `<span>${title}</span>`;

            const body = document.createElement('div');
            body.className = 'jsform-messagebox-body jsform-messagebox-body-prompt';

            let iconHtml = '';
            if (icon && icon !== MessageBox.Icon.None) {
                iconHtml = `<div class="jsform-messagebox-icon icon-${icon}"></div>`;
            }

            const messageRow = document.createElement('div');
            messageRow.className = 'jsform-prompt-message-row';
            messageRow.innerHTML = `${iconHtml}<p class="jsform-prompt-label">${message}</p>`;

            const input = document.createElement('input');
            input.type = inputType;
            input.className = 'jsform-prompt-input';
            input.value = defaultValue;
            input.placeholder = placeholder;
            input.autocomplete = 'off';

            body.appendChild(messageRow);
            body.appendChild(input);

            const footer = document.createElement('div');
            footer.className = 'jsform-messagebox-footer';

            const closeDialog = (result) => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                resolve(result);
            };

            const handleAccept = () => {
                const val = input.value.trim();
                if (required && !val) {
                    input.focus();
                    input.classList.add('is-invalid');
                    return;
                }
                closeDialog(input.value);
            };

            // Botón Cancelar
            const btnCancel = new Control('button', 'msgbox-prompt-btn-cancel', {
                text: cancelText,
                className: 'jsform-messagebox-button jsform-btn-secondary',
                events: {
                    click: () => closeDialog(null)
                }
            });

            // Botón Aceptar
            const btnOk = new Control('button', 'msgbox-prompt-btn-ok', {
                text: okText,
                className: 'jsform-messagebox-button jsform-btn-primary',
                events: {
                    click: handleAccept
                }
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid') && input.value.trim()) {
                    input.classList.remove('is-invalid');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAccept();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeDialog(null);
                }
            });

            btnCancel.renderTo(footer);
            btnOk.renderTo(footer);

            dialog.appendChild(header);
            dialog.appendChild(body);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Centrar el diálogo inicial
            dialog.style.left = `calc(50% - ${dialog.offsetWidth / 2}px)`;
            dialog.style.top = `calc(50% - ${dialog.offsetHeight / 2}px)`;
            dialog.style.left = dialog.offsetLeft + "px";
            dialog.style.top = dialog.offsetTop + "px";

            this.makeDraggable(dialog, header);

            setTimeout(() => {
                input.focus();
                if (defaultValue) input.select();
            }, 50);
        });
    }

    /**
     * Hace que un elemento sea arrastrable por su cabecera.
     * @param {HTMLElement} element - El elemento a mover.
     * @param {HTMLElement} handle - El área desde donde se puede arrastrar.
     */
    static makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const dragMouseDown = (e) => {
            e.preventDefault();
            // Posición inicial del cursor
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Asegurar que el elemento tenga posición absoluta/fixed explícita para moverse
            // (Ya lo tiene por CSS, pero esto asegura el comportamiento)
            // Añadir los eventos de movimiento y soltar al documento
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e.preventDefault();
            // Calcular el nuevo desplazamiento del cursor
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Calcular la nueva posición basada en el offset actual menos el desplazamiento
            // Nota: offsetTop/Left son relativos al padre posicionado más cercano (el overlay fixed)
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            // Detener el movimiento al soltar el botón del ratón
            document.onmouseup = null;
            document.onmousemove = null;
        };

        handle.onmousedown = dragMouseDown;
    }
}