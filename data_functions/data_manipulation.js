import {
    buckets,
    calculate_first_review_for_pull_request,
    pull_request_open_duration_bucket
} from '../metrics.js'
import { deepClone, sort_descending_by_value } from '../utils.js'
import { get_labels_for_issue, get_comments_for_issue } from './api_requests/rest_requests.js'

const time_slots_blueprint = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

const team_based_timeline_event_types = [
    'AssignedEvent',
    'CrossReferencedEvent',
    'LabeledEvent',
    'MergedEvent',
    'MovedColumnsInProjectEvent',
    'MovedColumnsInProjectEvent',
    'ReferencedEvent',
    'RenamedTitleEvent',
    'ReviewRequestedEvent',
    'ReviewRequestRemovedEvent',
    'UnlabeledEvent',
    'UnassignedEvent',
    'AddedToProjectEvent',
    'RemovedFromProjectEvent'
]

export function pull_requests_filtered_by_team(pull_requests, team) {
    const team_ids = team.members.map((member) => member.id)
    return pull_requests.filter((pull_request) => team_ids.includes(pull_request.user.id))
}

export function pull_request_nodes_filtered_by_team(pull_requests, team) {
    const team_ids = team.members.map((member) => member.name)
    return pull_requests.filter((pull_request) => team_ids.includes(pull_request.node.author.login))
}

export function construct_pull_request_buckets(pull_requests) {
    const bucket_count = {}
    buckets.forEach((bucket) => {
        bucket_count[bucket] = 0
    })

    pull_requests.forEach((pull_request) => {
        bucket_count[pull_request_open_duration_bucket(pull_request)] += 1
    })

    return Object.keys(bucket_count).map((bucket) => ({
        label: bucket,
        value: bucket_count[bucket]
    }))
}

export function filter_closed_and_unreviewed(pull_requests) {
    const filtered_pull_requests = pull_requests.filter((pull_request) => {
        let commented_by_other_users = false
        let reviewed_by_other_users = false
        if (pull_request.node.comments) {
            pull_request.node.comments.nodes.every((comment) => {
                if (comment.author.login !== pull_request.node.author.login) {
                    commented_by_other_users = true
                    return false
                }
                return true
            })
        }

        if (pull_request.node.reviews.nodes.length !== 0) {
            reviewed_by_other_users = true
        }
        if (commented_by_other_users || reviewed_by_other_users) {
            return true
        }
        return false
    })
    return filtered_pull_requests
}

export function sort_pull_requests_into_sprint_groups(pull_requests, sprints) {
    const pull_request_groups = {}

    sprints.forEach((sprint, index) => {
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

        for (let sprint_index = 0; sprint_index < sprints.length; sprint_index++) {
            const sprint = sprints[sprint_index]
            const open_date = Date.parse(pull_request.node.createdAt)

            if (sprint.from <= open_date && open_date < sprint.to) {
                pull_request_groups[sprint_index].push(pull_request)
                found = true
                break
            }
        }

        if (!found) {
            pull_request_groups['not within sprint'].push(pull_request)
        }
    }
    return pull_request_groups
}

export function construct_pull_request_review_buckets(
    pull_requests,
    maximum_amount_of_pull_requests_per_sprint
) {
    const data = []
    for (let i = 1; i <= maximum_amount_of_pull_requests_per_sprint; i++) {
        const data_object = {
            label: `PR ${i}`,
            value: pull_requests[i - 1]
                ? calculate_first_review_for_pull_request(pull_requests[i - 1])
                : 0,
            url: pull_requests[i - 1] ? pull_requests[i - 1].node.url : '',
            title: pull_requests[i - 1] ? pull_requests[i - 1].node.title : '',
            body: pull_requests[i - 1] ? pull_requests[i - 1].node.body : ''
        }
        data.push(data_object)
    }

    return data
}

export async function select_issues_for_team(issues, team, config) {
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

export function select_commits_for_team(commits, team) {
    const team_ids = team.members.map((member) => member.id)
    return commits.filter((commit) => {
        if (commit.committer) {
            return team_ids.includes(commit.committer.id)
        }
        return false
    })
}

function map_timeslots_to_data(time_slots) {
    const data = []
    for (let day = 0; day < 7; day += 1) {
        for (let hour = 0; hour < 24; hour++) {
            const myObj = {
                x: hour,
                y: day,
                v: time_slots[day][hour]
            }
            data.push(myObj)
        }
    }
    return data
}

export function construct_heatmap_of_commit_times(commits) {
    const time_slots = deepClone(time_slots_blueprint)

    commits.forEach((commit) => {
        const commit_date = new Date(commit.commit.committer.date)
        const day = (commit_date.getDay() + 6) % 7
        const hour = commit_date.getHours()
        time_slots[day][hour] += 1
    })

    return map_timeslots_to_data(time_slots)
}

export function select_graph_commits_for_team(commits, team) {
    const team_ids = team.members.map((member) => member.id)
    return commits.filter((commit) => {
        if (commit.node.author.user) {
            return team_ids.includes(commit.node.author.user.databaseId)
        }
        return false
    })
}

export async function calculate_stats_for_commits(commits_separated_in_sprints, config) {
    const newData = []
    for (const commits_in_single_sprint of commits_separated_in_sprints) {
        let commit_sum = 0
        let changes_sum = 0
        const team_members = [] // how to get team members that have not contributed???
        commits_in_single_sprint.forEach((commit) => {
            if (commit.node.author.user) {
                commit_sum += 1
                changes_sum += commit.node.additions + commit.node.deletions
                if (
                    team_members.findIndex(
                        (member) => member === commit.node.author.user.databaseId
                    ) === -1
                ) {
                    team_members.push(commit.node.author.user.databaseId)
                }
            }
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

export function construct_heatmap_of_issue_submit_times(issues) {
    const time_slots = deepClone(time_slots_blueprint)

    issues.forEach((issue) => {
        const submit_date = new Date(issue.created_at)
        const day = (submit_date.getDay() + 6) % 7
        const hour = submit_date.getHours()
        time_slots[day][hour] += 1
    })

    return map_timeslots_to_data(time_slots)
}

export async function select_issues_for_team_by_author(issues, team, config) {
    const team_users = team.members.map((member) => member.name)
    const filtered_issues = []
    issues.forEach((issue) => {
        if (team_users.includes(issue.node.author.login)) {
            filtered_issues.push(issue)
        }
    })
    return filtered_issues
}

export function select_top_issue_submitters(issues_of_sprint, config) {
    const submitters = []

    issues_of_sprint.forEach((issue) => {
        const issue_author = issue.node.author.login
        const index = submitters.findIndex((author) => author.name === issue_author)
        const issue_number = issue.node.number

        if (index === -1) {
            submitters.push({
                name: issue_author,
                issue_numbers: [issue_number],
                value: 1,
                url: issue.node.author.url
            })
        } else {
            submitters[index].issue_numbers.push(issue_number)
            submitters[index].value += 1
        }
    })
    submitters.sort((a, b) => b.value - a.value)
    return submitters
}

export function count_interactions_for_pull_requests(pull_requests, config) {
    const newData = []
    pull_requests.forEach((pull_request) => {
        let interactions_count = 0
        interactions_count += pull_request.node.comments.nodes.length
        interactions_count += pull_request.node.reactions.nodes.length
        interactions_count += pull_request.node.reviews.nodes.length

        let review_comments_count = 0
        if (pull_request.node.reviews.nodes.length !== 0) {
            pull_request.node.reviews.nodes.forEach((review) => {
                review_comments_count += review.comments.nodes.length
            })
        }

        interactions_count += review_comments_count
        const team_based_events_count = count_team_based_timeline_events(
            pull_request.node.timelineItems.nodes
        )
        interactions_count += team_based_events_count

        newData.push({
            label: `#${pull_request.node.number} ${pull_request.node.title}`,
            value: interactions_count,
            url: pull_request.node.url
        })
    })
    return sort_descending_by_value(newData)
}

function count_team_based_timeline_events(timeline_items) {
    let count = 0
    timeline_items.forEach((item) => {
        if (team_based_timeline_event_types.includes(item.__typename)) {
            count += 1
        }
    })
    return count
}
