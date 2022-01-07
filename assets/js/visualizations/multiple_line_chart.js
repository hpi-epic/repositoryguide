import MultipleDatasetChart from './multiple_dataset_chart.js'

export default class MultipleLineChart extends MultipleDatasetChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_dataset(dataset, index, nr_of_datasets) {
        const dataset_object = super._construct_chart_dataset(dataset, index, nr_of_datasets)

        dataset_object.type = 'line'
        dataset_object.borderJoinStyle = 'round'
        dataset_object.pointRadius = 0
        dataset_object.borderColor =
            `rgba(0,` +
            `${(255 / nr_of_datasets) * (nr_of_datasets - index)},` +
            `${(255 / nr_of_datasets) * index},1`
        dataset_object.borderWidth = 2
        dataset_object.fill = false
        dataset_object.datalabels = {
            labels: {
                title: null
            }
        }

        return dataset_object
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
                    stacked: true
                },
                x: {
                    stacked: true,
                    offset: true,
                    display: true
                }
            }
        }
    }
}
