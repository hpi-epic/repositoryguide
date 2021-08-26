import Config from './config.js'
import { remove_children } from './utils.js'
import { get_teams, get_unregistered_collaborators } from './data_functions.js'

const container_teams = document.getElementById('container_teams')
const container_unregistered_collaborators = document.getElementById(
    'container_unregistered_collaborators'
)
const config = Config.from_storage()

document
    .getElementById('button_navigate_home')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_teams')
    .addEventListener('click', (event) => event.preventDefault())
document
    .getElementById('button_navigate_settings')
    .addEventListener('click', () => config.to_storage_storage())
document.getElementById('button_back').addEventListener('click', () => config.to_storage_storage())

document.getElementById('button_load_teams_from_github').addEventListener('click', async () => {
    if (!config.organization) {
        alert('No organization defined. This is required to lead the teams')
        return
    }

    config.teams = await get_teams(config)

    remove_children(container_teams)
    remove_children(container_unregistered_collaborators)
    await initialize()
})

document
    .getElementById('button_load_unregistered_collaborators_from_github')
    .addEventListener('click', async () => {
        if (!config.organization || !config.repository) {
            alert('This action requires an organization and a repository to be set')
            return
        }

        remove_children(container_unregistered_collaborators)
        await initialize_unregistered_collaborators()
    })

function append_table_row_for_team(team, index) {
    const row = document.getElementById('template_team_row').content.cloneNode(true)

    row.getElementById('text_name').innerHTML = team.name
    row.getElementById('text_label').innerHTML = team.label

    const details_link = row.getElementById('link_detail_page')
    details_link.href += `?index=${index}`

    container_teams.appendChild(row)
}

function append_table_row_for_unregistered_collaborator(collaborator) {
    const row = document
        .getElementById('template_unregistered_collaborator_row')
        .content.cloneNode(true)

    row.getElementById('text_collaborator_name').innerHTML = collaborator.name
    const select = row.getElementById('select_team')
    const button = row.getElementById('button_assign')

    config.teams.forEach((team) => {
        select.options[select.options.length] = new Option(
            team.name,
            config.teams.indexOf(team).toString()
        )
    })
    select.addEventListener('change', () => {
        button.disabled = false
    })

    button.addEventListener('click', async () => {
        const team_index = parseInt(select.options[select.selectedIndex].value)
        config.teams[team_index].members.push(collaborator)

        config.to_storage_storage()

        remove_children(container_unregistered_collaborators)
        await initialize_unregistered_collaborators()
    })

    container_unregistered_collaborators.appendChild(row)
}

async function initialize_unregistered_collaborators() {
    const collaborators = await get_unregistered_collaborators(config)
    collaborators.forEach((collaborator) =>
        append_table_row_for_unregistered_collaborator(collaborator)
    )
}

async function initialize() {
    config.teams.forEach((team, index) => {
        append_table_row_for_team(team, index)
    })
    await initialize_unregistered_collaborators()
}

initialize()
