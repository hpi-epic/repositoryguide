// ------------------- Octokit ------------------- //

import { Octokit } from 'https://cdn.skypack.dev/octokit'
import { paginateRest } from 'https://cdn.skypack.dev/@octokit/plugin-paginate-rest'
import { throttling } from 'https://cdn.skypack.dev/@octokit/plugin-throttling'
import { graphql } from 'https://cdn.skypack.dev/@octokit/graphql'

// ------------------- Metrices ------------------- //
import {
    buckets,
    closed_pull_request_open_duration_in_hours,
    issue_size,
    issue_size_bucket,
    pull_request_open_duration_bucket,
    calculate_first_review_for_pull_request
} from './metrics.js'

// ------------------- helper functions ------------------- //
import { deepClone, get_max, get_min, sort_descending_by_value } from './utils.js'

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

const graphql_with_auth = (auth) =>
    graphql.defaults({
        headers: {
            authorization: `token ${auth}`
        }
    })

const PER_PAGE = 50
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

async function get_anonymous_contributors_for_repository(auth, owner, repo) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/contributors?anon=1', {
        owner: owner,
        repo: repo
    })
}

function pull_requests_filtered_by_team(pull_requests, team) {
    const team_ids = team.members.map((member) => member.id)
    return pull_requests.filter((pull_request) => team_ids.includes(pull_request.user.id))
}

function pull_requests_with_review_and_comments_filtered_by_team(pull_requests, team) {
    const team_ids = team.members.map((member) => member.name)
    return pull_requests.filter((pull_request) => team_ids.includes(pull_request.node.author.login))
}

function construct_pull_request_buckets(pull_requests) {
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

function construct_pull_request_review_buckets(
    pull_requests,
    maximum_amout_of_pull_requests_per_sprint
) {
    const data = []
    for (let i = 1; i <= maximum_amout_of_pull_requests_per_sprint; i++) {
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

async function select_issues_for_team(issues, team, config) {
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

async function select_issues_for_team_by_author(issues, team, config) {
    const team_users = team.members.map((member) => member.name)
    const filtered_issues = []
    issues.forEach((issue) => {
        if (team_users.includes(issue.node.author.login)) {
            filtered_issues.push(issue)
        }
    })
    return filtered_issues
}

async function get_commits(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/commits', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

function select_graph_commits_for_team(commits, team) {
    const team_ids = team.members.map((member) => member.id)
    return commits.filter((commit) => {
        if (commit.node.author.user) {
            return team_ids.includes(commit.node.author.user.databaseId)
        }
        return false
    })
}

function select_commits_for_team(commits, team) {
    const team_ids = team.members.map((member) => member.id)
    return commits.filter((commit) => {
        if (commit.committer) {
            return team_ids.includes(commit.committer.id)
        }
        return false
    })
}

const time_slots_blueprint = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

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

function construct_heatmap_of_commit_times(commits) {
    const time_slots = deepClone(time_slots_blueprint)

    commits.forEach((commit) => {
        const commit_date = new Date(commit.commit.committer.date)
        const day = (commit_date.getDay() + 6) % 7
        const hour = commit_date.getHours()
        time_slots[day][hour] += 1
    })

    return map_timeslots_to_data(time_slots)
}

function construct_heatmap_of_issue_submit_times(issues) {
    const time_slots = deepClone(time_slots_blueprint)

    issues.forEach((issue) => {
        const submit_date = new Date(issue.created_at)
        const day = (submit_date.getDay() + 6) % 7
        const hour = submit_date.getHours()
        time_slots[day][hour] += 1
    })

    return map_timeslots_to_data(time_slots)
}

async function calculate_stats_for_commits(commits_separated_in_sprints, config) {
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

function select_top_issue_submitters(issues_of_sprint, config) {
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

function count_interactions_for_pull_requests(pull_requests, config) {
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

async function get_detailed_commits(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_commit_cursor = null

    while (has_next_page) {
        const response = await graphql_with_auth(auth)(
            `
            query detailedCommits($owner: String!, $project: String!, $last_commit_cursor: String)
                {
                    repository(owner: $owner, name: $project) {
                        defaultBranchRef {
                            name
                            target {
                                ... on Commit {
                                    history(first: 100, after: $last_commit_cursor) {
                                        edges {
                                            cursor
                                            node {
                                                id
                                                author {
                                                    user {
                                                        databaseId
                                                    }
                                                    email
                                                    name
                                                }
                                                committedDate
                                                additions
                                                deletions
                                            }
                                        }

                                        pageInfo {
                                            hasNextPage
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `,
            {
                owner: owner,
                project: project,
                last_commit_cursor: last_commit_cursor
            }
        )

        data.push(...response.repository.defaultBranchRef.target.history.edges)
        has_next_page = response.repository.defaultBranchRef.target.history.pageInfo.hasNextPage
        const last_element = data[data.length - 1]
        last_commit_cursor = `${last_element.cursor}`
    }

    return data
}

async function get_issue_submitters(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_commit_cursor = null

    while (has_next_page) {
        const response = await graphql_with_auth(auth)(
            `
            query detailedCommits(
              $owner: String!
              $project: String!
              $last_commit_cursor: String
            ) {
              repository(owner: $owner, name: $project) {
                issues(first: 100, after: $last_commit_cursor) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      title
                      number
                      createdAt
                      url
                      author {
                        login
                        url
                      }
                    }
                  }
                }
              }
            }
            `,
            {
                owner: owner,
                project: project,
                last_commit_cursor: last_commit_cursor
            }
        )
        data.push(...response.repository.issues.edges)
        has_next_page = response.repository.issues.pageInfo.hasNextPage
        const last_element = data[data.length - 1]
        last_commit_cursor = `${last_element.cursor}`
    }

    return data
}

async function get_pull_requests_with_review_and_comments(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_commit_cursor = null

    while (has_next_page) {
        const graphql_with_auth = graphql.defaults({
            headers: {
                authorization: `token ${auth}`
            }
        })

        const response = await graphql_with_auth(
            `query detailedPullRequests(
                  $owner: String!
                  $project: String!
                  $last_commit_cursor: String
            ) {
            repository(owner: $owner, name: $project) {
                pullRequests(first: 100, after: $last_commit_cursor) {
                    pageInfo {
                        hasNextPage
                    }
                    edges {
                        cursor
                        node {
                            url
                            title
                            body
                            author {
                                login
                            }
                            state
                            createdAt
                            closedAt
                            comments(first: 10) {
                                nodes {
                                    body
                                    createdAt
                                    author {
                                        login
                                    }
                                }
                            }

                            reviews(first: 1) {
                                nodes {
                                    state
                                    createdAt
                                    comments(first: 1) {
                                        nodes {
                                            body
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`,
            {
                owner: owner,
                project: project,
                last_commit_cursor: last_commit_cursor
            }
        )

        data.push(...response.repository.pullRequests.edges)
        has_next_page = response.repository.pullRequests.pageInfo.hasNextPage
        const last_element = data[data.length - 1]
        last_commit_cursor = `${last_element.cursor}`
    }

    return data
}

function filter_closed_and_unreviewed(pull_requests) {
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

async function get_pull_request_interactions(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_pull_request_cursor = null

    while (has_next_page) {
        const response = await graphql_with_auth(auth)(
            `
            query interactionsPullRequests(
              $owner: String!
              $project: String!
              $last_pull_request_cursor: String
            ) {
              repository(owner: $owner, name: $project) {
                pullRequests(first: 100, after: $last_pull_request_cursor) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      url
                      title
                      number
                      author {
                        login
                      }
                      reactions(first: 10) {
                        nodes {
                          id
                        }
                      }
                      timelineItems(first: 100) {
                        nodes {
                          __typename
                        }
                      }
                      comments(first: 30) {
                        nodes {
                          body
                          createdAt
                          author {
                            login
                          }
                        }
                      }
                      reviews(first: 65) {
                        nodes {
                          state
                          createdAt
                          body
                          comments(first: 65) {
                            nodes {
                              body
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            `,
            {
                owner: owner,
                project: project,
                last_pull_request_cursor: last_pull_request_cursor
            }
        )
        data.push(...response.repository.pullRequests.edges)
        has_next_page = response.repository.pullRequests.pageInfo.hasNextPage
        const last_element = data[data.length - 1]
        last_pull_request_cursor = `${last_element.cursor}`
    }
    return data
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

export async function get_pull_request_open_durations(config, sprint_segmented) {
    let pull_requests = await get_pull_requests(
        config.github_access_token,
        config.organization,
        config.repository
    )
    if (config.team_index) {
        pull_requests = pull_requests_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }

    let data = []
    if (sprint_segmented) {
        // todo
    } else {
        data = pull_requests.map((pull_request) => ({
            label: pull_request.title,
            value: closed_pull_request_open_duration_in_hours(pull_request),
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
        pull_requests = pull_requests_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
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

export async function get_pull_request_review_times(config, sprint_segmented) {
    let pull_requests = await get_pull_requests_with_review_and_comments(
        config.github_access_token,
        config.organization,
        config.repository
    )
    pull_requests = filter_closed_and_unreviewed(pull_requests)
    if (config.team_index) {
        pull_requests = pull_requests_with_review_and_comments_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
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
        const maximum_amout_of_pull_requests_per_sprint = Object.values(pull_request_groups).reduce(
            (a, b) => (a.length < b.length ? b : a)
        ).length

        data = Object.keys(pull_request_groups).map((key) =>
            construct_pull_request_review_buckets(
                pull_request_groups[key],
                maximum_amout_of_pull_requests_per_sprint
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
            value: issue_size(issue),
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

export async function get_anonymous_contributors(config) {
    if (!config.organization || !config.repository) {
        return []
    }

    const anonymous_contributors = await get_anonymous_contributors_for_repository(
        config.github_access_token,
        config.organization,
        config.repository
    ).then((result) =>
        result.filter((contributor) => {
            if (contributor.type == 'Anonymous') {
                return true
            }
            return false
        })
    )

    debugger
    return anonymous_contributors
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
        pull_requests = pull_requests_with_review_and_comments_filtered_by_team(
            pull_requests,
            config.teams[config.team_index]
        )
    }
    if (sprint_segmented) {
        // todo
    }

    return count_interactions_for_pull_requests(pull_requests, config)
}
