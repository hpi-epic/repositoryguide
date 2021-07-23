import '../external/chart.js'

// This class provides some common functionality for all charts
// It should not be used as actual diagram. Please use the corresponding subclasses.
export default class MetricChart {
    constructor(parameters = { canvas_container: null, statistics_container: null }) {
        this._data = []
        this._chart = null
        this._canvas_container = parameters.canvas_container
        this._statistics_container = parameters.statistics_container
        this._title = ''
        this._data_title = ''
        this._config = {}
    }

    get config() {
        return this._config
    }

    set config(value) {
        this._config = value
    }

    set chart(chart) {
        this._chart = chart
    }

    get chart() {
        return this._chart
    }

    set data_title(title) {
        this._data_title = title
    }

    get data_title() {
        return this._data_title
    }

    set title(title) {
        this._title = title
    }

    get title() {
        return this._title
    }

    set data(data) {
        this._data = data
    }

    get data() {
        return this._data
    }

    get canvas_container() {
        return this._canvas_container
    }

    get statistics_container() {
        return this._statistics_container
    }

    draw() {
        if (this.chart === null) {
            this.chart = this._construct_chart()
        }
        this._update()
    }

    _update() {
        this.chart.data = {
            labels: this._construct_chart_labels(),
            datasets: this._construct_chart_datasets()
        }
        this.chart.update()
    }

    _construct_chart() {
        const canvas = document.createElement('canvas')
        this.canvas_container.appendChild(canvas)

        const drawing_context = canvas.getContext('2d')
        return new Chart(drawing_context, {
            data: {
                labels: this._construct_chart_labels(),
                datasets: this._construct_chart_datasets()
            },
            plugins: this._construct_chart_plugins(),
            options: this._construct_chart_options()
        })
    }

    _construct_chart_plugins() {
        return []
    }

    _construct_chart_options() {
        return {}
    }

    _construct_chart_labels() {
        return []
    }

    _construct_chart_datasets() {
        return []
    }
}
