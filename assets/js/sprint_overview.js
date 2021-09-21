import Config from './config.js'

const container_sprints = document.getElementById('container_sprints')
const config = Config.from_storage()

function getDateString(date) {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}

function append_table_row_for_sprint(sprint, index) {
    const row = document.getElementById('template_sprint_row').content.cloneNode(true)
    const startDate = new Date(sprint.from)
    const endDate = new Date(sprint.to)

    row.getElementById('text_name').innerHTML = `Sprint ${index + 1}`
    row.getElementById('text_from').innerHTML = getDateString(startDate)
    row.getElementById('text_to').innerHTML = getDateString(endDate)

    container_sprints.appendChild(row)
}

function initialize() {
    // document.getElementById('button_navigate_sprint').classList.add('active')
    config.sprints.forEach((sprint, index) => {
        append_table_row_for_sprint(sprint, index)
    })
}

initialize()
