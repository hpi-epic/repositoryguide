import Heatmap from './visualizations/heatmap.js'
import StackedBarChart from './visualizations/stacked_bar_chart.js'
import BarChart from './visualizations/bar_chart.js'
import MultipleLineChart from './visualizations/multiple_line_chart.js'
import HorizontalStackedBarChart from './visualizations/horizontal_stacked_bar_chart.js'
import Multiple_horizontal_bar_chart from './visualizations/multiple_horizontal_bar_chart.js'
import LineBarChart from './visualizations/line_bar_chart.js'

import {
    get_commit_amounts,
    get_commit_times,
    get_issue_buckets_fixed_interval,
    get_issue_sizes,
    get_issue_submit_times,
    get_pull_request_open_duration_buckets,
    get_pull_request_open_durations,
    get_pull_request_review_and_comment_times,
    get_top_issue_submitters,
    get_pull_request_review_times,
    get_total_pull_request_interactions
} from './data_functions/metric_functions.js'

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
