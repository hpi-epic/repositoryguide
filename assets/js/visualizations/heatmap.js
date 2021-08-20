import MetricChart from './metric_chart.js'
import 'https://cdn.jsdelivr.net/npm/chart.js@3.5.1/dist/chart.js'
import 'https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@1.0.2/dist/chartjs-chart-matrix.js'

export default class Heatmap extends MetricChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_options() {
        return {
            layout: {
                padding: {
                    top: 40
                }
            },
            plugins: {
                title: {
                    text: this.title,
                    display: true
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function () {
                            return ''
                        },
                        label: (item) => [
                            `Time: ${item.raw.x}:00 to ${item.raw.x + 1}:00`,
                            `${this.git_artifact_name}: ${item.raw.v}`
                        ]
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 23,
                    offset: true,
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        font: {
                            size: 11
                        },
                        padding: 60,
                        callback: function (label, index, labels) {
                            switch (label) {
                                case 0:
                                    return '0:00'
                                case 23:
                                    return '23:00'
                                case 5:
                                    return '5:00'
                                case 10:
                                    return '10:00'
                                case 15:
                                    return '15:00'
                                case 20:
                                    return '20:00'
                            }
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                        tickLength: 0
                    }
                },
                y: {
                    min: 0,
                    max: 6,
                    ticks: {
                        autoSkip: true,
                        font: {
                            size: 11
                        },
                        padding: -80,
                        callback: function (label, index, labels) {
                            switch (label) {
                                case 0:
                                    return 'Mon'
                                case 1:
                                    return 'Tue'
                                case 2:
                                    return 'Wed'
                                case 3:
                                    return 'Thu'
                                case 4:
                                    return 'Fri'
                                case 5:
                                    return 'Sat'
                                case 6:
                                    return 'Sun'
                            }
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false,
                        tickLength: 0
                    }
                }
            }
        }
    }

    _construct_chart_datasets() {
        return [
            {
                label: this.data_title,
                type: 'matrix',
                data: this.data[0].value,
                backgroundColor: function (drawing_context) {
                    const value = drawing_context.dataset.data[drawing_context.dataIndex].v
                    // max 50 commits ho wot calc max value in array?
                    const alpha = (value * 1.8) / 100 + 0.05
                    return `rgba(199, 91, 91, ${alpha})`
                },
                width: ({ chart }) => (chart.chartArea || {}).width / 28,
                height: ({ chart }) => (chart.chartArea || {}).height / 8
            }
        ]
    }
}
