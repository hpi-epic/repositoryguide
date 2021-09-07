import MultipleDatasetChart from './multiple_dataset_chart.js'

export default class HorizontalBarChart extends MultipleDatasetChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_plugins() {
        return [ChartDataLabels]
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
            indexAxis: 'y',
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

    _construct_chart_datasets() {
        return [
            /* {
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
            }, */
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
}
