import MultipleDatasetChart from './multiple_dataset_chart.js'

export default class LineBarChart extends MultipleDatasetChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
        this._isOfTypeLine = true
    }

    get isOfTypeLine() {
        return this._isOfTypeLine
    }

    set isOfTypeLine(value) {
        this._isOfTypeLine = value
    }

    _construct_chart_dataset(dataset, index, nr_of_datasets) {
        const dataset_object = super._construct_chart_dataset(dataset, index, nr_of_datasets)

        const base_color =
            `${(255 / nr_of_datasets) * (nr_of_datasets - index)},` +
            `${(255 / nr_of_datasets) * index}`

        if (this._isOfTypeLine) {
            dataset_object.type = 'line'
            dataset_object.fill = false
            this._isOfTypeLine = false
        } else {
            dataset_object.type = 'bar'
            dataset_object.backgroundColor = `rgba(0,${base_color},0.25)`
            dataset_object.hoverBackgroundColor = `rgba(0,${base_color},1)`
            this._isOfTypeLine = true
        }
        dataset_object.pointRadius = 0
        dataset_object.borderColor = `rgba(0,${base_color},1)`
        dataset_object.borderWidth = 2
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
