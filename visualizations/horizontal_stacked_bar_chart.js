import MultipleDatasetChart from './multiple_dataset_chart.js'

import '../external/chartjs-plugin-datalabels.js'

export default class HorizontalStackedBarChart extends MultipleDatasetChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_plugins() {
        return [ChartDataLabels]
    }

    _construct_chart_dataset(dataset, index, nr_of_datasets) {
        Chart.Tooltip.positioners.followMouse = function (elements, eventPosition) {
            return {
                x: eventPosition.x,
                y: eventPosition.y
            }
        }

        const dataset_object = super._construct_chart_dataset(dataset, index, nr_of_datasets)

        dataset_object.type = 'bar'
        dataset_object.borderColor = 'rgba(76, 175, 80, 1)'
        dataset_object.backgroundColor = 'rgba(76, 175, 80, 0.25)'
        dataset_object.hoverBackgroundColor = 'rgba(76, 175, 80, 1)'
        dataset_object.borderWidth = 2
        dataset_object.datalabels = {
            color: '#000000',
            anchor: 'center',
            align: 'center',
            formatter: (value) => (value === 0 ? '' : `${value}`)
        }

        return dataset_object
    }

    _construct_chart_options() {
        return {
            indexAxis: 'y',
            plugins: {
                title: {
                    text: this.title,
                    display: true
                },
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false,
                    position: 'followMouse',
                    yAlign: 'bottom',
                    xAlign: 'center',
                    callbacks: {
                        title: (item) => {
                            const data_object = this._data[item[0].dataIndex][item[0].datasetIndex]
                            const data_object_id = data_object.url.substring(
                                data_object.url.lastIndexOf('/') + 1
                            )
                            return `#${data_object_id}: ${
                                data_object.title.length > 50
                                    ? `${data_object.title.slice(0, 50)}...`
                                    : data_object.title
                            }`
                        },
                        label: (item) => {
                            const data_object = this._data[item.dataIndex][item.datasetIndex]
                            return `${this._data_title}: ${data_object.value}`
                        }
                    }
                },
                datalabels: {
                    display: function (ctx) {
                        const scale = ctx.chart.scales.x
                        const value = ctx.dataset.data[ctx.dataIndex]
                        const range = Math.max(scale.max - scale.min, 1)
                        return (ctx.chart.height / range) * value > 16
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    stacked: true
                },
                x: {
                    stacked: true
                }
            },
            onClick: (event, clickedElements) => {
                const stack_index = clickedElements[0].index
                const index = clickedElements[0].datasetIndex
                const object = this.data[stack_index][index]
                window.open(object.url, '_blank').focus()
            }
        }
    }
}
