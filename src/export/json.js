import {
    cellToText,
    isObject
} from "../helpers"

/**
 * Export table to JSON
 */

export const exportJSON = function(dt, userOptions) {
    if (!dt.hasHeadings && !dt.hasRows) return false

    const defaults = {
        download: true,
        skipColumn: [],
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

    const columnShown = (index) => !options.skipColumn.includes(index) && dt.hiddenColumns.indexOf(index) === -1

    // Selection or whole table
    let selectedRows
    if (options.selection) {
        // Page number
        if (Array.isArray(options.selection)) {
            // Array of page numbers
            selectedRows = []
            for (let i = 0; i < options.selection.length; i++) {
                selectedRows = selectedRows.concat(dt.pages[options.selection[i] - 1].map(row => row.row))
            }
        } else {
            selectedRows = dt.pages[options.selection - 1].map(row => row.row)
        }
    } else {
        selectedRows = dt.data //TODO: use activeRows instead?
    }

    const rows = selectedRows.map((row) => {
        const shownCells = [...row.children].filter((_cell, index) => columnShown(index))
        return shownCells.map((cell) => cellToText(cell))
    })

    const headers = dt.headings.filter((_heading, index) => columnShown(index)).map((header) => header.text ?? header.data ?? header.innerText)

    // Only proceed if we have data
    if (rows.length) {
        const arr = []
        rows.forEach((row, x) => {
            arr[x] = arr[x] || {}
            row.forEach((cell, i) => {
                arr[x][headers[i]] = cell
            })
        })

        // Convert the array of objects to JSON string
        const str = JSON.stringify(arr, options.replacer, options.space)

        // Download
        if (options.download) {
            // Create a link to trigger the download

            const blob = new Blob(
                [str],
                {
                    type: "data:application/json;charset=utf-8"
                }
            )
            const url = URL.createObjectURL(blob)


            const link = document.createElement("a")
            link.href = url
            link.download = `${options.filename || "datatable_export"}.json`

            // Append the link
            document.body.appendChild(link)

            // Trigger the download
            link.click()

            // Remove the link
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }

        return str
    }

    return false
}