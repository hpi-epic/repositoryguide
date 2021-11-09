import Config from '../config.js'
import { remove_children } from '../utils.js'
import {
    get_teams,
    get_unregistered_collaborators,
    get_anonymous_contributors
} from '../data_functions/data_utils.js'

const container_teams = document.getElementById('container_teams')
const container_unregistered_collaborators = document.getElementById(
    'container_unregistered_collaborators'
)
const container_anonymous_contributors = document.getElementById('container_anonymous_contributors')

const config = Config.from_storage()

function append_table_row_for_team(team, index) {
    const row = document.getElementById('template_team_row').content.cloneNode(true)

    row.getElementById('text_name').innerHTML = team.name
    row.getElementById('text_label').innerHTML = team.label ? team.label : '[None]'

    const details_link = row.getElementById('link_detail_page')
    details_link.href = details_link.href.replace('.html', `?index=${index}`)

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
        const team_index = parseInt(select.options[select.selectedIndex].value, 10)
        config.teams[team_index].members.push(collaborator)

        config.to_storage()

        Toastify({
            text: 'Updated config available to download',
            duration: 3000,
            gravity: 'top',
            position: 'right',
            backgroundColor: 'MediumSeaGreen',
            stopOnFocus: true,
            offset: {
                y: '3em'
            },
            onClick: function () {
                let json = JSON.parse(config.toString())
                let content = JSON.stringify(json, null, 2)

                let element = document.createElement('a')
                element.setAttribute(
                    'href',
                    'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
                )
                element.setAttribute('download', 'config.json')

                element.style.display = 'none'
                document.body.appendChild(element)

                element.click()

                document.body.removeChild(element)
            }
        }).showToast()

        remove_children(container_unregistered_collaborators)
        await initialize_unregistered_collaborators()
    })

    container_unregistered_collaborators.appendChild(row)
}

function append_table_row_for_anonymous_contributor(contributor) {
    const row = document.getElementById('template_anonymous_contributor').content.cloneNode(true)

    row.getElementById('text_contributor_name').innerHTML = contributor.name
    row.getElementById('text_contributor_email').innerHTML = contributor.email

    container_anonymous_contributors.appendChild(row)
}

async function initialize_unregistered_collaborators() {
    const collaborators = await get_unregistered_collaborators(config)
    collaborators.forEach((collaborator) =>
        append_table_row_for_unregistered_collaborator(collaborator)
    )
}

async function initialize_anonymous_contributors() {
    const contributors = await get_anonymous_contributors(config)
    contributors.forEach((contributor) => append_table_row_for_anonymous_contributor(contributor))
}

async function initialize() {
    // document.getElementById('button_navigate_teams').classList.add('active')

    config.teams.forEach((team, index) => {
        append_table_row_for_team(team, index)
    })
    await initialize_unregistered_collaborators()
    await initialize_anonymous_contributors()
}

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

document
    .getElementById('button_load_anonymous_contributors_from_github')
    .addEventListener('click', async () => {
        if (!config.organization || !config.repository) {
            alert('This action requires an organization and a repository to be set')
            return
        }

        remove_children(container_anonymous_contributors)
        await initialize_anonymous_contributors()
    })

initialize()
