import {
    cellToText,
    isObject
} from "../helpers"

/**
 * Export table to SQL
 */

export const exportSQL = function(dt, userOptions) {
    if (!dt.hasHeadings && !dt.hasRows) return false

    const defaults = {
        download: true,
        skipColumn: [],
        tableName: "myTable"
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
    let selectedRows = []
    if (options.selection) {
        // Page number
        if (Array.isArray(options.selection)) {
            // Array of page numbers
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
        // Begin INSERT statement
        let str = `INSERT INTO \`${options.tableName}\` (`

        // Convert table headings to column names
        headers.forEach((header) => {
            str += `\`${header}\`,`
        })

        // Remove trailing comma
        str = str.trim().substring(0, str.length - 1)

        // Begin VALUES
        str += ") VALUES "

        // Iterate rows and convert cell data to column values

        rows.forEach((row) => {
            str += "("
            row.forEach((cell) => {
                if (typeof cell === "string") {
                    str += `"${cell}",`
                } else {
                    str += `${cell},`
                }
            })
            // Remove trailing comma
            str = str.trim().substring(0, str.length - 1)

            // end VALUES
            str += "),"

        })

        // Remove trailing comma
        str = str.trim().substring(0, str.length - 1)

        // Add trailing colon
        str += ";"

        if (options.download) {
            str = `data:application/sql;charset=utf-8,${str}`
        }

        // Download
        if (options.download) {
            // Create a link to trigger the download
            const link = document.createElement("a")
            link.href = encodeURI(str)
            link.download = `${options.filename || "datatable_export"}.sql`

            // Append the link
            document.body.appendChild(link)

            // Trigger the download
            link.click()

            // Remove the link
            document.body.removeChild(link)
        }

        return str
    }

    return false
}