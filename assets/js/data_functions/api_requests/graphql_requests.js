import { graphql } from 'https://cdn.skypack.dev/@octokit/graphql'

const graphql_with_auth = (auth) =>
    graphql.defaults({
        headers: {
            authorization: `token ${auth}`
        }
    })

export async function get_pull_requests_with_review_and_comments(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_commit_cursor = null

    while (has_next_page) {
        const response = await graphql_with_auth(auth)(
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

export async function get_pull_requests_reviews(auth, owner, project) {
    let has_next_page = true
    const data = []
    let last_commit_cursor = null

    while (has_next_page) {
        const response = await graphql_with_auth(auth)(
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

export async function get_detailed_commits(auth, owner, project) {
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

export async function get_issue_submitters(auth, owner, project) {
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

export async function get_pull_request_interactions(auth, owner, project) {
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
