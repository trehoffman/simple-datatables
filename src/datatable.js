/* eslint-disable linebreak-style */
import {Rows} from "./rows"
import {Columns} from "./columns"
import {dataToTable} from "./table"
import {defaultConfig} from "./config"
import {
    isObject,
    isJson,
    createElement,
    flush,
    button,
    truncate
} from "./helpers"
import {
    exportCSV,
    exportJSON,
    exportSQL,
    exportTXT
} from "./export";


export class DataTable {
    constructor(table, options = {}) {
        this.initialized = false

        // user options
        this.options = {
            ...defaultConfig,
            ...options,
            layout: {
                ...defaultConfig.layout,
                ...options.layout
            },
            labels: {
                ...defaultConfig.labels,
                ...options.labels
            }
        }

        if (typeof table === "string") {
            table = document.querySelector(table)
        }

        this.initialLayout = table.innerHTML
        this.initialSortable = this.options.sortable

        // Disable manual sorting if no header is present (#4)
        if (!this.options.header) {
            this.options.sortable = false
        }

        if (table.tHead === null) {
            if (!this.options.data ||
                (this.options.data && !this.options.data.headings)
            ) {
                this.options.sortable = false
            }
        }

        // try to get saved perPage option if one is not explicity set
        if (!options.perPage) {
            const perPage = parseInt(localStorage.getItem('perPage'), 10);
            if (!isNaN(perPage)) this.options.perPage = perPage
        }

        if (table.tBodies.length && !table.tBodies[0].rows.length) {
            if (this.options.data) {
                if (!this.options.data.data) {
                    throw new Error(
                        "You seem to be using the data option, but you've not defined any rows."
                    )
                }
            }
        }

        this.table = table

        this.init()
    }

    /**
     * Add custom property or method to extend DataTable
     * @param  {String} prop    - Method name or property
     * @param  {Mixed} val      - Function or property value
     * @return {Void}
     */
    static extend(prop, val) {
        if (typeof val === "function") {
            DataTable.prototype[prop] = val
        } else {
            DataTable[prop] = val
        }
    }

    /**
     * Initialize the instance
     * @param  {Object} options
     * @return {Void}
     */
    init(options) {
        if (this.initialized || this.table.classList.contains("dataTable-table")) {
            return false
        }

        Object.assign(this.options, options || {})

        this.currentPage = 1
        this.onFirstPage = true

        this.hiddenColumns = []
        this.columnRenderers = []
        this.selectedColumns = []

        this.render()

        // process initial filter option
        for (const [key, value] of Object.entries(this.options.filters || {})) {
            let columnIndex = this.labels.indexOf(key);
            if(columnIndex < 0) continue;
            this.columns().filter(columnIndex, null, true, value)
        }

        setTimeout(() => {
            this.emit("datatable.init")
            this.initialized = true

            if (this.options.plugins) {
                Object.entries(this.options.plugins).forEach(([plugin, options]) => {
                    if (this[plugin] && typeof this[plugin] === "function") {
                        this[plugin] = this[plugin](options, {createElement})

                        // Init plugin
                        if (options.enabled && this[plugin].init && typeof this[plugin].init === "function") {
                            this[plugin].init()
                        }
                    }
                })
            }
        }, 10)
    }

    /**
     * Render the instance
     * @param  {String} type
     * @return {Void}
     */
    render(type) {
        if (type) {
            switch (type) {
            case "page":
                this.renderPage()
                break
            case "pager":
                this.renderPager()
                break
            case "header":
                this.renderHeader()
                break
            }

            return false
        }

        const options = this.options
        let template = ""

        // Convert data to HTML
        if (options.data) {
            dataToTable.call(this)
        }

        if (options.ajax) {
            const ajax = options.ajax
            const xhr = new XMLHttpRequest()

            const xhrProgress = e => {
                this.emit("datatable.ajax.progress", e, xhr)
            }

            const xhrLoad = e => {
                if (xhr.readyState === 4) {
                    this.emit("datatable.ajax.loaded", e, xhr)

                    if (xhr.status === 200) {
                        const obj = {}
                        obj.data = ajax.load ? ajax.load.call(this, xhr) : xhr.responseText

                        obj.type = "json"

                        if (ajax.content && ajax.content.type) {
                            obj.type = ajax.content.type

                            Object.assign(obj, ajax.content)
                        }

                        this.import(obj)

                        this.setColumns(true)

                        this.emit("datatable.ajax.success", e, xhr)
                    } else {
                        this.emit("datatable.ajax.error", e, xhr)
                    }
                }
            }

            const xhrFailed = e => {
                this.emit("datatable.ajax.error", e, xhr)
            }

            const xhrCancelled = e => {
                this.emit("datatable.ajax.abort", e, xhr)
            }

            xhr.addEventListener("progress", xhrProgress, false)
            xhr.addEventListener("load", xhrLoad, false)
            xhr.addEventListener("error", xhrFailed, false)
            xhr.addEventListener("abort", xhrCancelled, false)

            this.emit("datatable.ajax.loading", xhr)

            xhr.open("GET", typeof ajax === "string" ? options.ajax : options.ajax.url)
            xhr.send()
        }

        // Store references
        this.body = this.table.tBodies[0]
        this.head = this.table.tHead
        this.foot = this.table.tFoot

        if (!this.body) {
            this.body = createElement("tbody")

            this.table.appendChild(this.body)
        }

        this.hasRows = this.body.rows.length > 0

        // Make a tHead if there isn't one (fixes #8)
        if (!this.head) {
            const h = createElement("thead")
            const t = createElement("tr")

            if (this.hasRows) {
                Array.from(this.body.rows[0].cells).forEach(() => {
                    t.appendChild(createElement("th"))
                })

                h.appendChild(t)
            }

            this.head = h

            this.table.insertBefore(this.head, this.body)

            this.hiddenHeader = !options.ajax
        }

        this.headings = []
        this.hasHeadings = this.head.rows.length > 0

        if (this.hasHeadings) {
            this.header = this.head.rows[0]
            this.headings = [].slice.call(this.header.cells)
        }

        // Header
        if (!options.header) {
            if (this.head) {
                this.table.removeChild(this.table.tHead)
            }
        }

        // Footer
        if (options.footer) {
            if (this.head && !this.foot) {
                this.foot = createElement("tfoot", {
                    html: this.head.innerHTML
                })
                this.table.appendChild(this.foot)
            }
        } else {
            if (this.foot) {
                this.table.removeChild(this.table.tFoot)
            }
        }

        // Build
        this.wrapper = createElement("div", {
            class: "dataTable-wrapper dataTable-loading"
        })

        // Template for custom layouts
        template += "<div class='dataTable-top'>"
        template += options.layout.top
        template += "</div>"
        if (options.scrollY.length) {
            template += `<div class='dataTable-container' style='height: ${options.scrollY}; overflow-Y: auto;'></div>`
        } else {
            template += "<div class='dataTable-container'></div>"
        }
        template += "<div class='dataTable-bottom'>"
        template += options.layout.bottom
        template += "</div>"

        // Info placement
        template = template.replace("{info}", options.paging ? "<div class='dataTable-info'></div>" : "")

        // Per Page Select
        if (options.paging && options.perPageSelect) {
            let wrap = "<div class='dataTable-dropdown'><label>"
            wrap += options.labels.perPage
            wrap += "</label></div>"

            // Create the select
            const select = createElement("select", {
                class: "dataTable-selector"
            })

            // Create the options
            options.perPageSelect.forEach(val => {
                const selected = val === options.perPage
                let option = new Option(val, val, selected, selected)
                if (val === -1) option = new Option('ALL', val, selected, selected)
                select.add(option)
            })

            // Custom label
            wrap = wrap.replace("{select}", select.outerHTML)

            // Selector placement
            template = template.replace("{select}", wrap)
        } else {
            template = template.replace("{select}", "")
        }

        // Searchable
        if (options.searchable) {
            const form =
                `<span class='dataTable-search'><input class='dataTable-input' placeholder='${options.labels.placeholder}' type='text'></span>`

            // Search input placement
            template = template.replace("{search}", form)
        } else {
            template = template.replace("{search}", "")
        }

        // column filter
        const columnFilterForm = `
            <span class="dataTable-columnFilter">
                <button type="button" title="column filter" style="font-weight:bold;">⚙</button>
            </span>`;
        template = template.replace('{columnFilter}', columnFilterForm);

        if (this.hasHeadings) {
            // Sortable
            this.render("header")
        }

        // Add table class
        this.table.classList.add("dataTable-table")

        // Paginator
        const w = createElement("div", {
            class: "dataTable-pagination"
        })
        const paginator = createElement("ul")
        w.appendChild(paginator)

        // Pager(s) placement
        template = template.replace(/\{pager\}/g, w.outerHTML)
        this.wrapper.innerHTML = template

        this.container = this.wrapper.querySelector(".dataTable-container")

        this.pagers = this.wrapper.querySelectorAll(".dataTable-pagination")

        this.label = this.wrapper.querySelector(".dataTable-info")

        // Insert in to DOM tree
        this.table.parentNode.replaceChild(this.wrapper, this.table)
        this.container.appendChild(this.table)

        // Store the table dimensions
        this.rect = this.table.getBoundingClientRect()

        // Convert rows to array for processing
        this.data = Array.from(this.body.rows)
        this.activeRows = this.data.slice()
        this.activeHeadings = this.headings.slice()

        // Update
        this.update()

        if (!options.ajax) {
            this.setColumns()
        }

        // Fix height
        this.fixHeight()

        // Fix columns
        this.fixColumns()

        // Class names
        if (!options.header) {
            this.wrapper.classList.add("no-header")
        }

        if (!options.footer) {
            this.wrapper.classList.add("no-footer")
        }

        if (options.sortable) {
            this.wrapper.classList.add("sortable")
        }

        if (options.searchable) {
            this.wrapper.classList.add("searchable")
        }

        if (options.fixedHeight) {
            this.wrapper.classList.add("fixed-height")
        }

        if (options.fixedColumns) {
            this.wrapper.classList.add("fixed-columns")
        }

        this.bindEvents()
    }

    /**
     * Render the page
     * @return {Void}
     */
    renderPage() {
        if (this.hasHeadings) {
            flush(this.header)

            this.activeHeadings.forEach(th => this.header.appendChild(th))
        }


        if (this.hasRows && this.totalPages) {
            if (this.currentPage > this.totalPages) {
                this.currentPage = 1
            }

            // Use a fragment to limit touching the DOM
            const index = this.currentPage - 1

            const frag = document.createDocumentFragment()
            this.pages[index].forEach(row => frag.appendChild(this.rows().render(row)))

            this.clear(frag)

            this.onFirstPage = this.currentPage === 1
            this.onLastPage = this.currentPage === this.lastPage
        } else {
            this.setMessage(this.options.labels.noRows)
        }

        // Update the info
        let current = 0

        let f = 0
        let t = 0
        let items

        if (this.totalPages) {
            current = this.currentPage - 1
            f = current * this.options.perPage
            t = f + this.pages[current].length
            f = f + 1
            items = this.searching ? this.searchData.length : this.data.length
        }

        if (this.label && this.options.labels.info.length) {
            // CUSTOM LABELS
            const string = this.options.labels.info
                .replace("{start}", f)
                .replace("{end}", t)
                .replace("{page}", this.currentPage)
                .replace("{pages}", this.totalPages)
                .replace("{rows}", items)

            this.label.innerHTML = items ? string : ""
        }

        if (this.currentPage == 1) {
            this.fixHeight()
        }
    }

    /**
     * Render the pager(s)
     * @return {Void}
     */
    renderPager() {
        flush(this.pagers)

        if (this.totalPages > 1) {
            const c = "pager"
            const frag = document.createDocumentFragment()
            const prev = this.onFirstPage ? 1 : this.currentPage - 1
            const next = this.onLastPage ? this.totalPages : this.currentPage + 1

            // first button
            if (this.options.firstLast) {
                frag.appendChild(button(c, 1, this.options.firstText))
            }

            // prev button
            if (this.options.nextPrev) {
                frag.appendChild(button(c, prev, this.options.prevText))
            }

            let pager = this.links

            // truncate the links
            if (this.options.truncatePager) {
                pager = truncate(
                    this.links,
                    this.currentPage,
                    this.pages.length,
                    this.options.pagerDelta,
                    this.options.ellipsisText
                )
            }

            // active page link
            this.links[this.currentPage - 1].classList.add("active")

            // append the links
            pager.forEach(p => {
                p.classList.remove("active")
                frag.appendChild(p)
            })

            this.links[this.currentPage - 1].classList.add("active")

            // next button
            if (this.options.nextPrev) {
                frag.appendChild(button(c, next, this.options.nextText))
            }

            // first button
            if (this.options.firstLast) {
                frag.appendChild(button(c, this.totalPages, this.options.lastText))
            }

            // We may have more than one pager
            this.pagers.forEach(pager => {
                pager.appendChild(frag.cloneNode(true))
            })
        }
    }

    /**
     * Render the header
     * @return {Void}
     */
    renderHeader() {
        this.labels = []

        if (this.headings && this.headings.length) {
            this.headings.forEach((th, i) => {

                this.labels[i] = th.textContent

                if (th.firstElementChild && th.firstElementChild.classList.contains("dataTable-sorter")) {
                    th.innerHTML = th.firstElementChild.innerHTML
                }

                th.sortable = th.getAttribute("data-sortable") !== "false"

                th.originalCellIndex = i
                if (this.options.sortable && th.sortable) {
                    const link = createElement("a", {
                        href: "#",
                        class: "dataTable-sorter",
                        html: th.innerHTML
                    })

                    th.innerHTML = ""
                    th.setAttribute("data-sortable", "")
                    th.appendChild(link)
                }
            })
        }

        this.fixColumns()
    }

    /**
     * Bind event listeners
     * @return {[type]} [description]
     */
    bindEvents() {
        const options = this.options

        this.wrapper.addEventListener('contextmenu', (e) => {
            if (e.target.classList.contains('dataTable-sorter')) {
                e.preventDefault();

                function getColumnIndex(_this, label) {
                    let columnIndex
                    Array.from(_this.headings).forEach((th, index) => {
                      if (th.innerText === label) columnIndex = index  
                    })
                    return columnIndex
                }

                function getActiveColumnIndex(_this, label) {
                    let columnIndex
                    Array.from(_this.activeHeadings).forEach((th, index) => {
                      if (th.innerText === label) columnIndex = index  
                    })
                    return columnIndex
                }

                function setValues(_this) {
                    let label = _this.columnValueFilter.querySelector('.values').getAttribute('label')
                    let columnIndex = getColumnIndex(_this, label)
                    let activeColumnIndex = getActiveColumnIndex(_this, label)
                    let dataSet = ((_this.filterState || {}).originalData || _this.data || [])
                    let allValues = Array.from(new Set([...dataSet.map(tr => tr.children[columnIndex].innerText)])).sort()
                    let activeValues = Array.from(new Set([..._this.activeRows.map(tr => tr.children[activeColumnIndex].innerText)])).sort()
                    console.log('activeValues', activeValues)
                    let filters = (_this.filterState || {})[label]
                    let options = `<li style="list-style-type:none;"><input type="checkbox" class="select-all" /> Select All</li>`
                    allValues.forEach((value, index) => {
                        let checked = (!filters || filters.indexOf(value) > -1)
                        let isActive = (activeValues.indexOf(value) > -1)
                        let displayValue = (isActive) ? `<b>${value}</b>` : value
                        options += `
                            <li index="${index}" value="${(index+1)}">
                                <input type="checkbox" value="${value}" ${(checked) ? 'checked' : ''} /> ${displayValue}
                            </li>`
                    })
                    _this.columnValueFilter.querySelector('.values').innerHTML = options
                }

                if (!this.columnValueFilter) {
                    const form = `
                    <dialog id="columnValueFilterDialog">
                        <div style="display:flex;">
                            <div>
                                <label>Values</label>
                                <ol class="values"></ol>
                            </div>
                        </div>
                        <div>
                            <button type="button" class="reset">Reset</button>
                            <button type="button" class="close">OK</button>
                        </div>
                    </dialog>`;
                    this.wrapper.insertAdjacentHTML('beforeend', form)
                    this.columnValueFilter = this.wrapper.querySelector('#columnValueFilterDialog')
                    this.columnValueFilter.addEventListener('click', (e) => {
                        let target = e.target;
                        if (target.classList.contains('close')) {
                            /*CHECK FOR FILTER CHANGES START*/
                            let ol = this.columnValueFilter.querySelector('ol')
                            let label = ol.getAttribute('label')
                            let activeColumnIndex = getActiveColumnIndex(this, label)
                            let filterArray = Array.from(ol.querySelectorAll('input[type=checkbox]:checked:not(.select-all)')).map(e => e.getAttribute('value'))
                            this.columns().filter(activeColumnIndex, null, true, filterArray)
                            /*CHECK FOR FILTER CHANGES END*/
                            this.columnValueFilter.close();
                            return
                        }
                        if (target.classList.contains('reset')) {
                            let ol = this.columnValueFilter.querySelector('ol')
                            let label = ol.getAttribute('label')
                            let activeColumnIndex = getActiveColumnIndex(this, label)
                            this.columns().filter(activeColumnIndex, null, true, null)
                            this.columnValueFilter.close()
                            return
                        }
                        if (target.classList.contains('select-all')) {
                            let checked = target.checked;
                            target.closest('ol').querySelectorAll('input[type=checkbox]:not(.select-all)').forEach(e => e.checked = checked)
                            return
                        }
                    })
                }
                let th = e.target.closest('th')
                let label = th.innerText
                this.columnValueFilter.querySelector('label').innerText = label
                this.columnValueFilter.querySelector('.values').setAttribute('label', label)
                setValues(this)
                this.columnValueFilter.showModal()
                return;
            }
        });

        // Per page selector
        if (options.perPageSelect) {
            const selector = this.wrapper.querySelector(".dataTable-selector")
            if (selector) {
                // Change per page
                selector.addEventListener("change", () => {
                    options.perPage = parseInt(selector.value, 10)
                    localStorage.setItem('perPage', options.perPage);
                    this.update()

                    this.fixHeight()

                    this.emit("datatable.perpage", options.perPage)
                }, false)
            }
        }

        // Search input
        if (options.searchable) {
            this.input = this.wrapper.querySelector(".dataTable-input")
            if (this.input) {
                this.input.addEventListener("keyup", () => this.search(this.input.value), false)
            }
        }

        // column filter button
        this.wrapper.querySelector('.dataTable-columnFilter button').addEventListener('click', (e) => {
            if (!this.columnFilter) {
                const form = `
                    <dialog id="columnFilterDialog">
                        <div style="display:flex;">
                            <div>
                                <label>Columns</label>
                                <ol class="columns"></ol>
                            </div>
                            <div>
                                <label>Export</label>
                                <ul>
                                    <li>
                                        <a href="javascript:void(0);" class="exportCSV">CSV</a>
                                    </li>
                                    <li>
                                        <a href="javascript:void(0);" class="exportJSON">JSON</a>
                                    </li>
                                    <li>
                                        <a href="javascript:void(0);" class="exportSQL">SQL</a>
                                    </li>
                                    <li>
                                        <a href="javascript:void(0);" class="exportTXT">TXT</a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div>
                            <button type="button" class="reset">Reset</button>
                            <button type="button" class="close">OK</button>
                        </div>
                    </dialog>`;
                this.wrapper.insertAdjacentHTML('beforeend', form)
                this.columnFilter = this.wrapper.querySelector('#columnFilterDialog')
                this.columnFilter.addEventListener('click', (e) => {
                    let target = e.target
                    if (target.classList.contains('reset')) {
                        //remove column filters
                        this.labels.forEach((label, index) => this.columns().show([index]))
                        //remove column value filters
                        this.labels.forEach((label, index) => this.columns().filter(index, null, true, null))
                        //remove search filter\
                        document.querySelector('.dataTable-search input.dataTable-input').value = ''
                        this.search('')
                        this.columnFilter.close()
                        return
                    }
                    if (target.classList.contains('close')) {
                        this.columnFilter.close()
                        return
                    }
                    if (target.classList.contains('exportCSV')) {
                        exportCSV(this, {
                            filename: this.caption || ''
                        })
                        return
                    }
                    if (target.classList.contains('exportJSON')) {
                        exportJSON(this, {
                            filename: this.caption || ''
                        })
                        return;
                    }
                    if (target.classList.contains('exportSQL')) {
                        exportSQL(this, {
                            filename: this.caption || ''
                        })
                        return
                    }
                    if (target.classList.contains('exportTXT')) {
                        exportTXT(this, {
                            filename: this.caption || ''
                        })
                        return;
                    }
                })
                this.columnFilter.addEventListener('change', (e) => {
                    let target = e.target
                    let row = target.closest('li')
                    let index = parseInt(row.getAttribute('index'))
                    if (target.checked) this.columns().show([index])
                    else this.columns().hide([index])
                })
            }
            let options = ``;
            let columnVisibility = this.columns().visible()
            this.labels.forEach((label, index) => {
                let visible = columnVisibility[index]
                options += `
                    <li index="${index}">
                        <input type="checkbox" ${visible ? 'checked' : ''} /> ${label}
                    </li>`
            })
            this.columnFilter.querySelector('.columns').innerHTML = options
            this.columnFilter.showModal()
        });

        // Pager(s) / sorting
        this.wrapper.addEventListener("click", e => {
            const t = e.target
            if (t.nodeName.toLowerCase() === "a") {
                if (t.hasAttribute("data-page")) {
                    this.page(t.getAttribute("data-page"))
                    e.preventDefault()
                } else if (
                    options.sortable &&
                    t.classList.contains("dataTable-sorter") &&
                    t.parentNode.getAttribute("data-sortable") != "false"
                ) {
                    this.columns().sort(this.headings.indexOf(t.parentNode))
                    e.preventDefault()
                }
            }
        }, false)

        window.addEventListener("resize", () => {
            this.rect = this.container.getBoundingClientRect()
            this.fixColumns()
        })
    }

    /**
     * Set up columns
     * @return {[type]} [description]
     */
    setColumns(ajax) {

        if (!ajax) {
            this.data.forEach(row => {
                Array.from(row.cells).forEach(cell => {
                    cell.data = cell.innerHTML
                })
            })
        }

        // Check for the columns option
        if (this.options.columns && this.headings.length) {

            this.options.columns.forEach(data => {

                // convert single column selection to array
                if (!Array.isArray(data.select)) {
                    data.select = [data.select]
                }

                if (data.hasOwnProperty("render") && typeof data.render === "function") {
                    this.selectedColumns = this.selectedColumns.concat(data.select)

                    this.columnRenderers.push({
                        columns: data.select,
                        renderer: data.render
                    })
                }

                // Add the data attributes to the th elements
                data.select.forEach(column => {
                    const th = this.headings[column]
                    if (data.type) {
                        th.setAttribute("data-type", data.type)
                    }
                    if (data.format) {
                        th.setAttribute("data-format", data.format)
                    }
                    if (data.hasOwnProperty("sortable")) {
                        th.setAttribute("data-sortable", data.sortable)
                    }

                    if (data.hasOwnProperty("hidden")) {
                        if (data.hidden !== false) {
                            this.columns().hide([column])
                        }
                    }

                    if (data.hasOwnProperty("sort") && data.select.length === 1) {
                        this.columns().sort(data.select[0], data.sort, true)
                    }
                })
            })
        }

        if (this.hasRows) {
            this.data.forEach((row, i) => {
                row.dataIndex = i
                Array.from(row.cells).forEach(cell => {
                    cell.data = cell.innerHTML
                })
            })

            if (this.selectedColumns.length) {
                this.data.forEach(row => {
                    Array.from(row.cells).forEach((cell, i) => {
                        if (this.selectedColumns.includes(i)) {
                            this.columnRenderers.forEach(options => {
                                if (options.columns.includes(i)) {
                                    cell.innerHTML = options.renderer.call(this, cell.data, cell, row)
                                }
                            })
                        }
                    })
                })
            }

            this.columns().rebuild()
        }

        this.render("header")
    }

    /**
     * Destroy the instance
     * @return {void}
     */
    destroy() {
        this.table.innerHTML = this.initialLayout

        // Remove the className
        this.table.classList.remove("dataTable-table")

        // Remove the containers
        this.wrapper.parentNode.replaceChild(this.table, this.wrapper)

        this.initialized = false
    }

    /**
     * Update the instance
     * @return {Void}
     */
    update() {
        this.wrapper.classList.remove("dataTable-empty")

        this.paginate(this)
        this.render("page")

        this.links = []

        let i = this.pages.length
        while (i--) {
            const num = i + 1
            this.links[i] = button(i === 0 ? "active" : "", num, num)
        }

        this.sorting = false

        this.render("pager")

        this.rows().update()

        /* footer stuff begin */
        function generateFooter(context) {
            Number.prototype.countDecimals = function () {
                let number = Math.abs(this);
                if (Math.floor(number.valueOf()) === number.valueOf()) return 0;
                var str = number.toString();
                if (str.indexOf(".") !== -1 && str.indexOf("-") !== -1) {
                    return str.split("-")[1] || 0;
                } else if (str.indexOf(".") !== -1) {
                    return str.split(".")[1].length || 0;
                }
                return str.split("-")[1] || 0;
            }
            let _this = context
            let searchData = _this.searchData || []
            let columnTypesDetected = [];
            let activeFootings = [];
            _this.activeHeadings.forEach((activeHeading, activeHeadingIndex) => {
                let sum = 0
                let values = [];
                let forcedColumnType = activeHeading.getAttribute('data-type')
                let detectedColumnType = 'number' // string, number
                let precision = 0
                _this.activeRows.forEach((activeRow, activeRowIndex) => {
                    if (searchData.length > 0 && searchData.indexOf(activeRowIndex) === -1) return //skip row if filtered out
                    let cell = activeRow.cells[activeHeadingIndex];
                    let value = (cell.getAttribute('data-value') || cell.textContent).trim().toLowerCase()
                    let number = parseFloat(value);
                    if (isNaN(number)) {
                        number = 0;
                        detectedColumnType = 'string'
                    } else {
                        let decimalPlaces = number.countDecimals()
                        if (decimalPlaces > precision) precision = decimalPlaces
                    }
                    sum = parseFloat((sum + number).toFixed(precision))
                    values.push(value)
                })
                let columnType = forcedColumnType || detectedColumnType
                let cell =createElement("th", {
                    title: (columnType === 'number') ? 'summation' : 'unique values'
                })
                cell.innerText = (columnType === 'integer') ? sum : (columnType === "number") ? sum.toFixed(precision) : [...new Set(values)].length;
                cell.style.textAlign = activeHeading.style.textAlign
                activeFootings.push(cell)
                columnTypesDetected.push(detectedColumnType)

            })
            _this.columnTypes = columnTypesDetected
            let footerRow = createElement('tr')
            activeFootings.forEach(activeFooting => {
                footerRow.insertAdjacentElement("beforeend", activeFooting)
            })
            let tfoot = createElement("tfoot")
            tfoot.innerHTML = footerRow.outerHTML
            return tfoot
        }
        if (this.options.footer && this.options.footer.auto) this.table.querySelector('tfoot').innerHTML = generateFooter(this).innerHTML
        /* footer stuff end */

        this.emit("datatable.update")
    }

    /**
     * Sort rows into pages
     * @return {Number}
     */
    paginate() {
        const perPage = this.options.perPage
        let rows = this.activeRows

        if (this.searching) {
            rows = []

            this.searchData.forEach(index => rows.push(this.activeRows[index]))
        }

        if (this.options.paging && perPage > -1) {
            // Check for hidden columns
            this.pages = rows
                .map((tr, i) => i % perPage === 0 ? rows.slice(i, i + perPage) : null)
                .filter(page => page)
        } else {
            this.pages = [rows]
        }

        this.totalPages = this.lastPage = this.pages.length

        return this.totalPages
    }

    /**
     * Fix column widths
     * @return {Void}
     */
    fixColumns() {

        if ((this.options.scrollY.length || this.options.fixedColumns) && this.activeHeadings && this.activeHeadings.length) {
            let cells
            let hd = false
            this.columnWidths = []

            // If we have headings we need only set the widths on them
            // otherwise we need a temp header and the widths need applying to all cells
            if (this.table.tHead) {

                if (this.options.scrollY.length) {
                    hd = createElement("thead")
                    hd.appendChild(createElement("tr"))
                    hd.style.height = '0px'
                    if (this.headerTable) {
                        // move real header back into place
                        this.table.tHead = this.headerTable.tHead
                    }
                }

                // Reset widths
                this.activeHeadings.forEach(cell => {
                    cell.style.width = ""
                })

                this.activeHeadings.forEach((cell, i) => {
                    const ow = cell.offsetWidth
                    const w = ow / this.rect.width * 100
                    cell.style.width = `${w}%`
                    this.columnWidths[i] = ow
                    if (this.options.scrollY.length) {
                        const th = createElement("th")
                        hd.firstElementChild.appendChild(th)
                        th.style.width = `${w}%`
                        th.style.paddingTop = "0"
                        th.style.paddingBottom = "0"
                        th.style.border = "0"
                    }
                })

                if (this.options.scrollY.length) {
                    const container = this.table.parentElement
                    if (!this.headerTable) {
                        this.headerTable = createElement("table", {
                            class: "dataTable-table"
                        })
                        const headercontainer = createElement("div", {
                            class: "dataTable-headercontainer"
                        })
                        headercontainer.appendChild(this.headerTable)
                        container.parentElement.insertBefore(headercontainer, container)
                    }
                    const thd = this.table.tHead
                    this.table.replaceChild(hd, thd)
                    this.headerTable.tHead = thd

                    // Compensate for scrollbars.
                    this.headerTable.parentElement.style.paddingRight = `${
                        this.headerTable.clientWidth -
                        this.table.clientWidth +
                        parseInt(
                            this.headerTable.parentElement.style.paddingRight ||
                            '0',
                            10
                        )
                    }px`

                    if (container.scrollHeight > container.clientHeight) {
                        // scrollbars on one page means scrollbars on all pages.
                        container.style.overflowY = 'scroll'
                    }
                }

            } else {
                cells = []

                // Make temperary headings
                hd = createElement("thead")
                const r = createElement("tr")
                Array.from(this.table.tBodies[0].rows[0].cells).forEach(() => {
                    const th = createElement("th")
                    r.appendChild(th)
                    cells.push(th)
                })

                hd.appendChild(r)
                this.table.insertBefore(hd, this.body)

                const widths = []
                cells.forEach((cell, i) => {
                    const ow = cell.offsetWidth
                    const w = ow / this.rect.width * 100
                    widths.push(w)
                    this.columnWidths[i] = ow
                })

                this.data.forEach(row => {
                    Array.from(row.cells).forEach((cell, i) => {
                        if (this.columns(cell.cellIndex).visible())
                            cell.style.width = `${widths[i]}%`
                    })
                })

                // Discard the temp header
                this.table.removeChild(hd)
            }
        }
    }

    /**
     * Fix the container height
     * @return {Void}
     */
    fixHeight() {
        if (this.options.fixedHeight) {
            this.container.style.height = null
            this.rect = this.container.getBoundingClientRect()
            this.container.style.height = `${this.rect.height}px`
        }
    }

    /**
     * Perform a search of the data set
     * @param  {string} query
     * @return {void}
     */
    search(query) {
        if (!this.hasRows) return false

        query = query.toLowerCase()

        this.currentPage = 1
        this.searching = true
        this.searchData = []

        if (!query.length) {
            this.searching = false
            this.update()
            this.emit("datatable.search", query, this.searchData)
            this.wrapper.classList.remove("search-results")
            return false
        }

        this.clear()

        this.data.forEach((row, idx) => {
            const inArray = this.searchData.includes(row)

            const doesQueryMatch = query.split("|").reduce((bool, word) => {
                let includes = false
                let cell = null
                let content = null

                for (let x = 0; x < row.cells.length; x++) {
                    cell = row.cells[x]
                    content = cell.hasAttribute('data-content') ? cell.getAttribute('data-content') : cell.textContent

                    if (
                        content.toLowerCase().includes(word) &&
                        this.columns(cell.cellIndex).visible()
                    ) {
                        includes = true
                        break
                    }
                }

                return bool && includes
            }, true)

            if (doesQueryMatch && !inArray) {
                row.searchIndex = idx
                this.searchData.push(idx)
            } else {
                row.searchIndex = null
            }
        })

        this.wrapper.classList.add("search-results")

        if (!this.searchData.length) {
            this.wrapper.classList.remove("search-results")

            this.table.querySelector('tfoot').innerHTML = ''

            this.setMessage(this.options.labels.noRows)
        } else {
            this.update()
        }

        this.emit("datatable.search", query, this.searchData)
    }

    /**
     * Change page
     * @param  {int} page
     * @return {void}
     */
    page(page) {
        // We don't want to load the current page again.
        if (page == this.currentPage) {
            return false
        }

        if (!isNaN(page)) {
            this.currentPage = parseInt(page, 10)
        }

        if (page > this.pages.length || page < 0) {
            return false
        }

        this.render("page")
        this.render("pager")

        this.emit("datatable.page", page)
    }

    /**
     * Sort by column
     * @param  {int} column - The column no.
     * @param  {string} direction - asc or desc
     * @return {void}
     */
    sortColumn(column, direction) {
        // Use columns API until sortColumn method is removed
        this.columns().sort(column, direction)
    }

    /**
     * Add new row data
     * @param {object} data
     */
    insert(data) {
        let rows = []
        if (isObject(data)) {
            if (data.headings) {
                if (!this.hasHeadings && !this.hasRows) {
                    const tr = createElement("tr")
                    data.headings.forEach(heading => {
                        const th = createElement("th", {
                            html: heading
                        })

                        tr.appendChild(th)
                    })
                    this.head.appendChild(tr)

                    this.header = tr
                    this.headings = [].slice.call(tr.cells)
                    this.hasHeadings = true

                    // Re-enable sorting if it was disabled due
                    // to missing header
                    this.options.sortable = this.initialSortable

                    // Allow sorting on new header
                    this.render("header")

                    // Activate newly added headings
                    this.activeHeadings = this.headings.slice()
                }
            }

            if (data.data && Array.isArray(data.data)) {
                rows = data.data
            }
        } else if (Array.isArray(data)) {
            data.forEach(row => {
                const r = []
                Object.entries(row).forEach(([heading, cell]) => {

                    const index = this.labels.indexOf(heading)

                    if (index > -1) {
                        r[index] = cell
                    }
                })
                rows.push(r)
            })
        }

        if (rows.length) {
            this.rows().add(rows)

            this.hasRows = true
        }

        this.update()
        this.setColumns()
        this.fixColumns()
    }

    /**
     * Refresh the instance
     * @return {void}
     */
    refresh() {
        if (this.options.searchable) {
            this.input.value = ""
            this.searching = false
        }
        this.currentPage = 1
        this.onFirstPage = true
        this.update()

        this.emit("datatable.refresh")
    }

    /**
     * Truncate the table
     * @param  {mixes} html - HTML string or HTMLElement
     * @return {void}
     */
    clear(html) {
        if (this.body) {
            flush(this.body)
        }

        let parent = this.body
        if (!this.body) {
            parent = this.table
        }

        if (html) {
            if (typeof html === "string") {
                const frag = document.createDocumentFragment()
                frag.innerHTML = html
            }

            parent.appendChild(html)
        }
    }

    /**
     * Export table to various formats (csv, txt or sql)
     * @param  {Object} userOptions User options
     * @return {Boolean}
     */
    export(userOptions) {
        if (!this.hasHeadings && !this.hasRows) return false

        const headers = this.activeHeadings
        let rows = []
        const arr = []
        let i
        let x
        let str
        let link

        const defaults = {
            download: true,
            skipColumn: [],

            // csv
            lineDelimiter: "\n",
            columnDelimiter: ",",

            // sql
            tableName: "myTable",

            // json
            replacer: null,
            space: 4
        }

        // Check for the options object
        if (!isObject(userOptions)) {
            return false
        }

        const options = {
            ...defaults,
            ...userOptions
        }

        if (options.type) {
            if (options.type === "txt" || options.type === "csv") {
                // Include headings
                rows[0] = this.header
            }

            // Selection or whole table
            if (options.selection) {
                // Page number
                if (!isNaN(options.selection)) {
                    rows = rows.concat(this.pages[options.selection - 1])
                } else if (Array.isArray(options.selection)) {
                    // Array of page numbers
                    for (i = 0; i < options.selection.length; i++) {
                        rows = rows.concat(this.pages[options.selection[i] - 1])
                    }
                }
            } else {
                rows = rows.concat(this.activeRows)
            }

            // Only proceed if we have data
            if (rows.length) {
                if (options.type === "txt" || options.type === "csv") {
                    str = ""

                    for (i = 0; i < rows.length; i++) {
                        for (x = 0; x < rows[i].cells.length; x++) {
                            // Check for column skip and visibility
                            if (
                                !options.skipColumn.includes(headers[x].originalCellIndex) &&
                                this.columns(headers[x].originalCellIndex).visible()
                            ) {
                                let text = rows[i].cells[x].textContent
                                text = text.trim()
                                text = text.replace(/\s{2,}/g, ' ')
                                text = text.replace(/\n/g, '  ')
                                text = text.replace(/"/g, '""')
                                //have to manually encode "#" as encodeURI leaves it as is.
                                text = text.replace(/#/g, "%23")
                                if (text.includes(","))
                                    text = `"${text}"`


                                str += text + options.columnDelimiter
                            }
                        }
                        // Remove trailing column delimiter
                        str = str.trim().substring(0, str.length - 1)

                        // Apply line delimiter
                        str += options.lineDelimiter
                    }

                    // Remove trailing line delimiter
                    str = str.trim().substring(0, str.length - 1)

                    if (options.download) {
                        str = `data:text/csv;charset=utf-8,${str}`
                    }
                } else if (options.type === "sql") {
                    // Begin INSERT statement
                    str = `INSERT INTO \`${options.tableName}\` (`

                    // Convert table headings to column names
                    for (i = 0; i < headers.length; i++) {
                        // Check for column skip and column visibility
                        if (
                            !options.skipColumn.includes(headers[i].originalCellIndex) &&
                            this.columns(headers[i].originalCellIndex).visible()
                        ) {
                            str += `\`${headers[i].textContent}\`,`
                        }
                    }

                    // Remove trailing comma
                    str = str.trim().substring(0, str.length - 1)

                    // Begin VALUES
                    str += ") VALUES "

                    // Iterate rows and convert cell data to column values
                    for (i = 0; i < rows.length; i++) {
                        str += "("

                        for (x = 0; x < rows[i].cells.length; x++) {
                            // Check for column skip and column visibility
                            if (
                                !options.skipColumn.includes(headers[x].originalCellIndex) &&
                                this.columns(headers[x].originalCellIndex).visible()
                            ) {
                                str += `"${rows[i].cells[x].textContent}",`
                            }
                        }

                        // Remove trailing comma
                        str = str.trim().substring(0, str.length - 1)

                        // end VALUES
                        str += "),"
                    }

                    // Remove trailing comma
                    str = str.trim().substring(0, str.length - 1)

                    // Add trailing colon
                    str += ";"

                    if (options.download) {
                        str = `data:application/sql;charset=utf-8,${str}`
                    }
                } else if (options.type === "json") {
                    // Iterate rows
                    for (x = 0; x < rows.length; x++) {
                        arr[x] = arr[x] || {}
                        // Iterate columns
                        for (i = 0; i < headers.length; i++) {
                            // Check for column skip and column visibility
                            if (
                                !options.skipColumn.includes(headers[i].originalCellIndex) &&
                                this.columns(headers[i].originalCellIndex).visible()
                            ) {
                                arr[x][headers[i].textContent] = rows[x].cells[i].textContent
                            }
                        }
                    }

                    // Convert the array of objects to JSON string
                    str = JSON.stringify(arr, options.replacer, options.space)

                    if (options.download) {
                        str = `data:application/json;charset=utf-8,${str}`
                    }
                }

                // Download
                if (options.download) {
                    // Filename
                    options.filename = options.filename || "datatable_export"
                    options.filename += `.${options.type}`

                    str = encodeURI(str)

                    // Create a link to trigger the download
                    link = document.createElement("a")
                    link.href = str
                    link.download = options.filename

                    // Append the link
                    document.body.appendChild(link)

                    // Trigger the download
                    link.click()

                    // Remove the link
                    document.body.removeChild(link)
                }

                return str
            }
        }

        return false
    }

    /**
     * Import data to the table
     * @param  {Object} userOptions User options
     * @return {Boolean}
     */
    import(userOptions) {
        let obj = false
        const defaults = {
            // csv
            lineDelimiter: "\n",
            columnDelimiter: ","
        }

        // Check for the options object
        if (!isObject(userOptions)) {
            return false
        }

        const options = {
            ...defaults,
            ...userOptions
        }

        if (options.data.length || isObject(options.data)) {
            // Import CSV
            if (options.type === "csv") {
                obj = {
                    data: []
                }

                // Split the string into rows
                const rows = options.data.split(options.lineDelimiter)

                if (rows.length) {

                    if (options.headings) {
                        obj.headings = rows[0].split(options.columnDelimiter)

                        rows.shift()
                    }

                    rows.forEach((row, i) => {
                        obj.data[i] = []

                        // Split the rows into values
                        const values = row.split(options.columnDelimiter)

                        if (values.length) {
                            values.forEach(value => {
                                obj.data[i].push(value)
                            })
                        }
                    })
                }
            } else if (options.type === "json") {
                const json = isJson(options.data)

                // Valid JSON string
                if (json) {
                    obj = {
                        headings: [],
                        data: []
                    }

                    json.forEach((data, i) => {
                        obj.data[i] = []
                        Object.entries(data).forEach(([column, value]) => {
                            if (!obj.headings.includes(column)) {
                                obj.headings.push(column)
                            }

                            obj.data[i].push(value)
                        })
                    })
                } else {
                    // console.warn("That's not valid JSON!")
                }
            }

            if (isObject(options.data)) {
                obj = options.data
            }

            if (obj) {
                // Add the rows
                this.insert(obj)
            }
        }

        return false
    }

    /**
     * Print the table
     * @return {void}
     */
    print() {
        const headings = this.activeHeadings
        const rows = this.activeRows
        const table = createElement("table")
        const thead = createElement("thead")
        const tbody = createElement("tbody")

        const tr = createElement("tr")
        headings.forEach(th => {
            tr.appendChild(
                createElement("th", {
                    html: th.textContent
                })
            )
        })

        thead.appendChild(tr)

        rows.forEach(row => {
            const tr = createElement("tr")
            Array.from(row.cells).forEach(cell => {
                tr.appendChild(
                    createElement("td", {
                        html: cell.textContent
                    })
                )
            })
            tbody.appendChild(tr)
        })

        table.appendChild(thead)
        table.appendChild(tbody)

        // Open new window
        const w = window.open()

        // Append the table to the body
        w.document.body.appendChild(table)

        // Print
        w.print()
    }

    /**
     * Show a message in the table
     * @param {string} message
     */
    setMessage(message) {
        let colspan = 1

        if (this.hasRows && this.data.length > 0) {
            colspan = this.data[0].cells.length
        } else if (this.activeHeadings.length) {
            colspan = this.activeHeadings.length
        }

        this.wrapper.classList.add("dataTable-empty")

        if (this.label) {
            this.label.innerHTML = ""
        }
        this.totalPages = 0
        this.render("pager")

        this.clear(
            createElement("tr", {
                html: `<td class="dataTables-empty" colspan="${colspan}">${message}</td>`
            })
        )
    }

    /**
     * Columns API access
     * @return {Object} new Columns instance
     */
    columns(columns) {
        return new Columns(this, columns)
    }

    /**
     * Rows API access
     * @return {Object} new Rows instance
     */
    rows(rows) {
        return new Rows(this, rows)
    }

    /**
     * Add custom event listener
     * @param  {String} event
     * @param  {Function} callback
     * @return {Void}
     */
    on(event, callback) {
        this.events = this.events || {}
        this.events[event] = this.events[event] || []
        this.events[event].push(callback)
    }

    /**
     * Remove custom event listener
     * @param  {String} event
     * @param  {Function} callback
     * @return {Void}
     */
    off(event, callback) {
        this.events = this.events || {}
        if (event in this.events === false) return
        this.events[event].splice(this.events[event].indexOf(callback), 1)
    }

    /**
     * Fire custom event
     * @param  {String} event
     * @return {Void}
     */
    emit(event) {
        this.events = this.events || {}
        if (event in this.events === false) return
        for (let i = 0; i < this.events[event].length; i++) {
            this.events[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
        }
    }
}
