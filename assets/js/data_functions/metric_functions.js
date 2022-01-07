import { get_max, get_min, sort_descending_by_value } from '../utils.js'
import {
    filter_pull_requests_by_team,
    construct_pull_request_buckets,
    filter_closed_and_unreviewed_pull_requests,
    filter_pull_request_nodes_by_team,
    sort_pull_requests_into_sprint_groups,
    construct_pull_request_review_buckets,
    select_issues_for_team,
    select_commits_for_team,
    construct_heatmap_of_commit_times,
    select_graph_commits_for_team,
    calculate_stats_for_commits,
    construct_heatmap_of_issue_submit_times,
    select_issues_for_team_by_author,
    select_top_issue_submitters,
    count_interactions_for_pull_requests,
    calculate_open_duration_in_hours_of_closed_pull_requests,
    calculate_issue_size,
    issue_size_bucket
} from './data_manipulation.js'
import { get_pull_requests, get_issues, get_commits } from './api_requests/rest_requests.js'
import {
    get_pull_requests_with_review_and_comments,
    get_pull_requests_reviews,
    get_detailed_commits,
    get_issue_submitters,
    get_pull_request_interactions
} from './api_requests/graphql_requests.js'

export async function get_pull_request_open_durations(config, sprint_segmented) {
    let pull_requests = await get_pull_requests(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_index) {
        pull_requests = filter_pull_requests_by_team(pull_requests, config.teams[config.team_index])
    }

    let data = []
    if (sprint_segmented) {
        // todo
    } else {
        data = pull_requests.map((pull_request) => ({
            label: pull_request.title,
            value: calculate_open_duration_in_hours_of_closed_pull_requests(pull_request),
            url: pull_request.html_url
        }))
        data = data.filter((pullRequest) => pullRequest.value !== null)
        sort_descending_by_value(data)
    }

    return data
}

export async function get_pull_request_open_duration_buckets(config, sprint_segmented) {
    let pull_requests = await get_pull_requests(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_index) {
        pull_requests = filter_pull_requests_by_team(pull_requests, config.teams[config.team_index])
    }

    let data
    if (sprint_segmented) {
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
    }

    return data
}

export async function get_pull_request_review_and_comment_times(config, sprint_segmented) {
    let pull_requests = await get_pull_requests_with_review_and_comments(
        config.github_access_token,
        config.organization,
        config.repository
    )
    pull_requests = filter_closed_and_unreviewed_pull_requests(pull_requests)
    if (config.team_index) {
        pull_requests = filter_pull_request_nodes_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }

    let data
    if (sprint_segmented) {
        const pull_request_groups = sort_pull_requests_into_sprint_groups(
            pull_requests,
            config.sprints
        )
        const maximum_amount_of_pull_requests_per_sprint = Object.values(
            pull_request_groups
        ).reduce((a, b) => (a.length < b.length ? b : a)).length

        data = Object.keys(pull_request_groups).map((key) =>
            construct_pull_request_review_buckets(
                pull_request_groups[key],
                maximum_amount_of_pull_requests_per_sprint
            )
        )
    } else {
        data = construct_pull_request_review_buckets(pull_requests)
        sort_descending_by_value(data)
    }

    return data
}

export async function get_pull_request_review_times(config, sprint_segmented) {
    let pull_requests = await get_pull_requests_reviews(
        config.github_access_token,
        config.organization,
        config.repository
    )
    pull_requests = filter_closed_and_unreviewed_pull_requests(pull_requests)
    if (config.team_index) {
        pull_requests = filter_pull_request_nodes_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }

    let data
    if (sprint_segmented) {
        const pull_request_groups = sort_pull_requests_into_sprint_groups(
            pull_requests,
            config.sprints
        )
        const maximum_amount_of_pull_requests_per_sprint = Object.values(
            pull_request_groups
        ).reduce((a, b) => (a.length < b.length ? b : a)).length

        data = Object.keys(pull_request_groups).map((key) =>
            construct_pull_request_review_buckets(
                pull_request_groups[key],
                maximum_amount_of_pull_requests_per_sprint
            )
        )
    } else {
        data = construct_pull_request_review_buckets(pull_requests)
        sort_descending_by_value(data)
    }

    return data
}

export async function get_issue_sizes(config, sprint_segmented) {
    let issues = await get_issues(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_index) {
        issues = await select_issues_for_team(issues, config.teams[config.team_index], config)
    }

    let data = []
    if (sprint_segmented) {
        // todo
    } else {
        data = issues.map((issue) => ({
            label: issue.title,
            value: calculate_issue_size(issue),
            url: issue.html_url
        }))
        sort_descending_by_value(data)
    }

    return data
}

export async function get_issue_buckets_fixed_interval(config, sprint_segmented) {
    // does the filtering too
    const issues = await get_issue_sizes(config, sprint_segmented)
    let data = []
    if (sprint_segmented) {
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

export async function get_commit_times(config, sprint_segmented) {
    let commits = await get_commits(
        config.github_access_token,
        config.organization,
        config.repository
    )

    if (config.team_index) {
        commits = select_commits_for_team(commits, config.teams[config.team_index])
    }

    if (sprint_segmented) {
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
            value: construct_heatmap_of_commit_times(commit_groups[sprint])
        }))
    }

    return [{ label: 'Sprint 0', value: construct_heatmap_of_commit_times(commits) }]
}

export async function get_commit_amounts(config, sprint_segmented) {
    let commits = await get_detailed_commits(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_index) {
        commits = select_graph_commits_for_team(commits, config.teams[config.team_index])
    }

    if (sprint_segmented) {
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
                const commited_date = Date.parse(commit.node.committedDate)
                const sprint_start = Date.parse(sprint.from)
                const sprint_end = Date.parse(sprint.to)

                if (sprint_start <= commited_date && commited_date < sprint_end) {
                    commit_groups[sprint_index].push(commit)
                    found = true
                    break
                }
            }

            if (!found) {
                commit_groups['not within sprint'].push(commit)
            }
        }

        const data = Object.keys(commit_groups).map((sprint) => commit_groups[sprint])
        return calculate_stats_for_commits(data, config)
    }

    return calculate_stats_for_commits([commits], config)
}

export async function get_issue_submit_times(config, sprint_segmented) {
    let issues = await get_issues(
        config.github_access_token,
        config.organization,
        config.repository
    )

    if (config.team_index) {
        issues = await select_issues_for_team(issues, config.teams[config.team_index], config)
    }

    if (sprint_segmented) {
        const issue_groups = {}
        config.sprints.forEach((sprint, index) => {
            issue_groups[index] = []
        })
        issue_groups['not within sprint'] = []

        for (let issue_index = 0; issue_index < issues.length; issue_index++) {
            const issue = issues[issue_index]
            let found = false

            for (let sprint_index = 0; sprint_index < config.sprints.length; sprint_index++) {
                const sprint = config.sprints[sprint_index]
                const submit_date = Date.parse(issue.created_at)

                if (sprint.from <= submit_date && submit_date < sprint.to) {
                    issue_groups[sprint_index].push(issue)
                    found = true
                    break
                }
            }

            if (!found) {
                issue_groups['not within sprint'].push(issue)
            }
        }

        return Object.keys(issue_groups).map((sprint) => ({
            label: `Sprint ${sprint}`,
            value: construct_heatmap_of_issue_submit_times(issue_groups[sprint])
        }))
    }

    return [{ label: 'Sprint 0', value: construct_heatmap_of_issue_submit_times(issues) }]
}

export async function get_top_issue_submitters(config, sprint_segmented) {
    let issues = await get_issue_submitters(
        config.github_access_token,
        config.organization,
        config.repository
    )

    if (config.team_index) {
        issues = await select_issues_for_team_by_author(
            issues,
            config.teams[config.team_index],
            config
        )
    }

    if (sprint_segmented) {
        const issue_groups = {}
        config.sprints.forEach((sprint, index) => {
            issue_groups[index] = []
        })
        issue_groups['not within sprint'] = []

        for (let issue_index = 0; issue_index < issues.length; issue_index++) {
            const issue = issues[issue_index]
            let found = false

            for (let sprint_index = 0; sprint_index < config.sprints.length; sprint_index++) {
                const sprint = config.sprints[sprint_index]
                const submit_date = Date.parse(issue.node.createdAt)

                if (sprint.from <= submit_date && submit_date < sprint.to) {
                    issue_groups[sprint_index].push(issue)
                    found = true
                    break
                }
            }

            if (!found) {
                issue_groups['not within sprint'].push(issue)
            }
        }

        return Object.keys(issue_groups).map((sprint) => ({
            label: `Sprint ${sprint}`,
            value: select_top_issue_submitters(issue_groups[sprint])
        }))
    }

    return [{ label: 'Sprint 0', value: select_top_issue_submitters(issues) }]
}

export async function get_total_pull_request_interactions(config, sprint_segmented) {
    let pull_requests = await get_pull_request_interactions(
        config.github_access_token,
        config.organization,
        config.repository
    )

    if (config.team_index) {
        pull_requests = filter_pull_request_nodes_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }
    if (sprint_segmented) {
        // todo
    }

    return count_interactions_for_pull_requests(pull_requests, config)
}
