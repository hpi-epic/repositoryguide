import Config from './config.js'

const container_sprints = document.getElementById('container_sprints')

const config = Config.from_storage()
const sprints = config._sprints
initialize()

document
    .getElementById('button_navigate_home')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_teams')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_sprint')
    .addEventListener('click', (event) => event.preventDefault())
document
    .getElementById('button_navigate_settings')
    .addEventListener('click', () => config.to_storage_storage())

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
    config.sprints.forEach((sprint, index) => {
        append_table_row_for_sprint(sprint, index)
    })
}

function getDateString(date) {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}