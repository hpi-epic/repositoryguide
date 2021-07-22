import { get_max, get_min, quantile, sum } from '../utils.js'

import MetricChart from './chart.js'

// expected data format:
// [{
//     label: 'label 1',
//     value: 'value 1'
// }, {
//     label: 'label 2',
//     value: 'value 2'
// }, ... ]
export default class BarChart extends MetricChart {
    constructor(parameters = { canvas_container: null, statistics_container: null }) {
        super(parameters)

        this._statistics = {
            average: 0,
            min: 0,
            lower_quantile: 0,
            median: 0,
            upper_quantile: 0,
            max: 0
        }
    }

    get statistics() {
        return this._statistics
    }

    set statistics(statistics) {
        this._statistics = statistics
    }

    _update() {
        this._calculate_statistics()
        if (this.statistics_container) {
            this._clear_statistics_container()
            this._construct_statistic_displays()
        }

        super._update()
    }

    _construct_chart_options() {
        return {
            plugins: {
                title: {
                    text: this.title,
                    display: true
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    stacked: false
                },
                x: {
                    stacked: false,
                    offset: true,
                    display: true
                }
            }
        }
    }

    _construct_chart_labels() {
        return this.data.map((element) => element.label)
    }

    _construct_chart_datasets() {
        return [
            {
                type: 'line',
                label: 'median',
                data: this.data.map(() => this.statistics.median),
                borderColor: 'rgba(106, 27, 154, 1)',
                fill: false,
                pointRadius: 0,
                datalabels: {
                    labels: {
                        title: null
                    }
                }
            },
            {
                type: 'line',
                label: 'average',
                data: this.data.map(() => this.statistics.average),
                borderColor: 'rgba(239, 108, 0, 1)',
                pointRadius: 0,
                fill: false,
                datalabels: {
                    labels: {
                        title: null
                    }
                }
            },
            {
                type: 'bar',
                label: this.data_title,
                data: this.data.map((element) => element.value),
                borderWidth: 2,
                borderColor: 'rgba(76, 175, 80, 1)',
                backgroundColor: 'rgba(76, 175, 80, 0.25)',
                hoverBackgroundColor: 'rgba(76, 175, 80, 1)',
                datalabels: {
                    labels: {
                        title: null
                    }
                }
            }
        ]
    }

    _calculate_statistics() {
        if (this.data.length === 0) return

        this.statistics = {
            average: sum(this.data) / this.data.length,
            min: get_min(this.data),
            lower_quantile: quantile(this.data, 0.25),
            median: quantile(this.data, 0.5),
            upper_quantile: quantile(this.data, 0.75),
            max: get_max(this.data)
        }
    }

    _clear_statistics_container() {
        while (this.statistics_container.firstChild) {
            this.statistics_container.removeChild(this.statistics_container.lastChild)
        }
    }

    _construct_statistic_displays() {
        Object.keys(this.statistics).forEach((key) => {
            const element = document.createElement('p')
            element.innerHTML = `${key}: ${this.statistics[key]}`
            this.statistics_container.append(element)
        })
    }
}
