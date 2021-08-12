import {
    get_issue_sizes,
    get_issue_buckets_fixed_interval,
    get_pull_request_closing_times,
    get_pull_request_closing_time_buckets,
    get_commit_times,
    get_commit_amounts
} from './data_functions.js'

import BarChart from './visualizations/bar_chart.js'
// import StackedBarChart from './visualizations/stacked_bar_chart.js'
import MultipleLineChart from './visualizations/multiple_line_chart.js'
import Heatmap from './visualizations/heatmap.js'
import StackedBarChart from './visualizations/stacked_bar_chart.js'

export default class Config {
    constructor() {
        this._organization = ''
        this._repository = ''
        this._metric_index = 0
        this._sprint_segmented = false
        this._sprints = []
        this._team_filtered = false
        this._team_index = 0
        this._teams = []
        this._github_access_token = ''
    }

    static from_session_storage() {
        const string = sessionStorage.getItem('config')
        if (!string) {
            return new Config()
        }

        return Config.from_json(JSON.parse(string))
    }

    static from_file(file, callback = () => {}) {
        if (file) {
            const config_reader = new FileReader()

            config_reader.onload = (event) => {
                const content = event.target.result.toString()
                callback(Config.from_json(JSON.parse(content)))
            }

            config_reader.readAsText(file)
        } else {
            callback(new Config())
        }
    }

    static from_json(json) {
        const instance = new Config()

        instance.organization = json.organization
        instance.repository = json.repository
        instance.metric_index = json.metric_index
        instance.sprint_segmented = json.sprint_segmented
        instance.team_filtered = json.team_filtered
        instance.team_index = json.team_index
        instance.teams = json.teams
        instance.github_access_token = json.github_access_token

        json.sprints.forEach((sprint) => {
            const from = new Date(Date.parse(sprint.from))
            const to = new Date(Date.parse(sprint.to))
            instance.sprints.push({
                from: from,
                to: to
            })
        })

        return instance
    }

    to_session_storage() {
        sessionStorage.setItem('config', this.toString())
    }

    get organization() {
        return this._organization
    }

    set organization(value) {
        this._organization = value
    }

    get repository() {
        return this._repository
    }

    set repository(value) {
        this._repository = value
    }

    get metric_index() {
        return this._metric_index
    }

    set metric_index(value) {
        this._metric_index = value
    }

    get sprint_segmented() {
        return this._sprint_segmented
    }

    set sprint_segmented(value) {
        this._sprint_segmented = value
    }

    get sprints() {
        return this._sprints
    }

    set sprints(value) {
        this._sprints = value
    }

    get team_filtered() {
        return this._team_filtered
    }

    set team_filtered(value) {
        this._team_filtered = value
    }

    get team_index() {
        return this._team_index
    }

    set team_index(value) {
        this._team_index = value
    }

    get teams() {
        return this._teams
    }

    set teams(value) {
        this._teams = value
    }

    get chart_class() {
        if (this.metric_index === 4) {
            return Heatmap
        }
        if (this.metric_index === 5) {
            return MultipleLineChart
        }
        if (this.sprint_segmented) {
            return StackedBarChart
        }
        return BarChart
    }

    get github_access_token() {
        return this._github_access_token
    }

    set github_access_token(value) {
        this._github_access_token = value
    }

    get data_retrieval_function() {
        switch (this.metric_index) {
            case 0:
                return get_pull_request_closing_times
            case 1:
                return get_pull_request_closing_time_buckets
            case 2:
                return get_issue_sizes
            case 3:
                return get_issue_buckets_fixed_interval
            case 4:
                return get_commit_times
            case 5:
                return get_commit_amounts
            default:
                return () => {}
        }
    }

    toString() {
        return JSON.stringify({
            organization: this.organization,
            repository: this.repository,
            metric_index: this.metric_index,
            sprint_segmented: this.sprint_segmented,
            sprints: this.sprints,
            team_filtered: this.team_filtered,
            team_index: this.team_index,
            teams: this.teams,
            github_access_token: this.github_access_token
        })
    }

    equals(other) {
        const property_names = Object.getOwnPropertyNames(this)
        for (let i = 0; i < property_names.length; i++) {
            const property = property_names[i]
            if (JSON.stringify(this[property]) !== JSON.stringify(other[property])) return false
        }

        return true
    }
}
