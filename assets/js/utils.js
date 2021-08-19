export const deepClone = (object) => JSON.parse(JSON.stringify(object))

export const get_max = (data) => Math.max(...data.map((element) => element.value))
export const get_min = (data) => Math.min(...data.map((element) => element.value))

export const sort_ascending_by_value = (array) => array.sort((a, b) => a.value - b.value)
export const sort_descending_by_value = (array) => array.sort((a, b) => b.value - a.value)

export const sum = (data) =>
    deepClone(data)
        .map((element) => element.value)
        .reduce((a, b) => a + b, 0)

export const quantile = (array, percentage) => {
    const sorted = sort_ascending_by_value(deepClone(array))
    const position = (sorted.length - 1) * percentage
    const base = Math.floor(position)
    const rest = position - base
    if (sorted[base + 1] !== undefined) {
        return sorted[base].value + rest * (sorted[base + 1].value - sorted[base].value)
    }
    return sorted[base].value
}

export function remove_children(object) {
    while (object.firstChild) {
        object.removeChild(object.lastChild)
    }
}

export const transpose = (array) => array[0].map((_, colIndex) => array.map((row) => row[colIndex]))

export function get_parameters(url) {
    const parameter_strings = url.split('?')[1].split('&')
    const parameters = {}

    parameter_strings.forEach((string) => {
        const pair = string.split('=')
        parameters[pair[0]] = pair[1]
    })

    return parameters
}

export function create_default_option(text) {
    const option = new Option(text)
    option.selected = true
    option.disabled = true
    option.value = 'none'

    return option
}
