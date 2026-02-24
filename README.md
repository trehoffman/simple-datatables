# Simple-DataTables Documentation

A lightweight, dependency-free JavaScript plugin that enhances plain HTML `<table>` elements with sorting, pagination, search, filtering, and export features.

---

## Quick Start

```javascript
import { DataTable } from "simple-datatables"

// Pass a CSS selector or a DOM element reference
const dataTable = new DataTable("#myTable")

// With options
const dataTable = new DataTable("#myTable", {
    searchable: false,
    perPage: 25
})
```

The plugin wraps the original `<table>` in a `.dataTable-wrapper` div and injects controls (search input, per-page selector, pagination, column filter button) above and below it.

---

## Configuration Options

All options are passed as the second argument to the `DataTable` constructor.

### Core

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sortable` | `boolean` | `true` | Enable column sorting |
| `searchable` | `boolean` | `true` | Enable the search input |
| `header` | `boolean` | `true` | Show the table header (`<thead>`) |
| `footer` | `boolean\|Object` | `false` | Show a footer row. Set to `{ auto: true }` to auto-generate a summary row (sums for numeric columns, unique count for text columns) |

### Pagination

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paging` | `boolean` | `true` | Enable pagination |
| `perPage` | `number` | `10` | Rows per page. Persisted in `localStorage` across sessions |
| `perPageSelect` | `number[]` | `[5,10,15,20,25,-1]` | Options for the per-page dropdown. Use `-1` for "All" |
| `nextPrev` | `boolean` | `true` | Show previous/next pager buttons |
| `firstLast` | `boolean` | `false` | Show first/last pager buttons |
| `prevText` | `string` | `"‹"` | Label for the previous button |
| `nextText` | `string` | `"›"` | Label for the next button |
| `firstText` | `string` | `"«"` | Label for the first button |
| `lastText` | `string` | `"»"` | Label for the last button |
| `ellipsisText` | `string` | `"…"` | Text used for ellipsis in truncated pagers |
| `truncatePager` | `boolean` | `true` | Collapse distant page links into ellipses |
| `pagerDelta` | `number` | `2` | Number of page links to show on each side of the current page |

### Layout & Appearance

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scrollY` | `string` | `""` | Set a CSS height (e.g. `"300px"`) to make the table body scroll vertically with a fixed header |
| `fixedColumns` | `boolean` | `true` | Maintain fixed column widths as data changes |
| `fixedHeight` | `boolean` | `false` | Lock the container to its first-page height to prevent layout shifts |
| `ascText` | `string` | `"▴"` | Indicator shown on an ascending-sorted column |
| `descText` | `string` | `"▾"` | Indicator shown on a descending-sorted column |

### Labels

Customise all UI text with the `labels` object:

```javascript
new DataTable("#myTable", {
    labels: {
        placeholder: "Search...",              // search input placeholder
        perPage: "{select} entries per page",  // {select} is replaced with the dropdown
        noRows: "No entries found",            // shown when search returns nothing
        info: "Showing {start} to {end} of {rows} entries"
        // also supports {page} and {pages}
    }
})
```

### Layout Templates

Control where controls are placed using the `layout` option. The following tokens are replaced with their rendered HTML:

- `{select}` — per-page dropdown
- `{search}` — search input
- `{columnFilter}` — column visibility / export button (⚙)
- `{info}` — row count info
- `{pager}` — pagination links

```javascript
new DataTable("#myTable", {
    layout: {
        top: "{select}<div>{search}{columnFilter}</div>",
        bottom: "{info}{pager}"
    }
})
```

### Columns Configuration

Use the `columns` array to configure per-column behaviour:

```javascript
new DataTable("#myTable", {
    columns: [
        {
            select: 0,            // column index (or array of indexes)
            sortable: false       // disable sorting on this column
        },
        {
            select: 2,
            hidden: true          // hide the column on init
        },
        {
            select: 3,
            type: "date",         // treat column as date for sorting
            format: "MM/DD/YYYY"  // dayjs format string
        },
        {
            select: 1,
            sort: "asc",          // initial sort direction
            render: (data, cell, row) => {
                // Custom cell renderer — return an HTML string
                return `<strong>${data}</strong>`
            }
        }
    ]
})
```

`data-type` and `data-format` HTML attributes on `<th>` elements work as an alternative to the `columns` option.

### AJAX / Remote Data

```javascript
new DataTable("#myTable", {
    ajax: {
        url: "/api/data.json",
        load: (xhr) => xhr.responseText,   // optional: transform the raw response
        content: { type: "json" }          // tell the importer what format to expect
    }
})
```

Events fired during an AJAX lifecycle: `datatable.ajax.loading`, `datatable.ajax.loaded`, `datatable.ajax.success`, `datatable.ajax.error`, `datatable.ajax.abort`.

### Programmatic Data

Provide data directly instead of using an existing HTML table:

```javascript
new DataTable("#myTable", {
    data: {
        headings: ["Name", "Age", "City"],
        data: [
            ["Alice", 30, "New York"],
            ["Bob",   25, "London"]
        ]
    }
})
```

### Initial Filters

Pre-filter columns on initialisation:

```javascript
new DataTable("#myTable", {
    filters: {
        "Status": ["Active", "Pending"]   // key = column heading text, value = allowed values
    }
})
```

### Plugins

```javascript
new DataTable("#myTable", {
    plugins: {
        myPlugin: { enabled: true, /* plugin options */ }
    }
})
```

The plugin must have been registered first via `DataTable.extend("myPlugin", pluginFn)`.

---

## Public API

### `search(query: string)`

Filter visible rows to those containing `query`. Supports `|` as an OR operator (`"alice|bob"` matches rows containing either word). Searching only looks at visible columns.

```javascript
dataTable.search("New York")
dataTable.search("")   // clear search
```

### `page(n: number)`

Navigate to page number `n` (1-indexed).

```javascript
dataTable.page(3)
```

### `insert(data: Object | Array)`

Add rows programmatically.

```javascript
// Object format — can also set headings if the table is empty
dataTable.insert({
    headings: ["Name", "Age"],   // optional
    data: [["Carol", 28], ["Dan", 34]]
})

// Array of objects format — keys must match existing column headings
dataTable.insert([
    { Name: "Eve", Age: 22 },
    { Name: "Frank", Age: 41 }
])
```

### `refresh()`

Reset search, return to page 1, and redraw the table.

```javascript
dataTable.refresh()
```

### `destroy()`

Remove all plugin DOM structures and restore the original `<table>` to its pre-init state.

```javascript
dataTable.destroy()
```

### `print()`

Opens a new browser window containing a clean (controls-free) version of the table and triggers the browser print dialog.

```javascript
dataTable.print()
```

### `export(options: Object)`

Export table data.

```javascript
dataTable.export({ type: "csv", download: true, filename: "my-export" })
dataTable.export({ type: "json" })
dataTable.export({ type: "sql", tableName: "users" })
dataTable.export({ type: "txt" })

// Export only specific pages
dataTable.export({ type: "csv", selection: 2 })        // page 2 only
dataTable.export({ type: "csv", selection: [1, 3] })   // pages 1 and 3

// Skip columns by index
dataTable.export({ type: "csv", skipColumn: [0, 4] })
```

### `import(options: Object)`

Import CSV or JSON data into the table.

```javascript
// CSV
dataTable.import({
    type: "csv",
    data: "Name,Age\nAlice,30\nBob,25",
    headings: true,           // treat first row as headings
    lineDelimiter: "\n",
    columnDelimiter: ","
})

// JSON (array of objects string)
dataTable.import({ type: "json", data: '[{"Name":"Alice","Age":30}]' })
```

### `sortColumn(column: number, direction?: "asc"|"desc")`

Programmatically sort a column.

```javascript
dataTable.sortColumn(2, "desc")
```

### `setMessage(message: string)`

Display a custom message in the table body (e.g. "Loading…").

```javascript
dataTable.setMessage("Loading data, please wait…")
```

### `DataTable.extend(prop: string, val: Function | any)`

Add a method or property to all future `DataTable` instances (used for plugin authoring).

```javascript
DataTable.extend("myMethod", function(options) {
    return { init() { /* ... */ } }
})
```

---

## Columns API

Access via `dataTable.columns()`.

### `sort(column, dir?, init?)`

Sort column `column` (index). `dir` is `"asc"` or `"desc"` (toggles if omitted).

```javascript
dataTable.columns().sort(1)          // toggle
dataTable.columns().sort(1, "asc")   // force ascending
```

### `filter(column, dir, init, terms)`

Filter column `column` to only show rows whose cell value is in `terms` array. Pass `null` to clear the filter.

```javascript
dataTable.columns().filter(2, null, true, ["Active", "Pending"])
dataTable.columns().filter(2, null, true, null)  // remove filter
```

### `hide(columns: number[])`

Hide one or more columns by index.

```javascript
dataTable.columns().hide([0, 3])
```

### `show(columns: number[])`

Show previously hidden columns.

```javascript
dataTable.columns().show([0, 3])
```

### `visible(columns?: number | number[])`

Check visibility. Returns a boolean (single column) or array of booleans.

```javascript
dataTable.columns().visible(2)      // true or false
dataTable.columns().visible([0,1])  // [true, false]
dataTable.columns().visible()       // array for all columns
```

### `add(data: Object)`

Add a new column.

```javascript
dataTable.columns().add({
    heading: "Score",
    data: ["88", "73", "95", /* one value per row */],
    type: "number",
    sortable: true,
    render: (data) => `<b>${data}</b>`
})
```

### `remove(select: number | number[])`

Remove column(s) by index.

```javascript
dataTable.columns().remove(4)
dataTable.columns().remove([1, 3])
```

### `order(columns: number[])`

Reorder all columns. Pass the new column order as an array of original indexes.

```javascript
dataTable.columns().order([2, 0, 1])  // move col 2 first
```

### `swap(columns: [number, number])`

Swap two columns.

```javascript
dataTable.columns().swap([1, 3])
```

---

## Rows API

Access via `dataTable.rows()`.

### `add(data: Array)`

Add one or more rows.

```javascript
dataTable.rows().add(["Alice", 30, "New York"])           // single row
dataTable.rows().add([["Alice", 30], ["Bob", 25]])        // multiple rows
```

### `remove(select: number | number[] | "all")`

Remove row(s) by their data index.

```javascript
dataTable.rows().remove(5)
dataTable.rows().remove([2, 4, 7])
dataTable.rows().remove("all")
```

---

## Events

Register listeners with `on()` and remove them with `off()`.

```javascript
dataTable.on("datatable.init", () => console.log("Ready"))
dataTable.on("datatable.search", (query, matched) => {
    console.log(`Found ${matched.length} results for "${query}"`)
})

const handler = () => { /* ... */ }
dataTable.on("datatable.update", handler)
dataTable.off("datatable.update", handler)
```

| Event | Arguments | Fired when |
|-------|-----------|-----------|
| `datatable.init` | — | Initialisation is complete |
| `datatable.update` | — | The table is redrawn |
| `datatable.page` | `page` | The user navigates to a page |
| `datatable.perpage` | `perPage` | The per-page count changes |
| `datatable.search` | `query, matchedIndexes` | A search runs |
| `datatable.sorting` | `column, dir` | A sort begins |
| `datatable.sort` | `column, dir` | A sort completes |
| `datatable.refresh` | — | `refresh()` is called |
| `datatable.ajax.loading` | `xhr` | AJAX request starts |
| `datatable.ajax.loaded` | `e, xhr` | AJAX request finishes (any status) |
| `datatable.ajax.success` | `e, xhr` | AJAX request succeeds (HTTP 200) |
| `datatable.ajax.error` | `e, xhr` | AJAX request fails |
| `datatable.ajax.abort` | `e, xhr` | AJAX request is aborted |
| `datatable.ajax.progress` | `e, xhr` | AJAX request progress event |

---

## Built-in UI Features

### Column Filter Dialog (⚙ button)

Clicking the ⚙ button in the toolbar opens a dialog with:
- **Columns** — checkboxes to show/hide each column
- **Export** — one-click download links for CSV, JSON, SQL, and TXT
- **Reset** button — clears all column filters, value filters, and the search input

### Right-click Column Value Filter

Right-clicking a sortable column header opens a value-filter dialog showing all distinct values for that column. Active values (present in currently visible rows) are shown in bold. Unchecking a value hides rows with that value.

---

## HTML Data Attributes

These attributes on `<th>` elements control column behaviour without JavaScript options:

| Attribute | Values | Effect |
|-----------|--------|--------|
| `data-sortable="false"` | `"false"` | Disables sorting for that column |
| `data-type="date"` | `"date"`, `"number"`, `"string"` | Sets the sort type |
| `data-format="..."` | dayjs format string | Required when `data-type="date"` |
| `data-content="..."` on `<td>` | any string | Used as the sort/search value instead of visible text |

---

## CSS Classes

The wrapper div gets these classes automatically:

| Class | Added when |
|-------|-----------|
| `.dataTable-wrapper` | Always |
| `.dataTable-loading` | During initial render |
| `.dataTable-empty` | No rows match the current search/filter |
| `.search-results` | A search is active |
| `.sortable` | `sortable: true` |
| `.searchable` | `searchable: true` |
| `.fixed-height` | `fixedHeight: true` |
| `.fixed-columns` | `fixedColumns: true` |
| `.no-header` | `header: false` |
| `.no-footer` | `footer: false` |

Sorted column headers receive `.asc` or `.desc`. Filtered column headers receive `.filtered`.

---

## Source File Structure

```
src/
├── index.js       — Package entry point, exports DataTable
├── datatable.js   — Main DataTable class (init, render, search, page, import/export, events)
├── columns.js     — Columns API (sort, filter, hide, show, add, remove, order, swap)
├── rows.js        — Rows API (add, remove)
├── config.js      — Default configuration object
├── table.js       — dataToTable() — converts a data object to <thead>/<tbody> DOM nodes
├── date.js        — Date parsing (via dayjs) for date-type column sorting
├── helpers.js     — DOM utilities (createElement, flush, button, sortItems, truncate, etc.)
└── export/
    ├── csv.js     — exportCSV()
    ├── json.js    — exportJSON()
    ├── sql.js     — exportSQL()
    └── txt.js     — exportTXT()
```

---

## License

LGPL-3.0
