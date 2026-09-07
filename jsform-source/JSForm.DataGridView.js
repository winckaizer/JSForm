// File: core/JSForm.DataGridView.js

/**
 * JSForm.DataGridView
 * Componente de tabla de datos nativo en Vanilla JS.
 * Inspirado en el DataGridView de Windows Forms con soporte para paginación local y remota (backend).
 */
export class DataGridView {
    /**
     * Crea e inicializa una instancia de DataGridView.
     * @param {string|HTMLElement} target - ID del elemento o el elemento DOM donde se montará la tabla.
     * @param {object} options - Opciones de configuración.
     * @param {Array<object>} options.columns - Definición de columnas: [{ field: 'id', header: 'ID', width: '80px', align: 'center', render: (val, row) => '...', sortable: true }]
     * @param {Array<object>} [options.dataSource=[]] - Datos iniciales en memoria (para modo local).
     * @param {number} [options.pageSize=10] - Cantidad de filas a mostrar por página.
     * @param {Array<number>|boolean} [options.pageSizeOptions=[5, 10, 25, 50, 100]] - Opciones del selector de filas.
     * @param {string} [options.height='auto'] - Altura fija de la tabla con scroll (ej: '400px', '350px') o 'auto'.
     * @param {boolean} [options.striped=true] - Filas intercaladas estilo cebra.
     * @param {boolean} [options.hover=true] - Efecto hover sobre las filas.
     * @param {boolean} [options.pagination=true] - Habilitar barra de paginación inferior.
     * @param {boolean} [options.searching=false] - Habilitar buscador rápido en la cabecera.
     * @param {boolean} [options.serverSide=false] - Habilitar modo backend (dispara onPageChange al cambiar de página).
     * @param {string} [options.emptyMessage='No hay registros disponibles'] - Mensaje cuando la tabla esté vacía.
     * @param {function} [options.onPageChange] - Callback al cambiar página/tamaño en modo servidor: (page, pageSize) => {}
     * @param {function} [options.onRowClick] - Callback al hacer clic en una fila: (row, index, event) => {}
     * @param {function} [options.onSort] - Callback al ordenar columnas: (field, direction) => {}
     */
    constructor(target, options = {}) {
        this.target = typeof target === 'string' ? document.getElementById(target) : target;
        if (!this.target) {
            console.error(`[JSForm.DataGridView] ❌ No se encontró el elemento objetivo:`, target);
            return;
        }

        this.options = {
            columns: [],
            dataSource: [],
            pageSize: 10,
            pageSizeOptions: [5, 10, 25, 50, 100],
            page: 1,
            height: 'auto',
            striped: true,
            hover: true,
            pagination: true,
            searching: false,
            serverSide: false,
            emptyMessage: 'No hay registros disponibles',
            onPageChange: null,
            onRowClick: null,
            onSort: null,
            ...options
        };

        // Estado interno
        this.data = Array.isArray(this.options.dataSource) ? [...this.options.dataSource] : [];
        this.filteredData = [...this.data];
        this.currentPage = parseInt(this.options.page) || 1;
        this.pageSize = parseInt(this.options.pageSize) || 10;
        this.totalRecords = this.options.serverSide ? (options.total || 0) : this.data.length;
        this.sortColumn = null;
        this.sortDirection = 'asc'; // 'asc' | 'desc'
        this.searchTerm = '';
        this.container = null;

        // Renderizado inicial
        this.init();
    }

    /**
     * Método estático asíncrono para mantener compatibilidad con código existente.
     */
    static async create(target, options = {}) {
        return new DataGridView(target, options);
    }

    /**
     * Inicializa la estructura del DOM de la tabla.
     */
    init() {
        this.target.innerHTML = '';

        // Contenedor principal
        this.container = document.createElement('div');
        this.container.className = 'jsform-grid-container';

        // 1. Barra de Herramientas Superior (Buscador / Selector de tamaño)
        if (this.options.searching || this.options.pageSizeOptions !== false) {
            this.toolbarEl = document.createElement('div');
            this.toolbarEl.className = 'jsform-grid-toolbar';
            this.renderToolbar();
            this.container.appendChild(this.toolbarEl);
        }

        // 2. Contenedor con Scroll de la Tabla
        this.bodyWrapperEl = document.createElement('div');
        this.bodyWrapperEl.className = 'jsform-grid-body-wrapper';
        if (this.options.height && this.options.height !== 'auto') {
            this.bodyWrapperEl.style.maxHeight = this.options.height;
        }

        // 3. Tabla HTML
        this.tableEl = document.createElement('table');
        this.tableEl.className = 'jsform-grid-table';
        if (this.options.striped) this.tableEl.classList.add('jsform-grid-striped');
        if (this.options.hover) this.tableEl.classList.add('jsform-grid-hover');

        this.theadEl = document.createElement('thead');
        this.tbodyEl = document.createElement('tbody');
        this.tableEl.appendChild(this.theadEl);
        this.tableEl.appendChild(this.tbodyEl);
        this.bodyWrapperEl.appendChild(this.tableEl);
        this.container.appendChild(this.bodyWrapperEl);

        // 4. Barra de Paginación y Estado Inferior
        if (this.options.pagination) {
            this.footerEl = document.createElement('div');
            this.footerEl.className = 'jsform-grid-footer';
            this.container.appendChild(this.footerEl);
        }

        this.target.appendChild(this.container);

        // Renderizar encabezados y filas
        this.renderHeaders();
        this.render();
    }

    /**
     * Renderiza la barra de herramientas (selector de filas y buscador).
     */
    renderToolbar() {
        this.toolbarEl.innerHTML = '';

        // Selector de tamaño de página
        if (this.options.pageSizeOptions && Array.isArray(this.options.pageSizeOptions)) {
            const lengthDiv = document.createElement('div');
            lengthDiv.innerHTML = `
                <label style="font-size: 0.9em; color: var(--jsform-grid-text-muted); display: flex; align-items: center; gap: 6px;">
                    Mostrar
                    <select class="jsform-grid-pagesize-select">
                        ${this.options.pageSizeOptions.map(size => `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`).join('')}
                    </select>
                    filas
                </label>
            `;
            const selectEl = lengthDiv.querySelector('select');
            selectEl.addEventListener('change', (e) => {
                this.setPageSize(parseInt(e.target.value));
            });
            this.toolbarEl.appendChild(lengthDiv);
        }

        // Buscador rápido (para modo local)
        if (this.options.searching) {
            const searchDiv = document.createElement('div');
            searchDiv.innerHTML = `
                <input type="text" class="jsform-grid-search-input" placeholder="Buscar..." value="${this.searchTerm}">
            `;
            const inputEl = searchDiv.querySelector('input');
            inputEl.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase().trim();
                this.applyClientSearch();
            });
            this.toolbarEl.appendChild(searchDiv);
        }
    }

    /**
     * Renderiza los encabezados <th> de la tabla.
     */
    renderHeaders() {
        this.theadEl.innerHTML = '';
        const tr = document.createElement('tr');

        this.options.columns.forEach(col => {
            const th = document.createElement('th');
            th.innerHTML = col.header || col.field || '';
            if (col.width) th.style.width = col.width;
            if (col.align) th.style.textAlign = col.align;

            const isSortable = col.sortable !== false && col.field;
            if (isSortable) {
                th.classList.add('sortable');
                const sortIcon = document.createElement('span');
                sortIcon.className = 'jsform-grid-sort-icon';
                sortIcon.innerHTML = this.sortColumn === col.field 
                    ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼') 
                    : ' ⇅';
                th.appendChild(sortIcon);

                th.addEventListener('click', () => {
                    this.handleSort(col.field);
                });
            }

            tr.appendChild(th);
        });

        this.theadEl.appendChild(tr);
    }

    /**
     * Maneja el clic en un encabezado para ordenar.
     */
    handleSort(field) {
        if (this.sortColumn === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = field;
            this.sortDirection = 'asc';
        }

        this.renderHeaders();

        if (this.options.serverSide) {
            if (typeof this.options.onSort === 'function') {
                this.options.onSort(this.sortColumn, this.sortDirection);
            }
        } else {
            this.applyClientSort();
            this.render();
        }
    }

    /**
     * Aplica la ordenación en memoria (modo local).
     */
    applyClientSort() {
        if (!this.sortColumn) return;

        this.filteredData.sort((a, b) => {
            let valA = a[this.sortColumn];
            let valB = b[this.sortColumn];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (typeof valA === 'string') {
                return this.sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }

            return this.sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }

    /**
     * Aplica el filtrado de búsqueda en memoria (modo local).
     */
    applyClientSearch() {
        if (!this.searchTerm) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(row => {
                return this.options.columns.some(col => {
                    if (!col.field) return false;
                    const val = row[col.field];
                    return val !== undefined && val !== null && String(val).toLowerCase().includes(this.searchTerm);
                });
            });
        }

        this.currentPage = 1;
        this.applyClientSort();
        this.render();
    }

    /**
     * Obtiene los registros que deben mostrarse en la página actual.
     */
    getPageData() {
        if (this.options.serverSide) {
            return this.data;
        }

        const startIndex = (this.currentPage - 1) * this.pageSize;
        return this.filteredData.slice(startIndex, startIndex + this.pageSize);
    }

    /**
     * Renderiza las filas de datos y el pie de página.
     */
    render() {
        this.tbodyEl.innerHTML = '';
        const pageData = this.getPageData();
        const totalCount = this.options.serverSide ? this.totalRecords : this.filteredData.length;

        // Si no hay registros
        if (pageData.length === 0) {
            const colCount = this.options.columns.length || 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${colCount}" class="jsform-grid-empty">${this.options.emptyMessage}</td>`;
            this.tbodyEl.appendChild(tr);
        } else {
            // Renderizar filas
            pageData.forEach((row, index) => {
                const tr = document.createElement('tr');
                const globalIndex = (this.currentPage - 1) * this.pageSize + index;

                this.options.columns.forEach(col => {
                    const td = document.createElement('td');
                    if (col.align) td.style.textAlign = col.align;

                    const rawValue = col.field ? row[col.field] : undefined;

                    // Renderizado personalizado o texto plano
                    if (typeof col.render === 'function') {
                        const result = col.render(rawValue, row, globalIndex);
                        if (result instanceof HTMLElement) {
                            td.appendChild(result);
                        } else {
                            td.innerHTML = result !== undefined && result !== null ? result : '';
                        }
                    } else {
                        td.textContent = rawValue !== undefined && rawValue !== null ? rawValue : '';
                    }

                    tr.appendChild(td);
                });

                // Evento al hacer clic en la fila
                if (typeof this.options.onRowClick === 'function') {
                    tr.addEventListener('click', (e) => {
                        this.options.onRowClick(row, globalIndex, e);
                    });
                }

                this.tbodyEl.appendChild(tr);
            });
        }

        // Renderizar paginador
        if (this.options.pagination) {
            this.renderFooter(totalCount);
        }
    }

    /**
     * Renderiza el pie de página con información y controles de navegación.
     */
    renderFooter(totalCount) {
        if (!this.footerEl) return;
        this.footerEl.innerHTML = '';

        const totalPages = Math.ceil(totalCount / this.pageSize) || 1;
        const startRecord = totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, totalCount);

        // 1. Texto de información
        const infoEl = document.createElement('div');
        infoEl.className = 'jsform-grid-info';
        infoEl.textContent = `Mostrando ${startRecord} a ${endRecord} de ${totalCount.toLocaleString()} registros (Pág. ${this.currentPage} de ${totalPages})`;
        this.footerEl.appendChild(infoEl);

        // 2. Controles de Paginación
        const paginationEl = document.createElement('div');
        paginationEl.className = 'jsform-grid-pagination';

        // Botón Primero (<<)
        const btnFirst = this.createPageButton('«', () => this.goToPage(1), this.currentPage === 1);
        paginationEl.appendChild(btnFirst);

        // Botón Anterior (<)
        const btnPrev = this.createPageButton('‹', () => this.goToPage(this.currentPage - 1), this.currentPage === 1);
        paginationEl.appendChild(btnPrev);

        // Números de Página dinámicos
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
            const btnPage = this.createPageButton(p, () => this.goToPage(p), false, p === this.currentPage);
            paginationEl.appendChild(btnPage);
        }

        // Botón Siguiente (>)
        const btnNext = this.createPageButton('›', () => this.goToPage(this.currentPage + 1), this.currentPage === totalPages || totalCount === 0);
        paginationEl.appendChild(btnNext);

        // Botón Último (>>)
        const btnLast = this.createPageButton('»', () => this.goToPage(totalPages), this.currentPage === totalPages || totalCount === 0);
        paginationEl.appendChild(btnLast);

        this.footerEl.appendChild(paginationEl);
    }

    /**
     * Crea un botón de página para la paginación.
     */
    createPageButton(text, onClick, disabled = false, isActive = false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'jsform-grid-page-btn';
        btn.textContent = text;
        if (disabled) btn.disabled = true;
        if (isActive) btn.classList.add('active');

        if (!disabled && !isActive) {
            btn.addEventListener('click', onClick);
        }

        return btn;
    }

    /**
     * Cambia a una página específica.
     */
    async goToPage(pageNumber) {
        const totalCount = this.options.serverSide ? this.totalRecords : this.filteredData.length;
        const totalPages = Math.ceil(totalCount / this.pageSize) || 1;

        if (pageNumber < 1 || pageNumber > totalPages || pageNumber === this.currentPage) {
            return;
        }

        this.currentPage = pageNumber;

        if (this.options.serverSide && typeof this.options.onPageChange === 'function') {
            await this.options.onPageChange(this.currentPage, this.pageSize);
        } else {
            this.render();
        }
    }

    /**
     * Cambia la cantidad de filas por página.
     */
    async setPageSize(newSize) {
        if (newSize === this.pageSize || newSize <= 0) return;
        this.pageSize = newSize;
        this.currentPage = 1;

        if (this.options.serverSide && typeof this.options.onPageChange === 'function') {
            await this.options.onPageChange(this.currentPage, this.pageSize);
        } else {
            this.render();
        }
    }

    /**
     * Establece o actualiza los datos en modo Local (en memoria).
     * @param {Array<object>} newData - Array de objetos.
     * @param {boolean} [resetPage=false] - Si es true, vuelve a la página 1. Si es false (por defecto), se mantiene en la página actual.
     */
    setData(newData, resetPage = false) {
        this.data = Array.isArray(newData) ? [...newData] : [];
        this.filteredData = [...this.data];

        if (resetPage) {
            this.currentPage = 1;
        } else {
            // Asegurar que la página actual no sobrepase el total de páginas tras la actualización
            const totalPages = Math.ceil(this.filteredData.length / this.pageSize) || 1;
            this.currentPage = Math.min(Math.max(1, this.currentPage), totalPages);
        }

        this.applyClientSort();
        this.render();
    }

    /**
     * Establece los datos provenientes de una consulta al Backend (Modo Servidor).
     * Si no se especifica 'page', se mantiene en la página actual.
     * @param {object} config - Objeto con datos y metadatos del backend.
     * @param {Array<object>} config.data - Registros de la página actual.
     * @param {number} config.total - Total general de registros en la base de datos.
     * @param {number} [config.page] - Página actual (opcional, si se omite mantiene la actual).
     * @param {number} [config.pageSize] - Tamaño de página (opcional).
     */
    setRemoteData({ data = [], total = 0, page, pageSize }) {
        this.data = Array.isArray(data) ? [...data] : [];
        this.totalRecords = typeof total === 'number' ? total : 0;
        if (page !== undefined && page !== null) {
            this.currentPage = parseInt(page);
        } else {
            const totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;
            this.currentPage = Math.min(Math.max(1, this.currentPage), totalPages);
        }
        if (pageSize !== undefined && pageSize !== null) this.pageSize = parseInt(pageSize);
        this.render();
    }

    /**
     * Recarga los datos en la página actual (ideal después de crear, editar o eliminar un registro).
     */
    async reload() {
        if (this.options.serverSide && typeof this.options.onPageChange === 'function') {
            await this.options.onPageChange(this.currentPage, this.pageSize);
        } else {
            this.render();
        }
    }

    /**
     * Obtiene el número de página actual.
     * @returns {number}
     */
    getCurrentPage() {
        return this.currentPage;
    }

    /**
     * Obtiene la cantidad de filas por página configurada.
     * @returns {number}
     */
    getPageSize() {
        return this.pageSize;
    }

    /**
     * Obtiene el total de páginas calculado.
     * @returns {number}
     */
    getTotalPages() {
        const totalCount = this.options.serverSide ? this.totalRecords : this.filteredData.length;
        return Math.ceil(totalCount / this.pageSize) || 1;
    }

    /**
     * Obtiene el array completo de datos actual.
     */
    getData() {
        return this.data;
    }

    /**
     * Destruye la tabla y limpia el DOM para liberar memoria en SPAs.
     */
    destroy() {
        if (this.target) {
            this.target.innerHTML = '';
        }
        this.data = [];
        this.filteredData = [];
        console.log(`[JSForm.DataGridView] 🧹 Grid destruido correctamente.`);
    }
}