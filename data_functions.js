// ------------------- Octokit ------------------- //

import { Octokit } from 'https://cdn.skypack.dev/octokit'
import { paginateRest } from 'https://cdn.skypack.dev/@octokit/plugin-paginate-rest'
import { throttling } from 'https://cdn.skypack.dev/@octokit/plugin-throttling'

// ------------------- Metrices ------------------- //
import {
    buckets,
    issue_size,
    issue_size_bucket,
    pull_request_closing_time,
    pull_request_closing_time_bucket
} from './metrics.js'

// ------------------- helper functions ------------------- //
import { get_max, get_min, sort_descending_by_value } from './utils.js'

const MyOctokit = Octokit.plugin(paginateRest, throttling)

const octokit = (auth) =>
    new MyOctokit({
        userAgent: 'Agile Research',
        auth: auth,
        throttle: {
            onRateLimit: (retryAfter, options, octo) => {
                octo.log.warn(
                    `Request quota exhausted for request ${options.method} ${options.url}`
                )

                if (options.request.retryCount === 0) {
                    octo.log.info(`Retrying after ${retryAfter} seconds!`)
                    return true
                }

                return false
            },
            onAbuseLimit: (retryAfter, options, octo) => {
                octo.log.warn(`Abuse detected for request ${options.method} ${options.url}`)
            }
        }
    })

const PER_PAGE = 50

// ------------------- helper methods ------------------- //

async function get_comments_for_issue(auth, owner, project, issue_number) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: owner,
        repo: project,
        issue_number,
        per_page: PER_PAGE
    })
}

async function get_labels_for_issue(auth, owner, project, issue_number) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: owner,
        repo: project,
        issue_number,
        per_page: PER_PAGE
    })
}

async function get_pull_requests(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/pulls', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

async function get_issues(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

async function get_teams_for_organization(auth, org) {
    return octokit(auth).paginate('GET /orgs/{org}/teams', {
        org: org,
        per_page: PER_PAGE
    })
}

async function get_team_members(auth, org, team_slug) {
    return octokit(auth).paginate('GET /orgs/{org}/teams/{team_slug}/members', {
        org: org,
        per_page: PER_PAGE,
        team_slug: team_slug
    })
}

async function get_collaborators_for_repository(auth, owner, repo) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/collaborators', {
        owner: owner,
        repo: repo
    })
}

function pull_requests_filtered_by_team(pull_requests, team) {
    const team_ids = team.members.map((member) => member.id)
    return pull_requests.filter((pull_request) => team_ids.includes(pull_request.user.id))
}

function construct_pull_request_buckets(pull_requests) {
    const bucket_count = {}
    buckets.forEach((bucket) => {
        bucket_count[bucket] = 0
    })

    pull_requests.forEach((pull_request) => {
        bucket_count[pull_request_closing_time_bucket(pull_request)] += 1
    })

    return Object.keys(bucket_count).map((bucket) => ({
        label: bucket,
        value: bucket_count[bucket]
    }))
}

async function issues_filtered_by_team(config, issues, team) {
    const team_ids = team.members.map((member) => member.id)
    return Promise.all(
        issues.map(async (issue) => {
            // who's team label is on th issue?
            if (issue.labels.length > 0) {
                const label_names = await get_labels_for_issue(
                    config.github_access_token,
                    config.organization,
                    config.repository,
                    issue.number
                ).then((result) => result.map((entry) => entry.name))
                if (label_names.includes(team.label)) return true
            }

            // who closed the issue?
            if (Object.keys(issue).includes('closed_by')) {
                return team_ids.includes(issue.closed_by.id)
            }

            // who was assigned to the issue?
            if (issue.assignees.length > 0) {
                for (let i = 0; i < issue.assignees.length; i++) {
                    if (team_ids.includes(issue.assignees[i].id)) return true
                }
            }

            // who commented on the issue?
            if (issue.comments > 0) {
                const comments = await get_comments_for_issue(
                    config.github_access_token,
                    config.organization,
                    config.repository,
                    issue.number
                )
                const commentator_ids = comments.map((comment) => comment.user.id)

                for (let i = 0; i < commentator_ids.length; i++) {
                    if (team_ids.includes(commentator_ids[i])) return true
                }
            }

            // who opened the issue?
            return team_ids.includes(issue.user.id)
        })
    ).then((results) => issues.filter((_, index) => results[index]))
}

async function get_commits(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/commits', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

async function get_detailed_commit(auth, owner, project, ref) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner: owner,
        repo: project,
        ref: ref
    })
}

function find_commits_for_team(commits, team) {
    const team_ids = team.members.map((member) => member.id)
    return commits.filter((commit) => {
        if (commit.committer) {
            return team_ids.includes(commit.committer.id)
        }
        return false
    })
}

function construct_heatmap_objects_array(commits) {
    const timeSlots = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
    commits.forEach((commit) => {
        const commit_date = new Date(commit.commit.committer.date)
        const day = (commit_date.getDay() + 6) % 7
        const hour = commit_date.getHours()
        timeSlots[day][hour] += 1
    })

    const data = []
    for (let day = 0; day < 7; day += 1) {
        for (let hour = 0; hour < 24; hour++) {
            const myObj = {
                x: hour,
                y: day,
                v: timeSlots[day][hour]
            }
            data.push(myObj)
        }
    }
    return data
}

async function calculate_stats_for_commits(commit_in_sprints, config) {
    const newData = []
    const arrayOfCommitPromises = []
    for (const sprint of commit_in_sprints) {
        const index = 0
        let commit_sum = 0
        let changes_sum = 0
        const team_members = [] // how to get team members that have not contributed???
        for (const commit of sprint) {
            if (commit.committer) {
                arrayOfCommitPromises.push(
                    get_detailed_commit(
                        config.github_access_token,
                        config.organization,
                        config.repository,
                        commit.sha
                    )
                )
            }
        }
        await Promise.all(arrayOfCommitPromises).then((resolvedPromises) => {
            resolvedPromises.forEach((detailedCommit) => {
                commit_sum += 1
                changes_sum += detailedCommit[0].stats.total
                if (
                    team_members.findIndex(
                        (member) => member === detailedCommit[0].committer.id
                    ) === -1
                ) {
                    team_members.push(detailedCommit[0].committer.id)
                }
            })
        })
        newData.push([
            { label: 'Average Commits', value: commit_sum / team_members.length },
            {
                label: 'Average Changes',
                value: changes_sum / team_members.length / commit_sum
            }
        ])
    }
    return newData
}

// ------------------- public interface ------------------- //

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

export async function get_pull_request_closing_times(config) {
    let pull_requests = await get_pull_requests(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_filtered) {
        pull_requests = pull_requests_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }

    let data = []
    if (config.sprint_segmented) {
        // todo
    } else {
        data = pull_requests.map((pull_request) => ({
            label: pull_request.title,
            value: pull_request_closing_time(pull_request)
        }))
        sort_descending_by_value(data)
    }

    return data
}

export async function get_pull_request_closing_time_buckets(config) {
    let pull_requests = await get_pull_requests(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_filtered) {
        pull_requests = pull_requests_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }

    let data
    if (config.sprint_segmented) {
        const pull_request_groups = {}
        config.sprints.forEach((sprint, index) => {
            pull_request_groups[index] = []
        })
        pull_request_groups['not within sprint'] = []

        for (
            let pull_request_index = 0;
            pull_request_index < pull_requests.length;
            pull_request_index++
        ) {
            const pull_request = pull_requests[pull_request_index]
            let found = false

            for (let sprint_index = 0; sprint_index < config.sprints.length; sprint_index++) {
                const sprint = config.sprints[sprint_index]
                const closed_date = Date.parse(pull_request.closed_at)

                if (sprint.from <= closed_date && closed_date < sprint.to) {
                    pull_request_groups[sprint_index].push(pull_request)
                    found = true
                    break
                }
            }

            if (!found) {
                pull_request_groups['not within sprint'].push(pull_request)
            }
        }

        data = Object.keys(pull_request_groups).map((key) =>
            construct_pull_request_buckets(pull_request_groups[key])
        )
    } else {
        data = construct_pull_request_buckets(pull_requests)
        sort_descending_by_value(data)
    }

    return data
}

export async function get_issue_sizes(config) {
    let issues = await get_issues(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_filtered) {
        issues = await issues_filtered_by_team(config, issues, config.teams[config.team_index])
    }

    let data = []
    if (config.sprint_segmented) {
        // todo
    } else {
        data = issues.map((issue) => ({
            label: issue.title,
            value: issue_size(issue)
        }))
        sort_descending_by_value(data)
    }

    return data
}

export async function get_issue_buckets_fixed_interval(config) {
    const issues = await get_issue_sizes(config) // does the filtering too

    let data = []
    if (config.sprint_segmented) {
        // todo
    } else {
        const nr_of_buckets = 5
        const max = get_max(issues)
        const min = get_min(issues)

        const bucket_count = {}
        issues.forEach((issue) => {
            const bucket = issue_size_bucket(issue.value, min, max, nr_of_buckets)
            if (!Object.keys(bucket_count).includes(bucket)) {
                bucket_count[bucket] = 0
            }
            bucket_count[bucket] += 1
        })

        data = Object.keys(bucket_count).map((bucket) => ({
            label: bucket,
            value: bucket_count[bucket]
        }))

        sort_descending_by_value(data)
    }

    return data
}

export async function get_unregistered_collaborators(config) {
    const collaborators = await get_collaborators(config)

    let registered_collaborator_ids = []
    config.teams.forEach((team) => {
        registered_collaborator_ids = registered_collaborator_ids.concat(
            team.members.map((member) => member.id)
        )
    })

    return collaborators.filter(
        (collaborator) => !registered_collaborator_ids.includes(collaborator.id)
    )
}

export async function get_commit_times(config) {
    let commits = await get_commits(
        config.github_access_token,
        config.organization,
        config.repository
    )

    if (config.team_filtered) {
        commits = find_commits_for_team(commits, config.teams[config.team_index])
    }

    if (config.sprint_segmented) {
        const commit_groups = {}
        config.sprints.forEach((sprint, index) => {
            commit_groups[index] = []
        })
        commit_groups['not within sprint'] = []

        for (let commit_index = 0; commit_index < commits.length; commit_index++) {
            const commit = commits[commit_index]
            let found = false

            for (let sprint_index = 0; sprint_index < config.sprints.length; sprint_index++) {
                const sprint = config.sprints[sprint_index]
                const closed_date = Date.parse(commit.commit.author.date)

                if (sprint.from <= closed_date && closed_date < sprint.to) {
                    commit_groups[sprint_index].push(commit)
                    found = true
                    break
                }
            }

            if (!found) {
                commit_groups['not within sprint'].push(commit)
            }
        }

        return Object.keys(commit_groups).map((sprint) => ({
            label: `Sprint ${sprint}`,
            value: construct_heatmap_objects_array(commit_groups[sprint])
        }))
    }

    return [{ label: 'Sprint 0', value: construct_heatmap_objects_array(commits) }]
}

export async function get_commit_amounts(config) {
    let data = []
    let commits = await get_commits(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_filtered) {
        commits = find_commits_for_team(commits, config.teams[config.team_index])
    }

    if (config.sprint_segmented) {
        const commit_groups = {}
        config.sprints.forEach((sprint, index) => {
            commit_groups[index] = []
        })
        commit_groups['not within sprint'] = []

        for (let commit_index = 0; commit_index < commits.length; commit_index++) {
            const commit = commits[commit_index]
            let found = false

            for (let sprint_index = 0; sprint_index < config.sprints.length; sprint_index++) {
                const sprint = config.sprints[sprint_index]
                const closed_date = Date.parse(commit.commit.author.date)

                if (sprint.from <= closed_date && closed_date < sprint.to) {
                    commit_groups[sprint_index].push(commit)
                    found = true
                    break
                }
            }

            if (!found) {
                commit_groups['not within sprint'].push(commit)
            }
        }

        data = Object.keys(commit_groups).map((sprint) => commit_groups[sprint])
    } else {
        data.push(commits)
    }
    const graphData = await calculate_stats_for_commits(data, config)
    return graphData
}
