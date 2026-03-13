// File: core/JSForm.DataGridView.js

const SCRIPT_URLS = {
    JQUERY: 'https://code.jquery.com/jquery-3.7.0.js',
    DATATABLES: 'https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js'
};

const _loadedScripts = new Map();
/**
 * Un componente "Wrapper" para librerías de tablas de datos como DataTables.js.
 * Proporciona una interfaz simple y se integra con el ciclo de vida de JSForm.
 * NOTA: Esta clase requiere que la librería DataTables.js (u otra) esté cargada en la página.
 */
export class DataGridView {
    /**
     * El constructor es ahora privado. Usar el método estático `create`.
     * @param {string} targetId - El ID del elemento <table> en el HTML.
     * @param {object} options - Opciones de configuración simplificadas.
     * @param {Array<object>} options.columns - Definición de las columnas. Ej: [{ data: 'id', title: 'ID' }]
     * @param {Array<object>} options.dataSource - El array de datos a mostrar.
     * @param {boolean} [options.paging=true] - Habilitar paginación.
     * @param {boolean} [options.searching=true] - Habilitar el cuadro de búsqueda.
     * @param {boolean} [options.ordering=true] - Habilitar la ordenación por columnas.
     * @param {object} [options.language] - Opciones de idioma (formato DataTables).
     */
    constructor(targetId, options = {}) {
        this.targetId = targetId;
        this.options = options;
        this.dataTableInstance = null;
        this.render();
    }

    /**
     * Método de fábrica asíncrono. Carga los scripts necesarios y luego crea la instancia.
     */
    static async create(targetId, options = {}) {
        await this._loadScript(SCRIPT_URLS.JQUERY);
        await this._loadScript(SCRIPT_URLS.DATATABLES);
        return new DataGridView(targetId, options);
    }

    /**
     * Carga un script dinámicamente si no ha sido cargado antes.
     * @param {string} url - La URL del script a cargar.
     * @returns {Promise<void>}
     * @private
     */
    static _loadScript(url) {
        if (_loadedScripts.has(url)) {
            return _loadedScripts.get(url); // Devuelve la promesa existente
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                console.log(`[JSForm] ✅ Script cargado: ${url}`);
                resolve();
            };

            script.onerror = () => {
                console.error(`[JSForm] ❌ Error al cargar script: ${url}`);
                reject(new Error(`No se pudo cargar el script: ${url}`));
            };

            document.head.appendChild(script);
        });

        this.render();
    }

    /**
     * Traduce las opciones de JSForm a la configuración de DataTables y renderiza la tabla.
     */
    render() {
        const dtConfig = {
            data: this.options.dataSource || [],
            columns: this.options.columns || [],
            paging: this.options.paging !== false,
            searching: this.options.searching !== false,
            ordering: this.options.ordering !== false,
            language: this.options.language || {
                search: "Buscar:",
                lengthMenu: "Mostrar _MENU_ registros",
                info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
                infoEmpty: "No hay registros disponibles",
                infoFiltered: "(filtrado de _MAX_ registros totales)",
                paginate: {
                    first: "Primero",
                    last: "Último",
                    next: "Siguiente",
                    previous: "Anterior"
                }
            }
        };

        // Inicializa la instancia de DataTables
        this.dataTableInstance = window.jQuery(`#${this.targetId}`).DataTable(dtConfig);
    }

    /**
     * Actualiza los datos de la tabla sin tener que redibujar todo.
     * @param {Array<object>} newData - El nuevo array de datos.
     */
    setData(newData) {
        if (this.dataTableInstance) {
            this.dataTableInstance.clear();
            this.dataTableInstance.rows.add(newData);
            this.dataTableInstance.draw();
        }
    }

    /**
     * Destruye la instancia de DataTables para liberar memoria.
     * Esencial para el ciclo de vida de una SPA.
     */
    destroy() {
        if (this.dataTableInstance) {
            this.dataTableInstance.destroy();
            this.dataTableInstance = null;
            console.log(`[JSForm.DataGridView] 🧹 Instancia de tabla #${this.targetId} destruida.`);
        }
    }

    /**
     * Devuelve la instancia interna de DataTables para acceso avanzado.
     * @returns {object} La API de DataTables.
     */
    getApi() {
        return this.dataTableInstance;
    }
}