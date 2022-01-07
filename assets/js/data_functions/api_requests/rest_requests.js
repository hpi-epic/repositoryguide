import { Octokit } from 'https://cdn.skypack.dev/octokit'
import { paginateRest } from 'https://cdn.skypack.dev/@octokit/plugin-paginate-rest'
import { throttling } from 'https://cdn.skypack.dev/@octokit/plugin-throttling'

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

export async function get_teams_for_organization(auth, org) {
    return octokit(auth).paginate('GET /orgs/{org}/teams', {
        org: org,
        per_page: PER_PAGE
    })
}

export async function get_team_members(auth, org, team_slug) {
    return octokit(auth).paginate('GET /orgs/{org}/teams/{team_slug}/members', {
        org: org,
        per_page: PER_PAGE,
        team_slug: team_slug
    })
}

export async function get_collaborators_for_repository(auth, owner, repo) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/collaborators', {
        owner: owner,
        repo: repo
    })
}

export async function get_pull_requests(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/pulls', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

export async function get_issues(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

export async function get_anonymous_contributors_for_repository(auth, owner, repo) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/contributors?anon=1', {
        owner: owner,
        repo: repo
    })
}

export async function get_commits(auth, owner, project) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/commits', {
        owner: owner,
        repo: project,
        state: 'all',
        per_page: PER_PAGE
    })
}

export async function get_labels_for_issue(auth, owner, project, issue_number) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        owner: owner,
        repo: project,
        issue_number,
        per_page: PER_PAGE
    })
}

export async function get_comments_for_issue(auth, owner, project, issue_number) {
    return octokit(auth).paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: owner,
        repo: project,
        issue_number,
        per_page: PER_PAGE
    })
}
