export async function add_header() {
    const header = document.createElement('header')
    const response = await fetch('/assets/components/navigation-header.html')
    header.innerHTML = await response.text()
    document.body.prepend(header)
}
