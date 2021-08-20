import Config from './config.js'
import { remove_children } from './utils.js'

let config = Config.from_storage()

const inputs = {
    input_config_file: document.getElementById('input_config_file'),
    button_download_config: document.getElementById('button_download_config'),
    input_organization: document.getElementById('input_organization'),
    input_repository: document.getElementById('input_repository'),
    input_team: document.getElementById('input_team')
}

document
    .getElementById('button_navigate_home')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_teams')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_sprint')
    .addEventListener('click', () => config.to_storage_storage())
document
    .getElementById('button_navigate_settings')
    .addEventListener('click', (event) => event.preventDefault())

inputs.input_config_file.addEventListener('change', (event) =>
    Config.from_file(event.target.files[0], (_config) => {
        config = _config
        initialize(config)
        Toastify({
            text: 'Config successfully loaded',
            duration: 3000,
            gravity: 'top',
            position: 'center',
            backgroundColor: 'MediumSeaGreen',
            stopOnFocus: true
        }).showToast()
    })
)

inputs.button_download_config.addEventListener('click', () => {
    const content = config.toString()

    const element = document.createElement('a')
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`)
    element.setAttribute('download', 'config.json')

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    document.body.removeChild(element)
})

inputs.input_organization.addEventListener('change', () => {
    config.organization = inputs.organization.value
})

inputs.input_repository.addEventListener('change', () => {
    config.repository = inputs.repository.value
})

inputs.input_team.addEventListener('change', () => {
    const selected = inputs.input_team.options[inputs.input_team.selectedIndex]
    if (selected.value === 'none') {
        config.team_index = null
    } else {
        config.team_index = parseInt(selected.value)
    }
})

function initialize(config) {
    inputs.input_organization.value = config.organization
    inputs.input_repository.value = config.repository
    remove_children(inputs.input_team)
    inputs.input_team.options[0] = new Option('None', 'none', true)
    config.teams.forEach((team, index) => {
        inputs.input_team.options[inputs.input_team.options.length] = new Option(
            team.name,
            index.toString()
        )
    })
    if (config.team_index) {
        inputs.input_team.selectedIndex = config.team_index
    }
}

initialize(config)