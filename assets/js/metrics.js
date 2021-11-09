import Heatmap from './visualizations/heatmap.js'
import StackedBarChart from './visualizations/stacked_bar_chart.js'
import BarChart from './visualizations/bar_chart.js'
import MultipleLineChart from './visualizations/multiple_line_chart.js'
import Multiple_horizontal_bar_chart from './visualizations/multiple_horizontal_bar_chart.js'
import HorizontalStackedBarChart from './visualizations/horizontal_stacked_bar_chart.js'
import LineBarChart from './visualizations/line_bar_chart.js'

import {
    get_commit_amounts,
    get_commit_times,
    get_issue_buckets_fixed_interval,
    get_issue_sizes,
    get_issue_submit_times,
    get_pull_request_open_duration_buckets,
    get_pull_request_review_and_comment_times,
    get_top_issue_submitters,
    get_pull_request_review_times,
    get_total_pull_request_interactions
} from './data_functions.js'

export const metrics = {
    'Pull request open duration': {
        chart_class: BarChart,
        data_retrieval_function: get_pull_request_open_durations,
        sprint_segmented: false
    },
    'Pull request open durations in buckets overall': {
        chart_class: BarChart,
        data_retrieval_function: get_pull_request_open_duration_buckets,
        sprint_segmented: false
    },
    'Pull request open durations in buckets per sprint': {
        chart_class: StackedBarChart,
        data_retrieval_function: get_pull_request_open_duration_buckets,
        sprint_segmented: true
    },
    'Pull request time to first interaction of other team members in hours': {
        chart_class: HorizontalStackedBarChart,
        data_retrieval_function: get_pull_request_review_and_comment_times,
        sprint_segmented: true
    },
    'Pull request time to first review in hours': {
        chart_class: HorizontalStackedBarChart,
        data_retrieval_function: get_pull_request_review_times,
        sprint_segmented: true
    },
    'Issue sizes': {
        chart_class: BarChart,
        data_retrieval_function: get_issue_sizes,
        sprint_segmented: false
    },
    'Issue sizes in buckets': {
        chart_class: BarChart,
        data_retrieval_function: get_issue_buckets_fixed_interval,
        sprint_segmented: false
    },
    'Issue submit times': {
        chart_class: Heatmap,
        data_retrieval_function: get_issue_submit_times,
        sprint_segmented: false
    },
    'Commit times': {
        chart_class: Heatmap,
        data_retrieval_function: get_commit_times,
        sprint_segmented: false
    },
    'Commit amounts per sprint': {
        chart_class: LineBarChart,
        data_retrieval_function: get_commit_amounts,
        sprint_segmented: true
    },
    'Top issue submitters': {
        chart_class: Multiple_horizontal_bar_chart,
        data_retrieval_function: get_top_issue_submitters,
        sprint_segmented: true
    },
    'Pull request total interactions': {
        chart_class: BarChart,
        data_retrieval_function: get_total_pull_request_interactions,
        sprint_segmented: false
    }
}

// TODO: improve
// 32: prefer smaller and indendent issues
export function issue_size(issue) {
    /*
     * estimate?
     * nr of checkboxes?
     * body size?
     * */
    return issue.body.length
}

// 32: prefer smaller and indendent issues
export function issue_size_bucket(size, min, max, nr_of_buckets) {
    const bucket_size = (max - min) / nr_of_buckets
    const factor = Math.floor(size / bucket_size)

    return (
        `[` +
        `${Math.floor(min + bucket_size * factor)}, ` +
        `${Math.floor(min + bucket_size * (factor + 1))}` +
        `]`
    )
}

// 31: Früh mergen
export function pull_request_open_duration(pull_request) {
    const creation_date = Date.parse(pull_request.created_at)
    const closing_date = Date.parse(pull_request.closed_at)
    return closing_date - creation_date
}

export function closed_pull_request_open_duration_in_hours(pull_request) {
    const creation_date = Date.parse(pull_request.created_at)
    const closing_date = Date.parse(pull_request.closed_at)
    let diffHours
    if (isNaN(closing_date)) {
        diffHours = null
        return diffHours
    }
    const date = new Date(0)
    date.setSeconds(closing_date - creation_date)
    diffHours = (closing_date - creation_date) / (1000 * 60 * 60)
    diffHours = diffHours.toFixed(2)
    return diffHours
}

// 31: Früh mergen
export function pull_request_open_duration_bucket(pull_request) {
    const open_duration = pull_request_open_duration(pull_request)

    switch (true) {
        case open_duration < 1000 * 60 * 60:
            return '<1h'
        case open_duration < 1000 * 60 * 60 * 12:
            return '<12h'
        case open_duration < 1000 * 60 * 60 * 24:
            return '<24h'
        case open_duration < 1000 * 60 * 60 * 24 * 3:
            return '<3d'
        case open_duration < 1000 * 60 * 60 * 24 * 7:
            return '<1w'
        case open_duration < 1000 * 60 * 60 * 24 * 14:
            return '<2w'
        default:
            return '>=2w'
    }
}

export function calculate_first_review_for_pull_request(pull_request) {
    const creation_time = Date.parse(pull_request.node.createdAt)
    let first_review_time
    pull_request.node.reviews.nodes.length !== 0
        ? (first_review_time = Date.parse(pull_request.node.reviews.nodes[0].createdAt))
        : (first_review_time = Date.now())
    let first_comment_time = Date.now()
    if (pull_request.node.comments) {
        pull_request.node.comments.nodes.every((comment) => {
            if (comment.author.login !== pull_request.node.author.login) {
                first_comment_time = Date.parse(comment.createdAt)
                return false
            }
            return true
        })
    }

    if (first_comment_time < first_review_time) {
        return ((first_comment_time - creation_time) / (1000 * 60 * 60)).toFixed(2)
    }
    return ((first_review_time - creation_time) / (1000 * 60 * 60)).toFixed(2)
}

export const buckets = ['<1h', '<12h', '<24h', '<3d', '<1w', '<2w', '>=2w']

// TODO
// 31: Früh mergen
/* export */
function pull_request_stale_time(pull_request) {
    /*
     * Time between closing and last comment
     * Time between closing and last commit
     * Time between opening and closing
     * */
}

// TODO
// 77: pair programming rotieren
/**/
function team_member_rotation(commits, sprint = { begin: Date.now(), end: Date.now() }) {
    /*
     * commit authors
     * commit co-authors
     * comment on issues?
     * output: who worked with whom within the sprint
     * */
}

// TODO
// 161: tickets schnell nachliefern, indem man produzent kontaktiert
/**/
function idle_time(issues, sprint = { begin: Date.now(), end: Date.now() }) {
    /*
     *
     * */
}
