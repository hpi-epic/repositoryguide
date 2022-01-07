import {
    get_teams_for_organization,
    get_team_members,
    get_collaborators_for_repository,
    get_anonymous_contributors_for_repository
} from './api_requests/rest_requests.js'

export async function get_teams(config) {
    if (!config.organization) {
        return []
    }

    const teams = await get_teams_for_organization(config.github_access_token, config.organization)
    const members = await Promise.all(
        teams.map((team) =>
            get_team_members(config.github_access_token, config.organization, team.slug)
        )
    )

    return teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        members: members[index].map((member) => ({
            name: member.login,
            id: member.id
        }))
    }))
}

async function get_collaborators(config) {
    if (!config.organization || !config.repository) {
        return []
    }

    return get_collaborators_for_repository(
        config.github_access_token,
        config.organization,
        config.repository
    ).then((result) =>
        result.map((collaborator) => ({
            name: collaborator.login,
            id: collaborator.id
        }))
    )
}

export async function get_unregistered_collaborators(config) {
    const collaborators = await get_collaborators(config)

    let registered_collaborator_ids = []
    if (config.teams && config.teams.length !== 0) {
        config.teams.forEach((team) => {
            registered_collaborator_ids = registered_collaborator_ids.concat(
                team.members.map((member) => member.id)
            )
        })

        return collaborators.filter(
            (collaborator) => !registered_collaborator_ids.includes(collaborator.id)
        )
    }
    alert('No teams loaded')
    return null
}

export async function get_anonymous_contributors(config) {
    if (!config.organization || !config.repository) {
        return []
    }

    const anonymous_contributors = await get_anonymous_contributors_for_repository(
        config.github_access_token,
        config.organization,
        config.repository
    ).then((result) => result.filter((contributor) => contributor.type === 'Anonymous'))

    return anonymous_contributors
}
