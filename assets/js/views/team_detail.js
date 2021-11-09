import Config from '../config.js'
import { get_parameters, remove_children } from '../utils.js'

const parameters = get_parameters(window.location.href)
const config = Config.from_storage()
const team = config.teams[parseInt(parameters.index, 10)]

const container_members = document.getElementById('container_members')

document.getElementById('text_team_name').innerHTML = team.name
document.getElementById('text_team_label').innerHTML = team.label ? team.label : '[None]'

function initialize_member_list() {
    team.members.forEach((member, index) => {
        const row = document.getElementById('template_team_member_row').content.cloneNode(true)
        row.getElementById('text_member_name').innerHTML = member.name

        const button_remove = row.getElementById('button_remove_member')
        button_remove.addEventListener('click', () => {
            if (confirm(`Are you sure you want to remove ${member.name} from this team?`)) {
                team.members.splice(index, 1)
                remove_children(container_members)
                initialize_member_list()
                config.to_storage()
            }
        })

        container_members.appendChild(row)
    })
}

function initialize() {
    // document.getElementById('button_navigate_teams').classList.add('active')
    initialize_member_list()
}

initialize()
