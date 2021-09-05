import MultipleDatasetChart from './multiple_dataset_chart.js'
import BarChart from './bar_chart.js'

import '../external/chartjs-plugin-datalabels.js'

export default class HorizontalStackedBarChart extends MultipleDatasetChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_plugins() {
        return [ChartDataLabels]
    }

    _construct_chart_dataset(dataset, index, nr_of_datasets) {
        const dataset_object = super._construct_chart_dataset(dataset, index, nr_of_datasets)

        const color_base =
            `rgba(0,` +
            `${(255 / nr_of_datasets) * (nr_of_datasets - index)},` +
            `${(255 / nr_of_datasets) * index},`

        dataset_object.type = 'bar'
        dataset_object.borderColor = `${color_base}1)`
        dataset_object.backgroundColor = `${color_base}0.25)`
        dataset_object.hoverBackgroundColor = `${color_base}1)`
        dataset_object.borderWidth = 2
        dataset_object.datalabels = {
            color: '#000000',
            anchor: 'center',
            align: 'center',
            formatter: (value) => ''
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
            onClick: (event, clickedElements, chart) => {
                const stack_index = clickedElements[0].index
                const index = clickedElements[0].datasetIndex
                const object = this.data[stack_index][index]
                window.open(object.url, '_blank').focus()
            }
        }
    }
}
