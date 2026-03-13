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

            // 4. Implementar la lógica de arrastre (drag and drop)
            this.makeDraggable(dialog, header);
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
            // Establecer la nueva posición del elemento
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