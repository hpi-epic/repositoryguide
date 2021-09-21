async function create_header() {
    const response = await fetch('/assets/components/navigation-header.html')
    return response.text()
}

const placeholder_mapping = {
    'data-header': create_header
}

async function replace_placeholders() {
    for (const placeholder_name of Object.keys(placeholder_mapping)) {
        const elements = [...document.querySelectorAll(`[${placeholder_name}]`)]
        for (const element of elements) {
            element.innerHTML = await placeholder_mapping[placeholder_name]()
        }
    }
}

replace_placeholders()
