/**
 * Check is item is object
 * @return {Boolean}
 */
export const isObject = val => Object.prototype.toString.call(val) === "[object Object]"

/**
 * Check for valid JSON string
 * @param  {String}   str
 * @return {Boolean|Array|Object}
 */
export const isJson = str => {
    let t = !1
    try {
        t = JSON.parse(str)
    } catch (e) {
        return !1
    }
    return !(null === t || (!Array.isArray(t) && !isObject(t))) && t
}

/**
 * Create DOM element node
 * @param  {String}   nodeName nodeName
 * @param  {Object}   attrs properties and attributes
 * @return {Object}
 */
export const createElement = (nodeName, attrs) => {
    const dom = document.createElement(nodeName)
    if (attrs && "object" == typeof attrs) {
        for (const attr in attrs) {
            if ("html" === attr) {
                dom.innerHTML = attrs[attr]
            } else {
                dom.setAttribute(attr, attrs[attr])
            }
        }
    }
    return dom
}

export const flush = el => {
    if (el instanceof NodeList) {
        el.forEach(e => flush(e))
    } else {
        el.innerHTML = ""
    }
}

/**
 * Create button helper
 * @param  {String}   class
 * @param  {Number}   page
 * @param  {String}   text
 * @return {Object}
 */
export const button = (className, page, text) => createElement(
    "li",
    {
        class: className,
        html: `<a href="#" data-page="${page}">${text}</a>`
    }
)

/**
 * Bubble sort algorithm
 */
export const sortItems = (a, b) => {
    let c
    let d
    if (1 === b) {
        c = 0
        d = a.length
    } else {
        if (b === -1) {
            c = a.length - 1
            d = -1
        }
    }
    for (let e = !0; e;) {
        e = !1
        for (let f = c; f != d; f += b) {
            if (a[f + b] && a[f].value > a[f + b].value) {
                const g = a[f]
                const h = a[f + b]
                const i = g
                a[f] = h
                a[f + b] = i
                e = !0
            }
        }
    }
    return a
}

/**
 * Pager truncation algorithm
 */
export const truncate = (a, b, c, d, ellipsis) => {
    d = d || 2
    let j
    const e = 2 * d
    let f = b - d
    let g = b + d
    const h = []
    const i = []
    if (b < 4 - d + e) {
        g = 3 + e
    } else if (b > c - (3 - d + e)) {
        f = c - (2 + e)
    }
    for (let k = 1; k <= c; k++) {
        if (1 == k || k == c || (k >= f && k <= g)) {
            const l = a[k - 1]
            l.classList.remove("active")
            h.push(l)
        }
    }
    h.forEach(c => {
        const d = c.children[0].getAttribute("data-page")
        if (j) {
            const e = j.children[0].getAttribute("data-page")
            if (d - e == 2) i.push(a[e])
            else if (d - e != 1) {
                const f = createElement("li", {
                    class: "ellipsis",
                    html: `<a href="#">${ellipsis}</a>`
                })
                i.push(f)
            }
        }
        i.push(c)
        j = c
    })

    return i
}

export const objToText = (obj) => {
    if (["#text", "#comment"].includes(obj.nodeName)) {
        return (obj).data
    }
    if (obj.childNodes) {
        return obj.childNodes.map((childNode) => objToText(childNode)).join("")
    }
    return ""
}

export const cellToText = (obj) => {
    if (obj === null || obj === undefined) {
        return ""
    } else if (obj.hasOwnProperty("text") || obj.hasOwnProperty("data")) {
        const cell = obj
        return cell.text ?? cellToText(cell.data)
    } else if (obj.hasOwnProperty("nodeName")) {
        return objToText(obj)
    }
    return String(obj)
}


export const escapeText = function(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}


export const visibleToColumnIndex = function(visibleIndex, columns) {
    let counter = 0
    let columnIndex = 0
    while (counter < (visibleIndex+1)) {
        const columnSettings = columns[columnIndex]
        if (!columnSettings.hidden) {
            counter += 1
        }
        columnIndex += 1
    }
    return columnIndex-1
}

export const columnToVisibleIndex = function(columnIndex, columns) {
    let visibleIndex = columnIndex
    let counter = 0
    while (counter < columnIndex) {
        const columnSettings = columns[counter]
        if (columnSettings.hidden) {
            visibleIndex -= 1
        }
        counter++
    }
    return visibleIndex
}

/**
 * Converts a [NamedNodeMap](https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap) into a normal object.
 *
 * @param map The `NamedNodeMap` to convert
 */
export const namedNodeMapToObject = function(map) {
    const obj = {}
    if (map) {
        for (const attr of map) {
            obj[attr.name] = attr.value
        }
    }
    return obj
}

/**
 * Convert class names to a CSS selector. Multiple classes should be separated by spaces.
 * Examples:
 *  - "my-class" -> ".my-class"
 *  - "my-class second-class" -> ".my-class.second-class"
 *
 * @param classNames The class names to convert. Can contain multiple classes separated by spaces.
 */
export const classNamesToSelector = (classNames) => {
    if (!classNames) {
        return null
    }
    return classNames.trim().split(" ").map(className => `.${className}`).join("")
}

/**
 * Check if the element contains all the classes. Multiple classes should be separated by spaces.
 *
 * @param element The element that will be checked
 * @param classes The classes that must be present in the element. Can contain multiple classes separated by spaces.
 */
export const containsClass = (element, classes) => {
    const hasMissingClass = classes?.split(" ").some(className => !element.classList.contains(className))
    return !hasMissingClass
}

/**
 * Join two strings with spaces. Null values are ignored.
 * Examples:
 *  - joinWithSpaces("a", "b") -> "a b"
 *  - joinWithSpaces("a", null) -> "a"
 *  - joinWithSpaces(null, "b") -> "b"
 *  - joinWithSpaces("a", "b c") -> "a b c"
 *
 * @param first The first string to join
 * @param second The second string to join
 */
export const joinWithSpaces = (first, second) => {
    if (first) {
        if (second) {
            return `${first} ${second}`
        }
        return first
    } else if (second) {
        return second
    }
    return ""
}
