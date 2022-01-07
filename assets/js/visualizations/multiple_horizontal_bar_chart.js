import MultipleDatasetChart from './multiple_dataset_chart.js'

export default class Multiple_horizontal_bar_chart extends MultipleDatasetChart {
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
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (item) => {
                            const { datasetIndex } = item[0]
                            const { dataIndex } = item[0]
                            const data_object = this._data[dataIndex].value[datasetIndex]
                            return data_object.name
                        },
                        label: (item) => {
                            const data_object = this._data[item.dataIndex].value[item.datasetIndex]
                            return data_object.value
                        }
                    },
                    displayColors: false
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
                    display: true,
                    barThickness: 1000
                }
            },
            onClick: (event, clickedElements) => {
                const stack_index = clickedElements[0].index
                const index = clickedElements[0].datasetIndex
                const object = this._data[stack_index].value[index]
                window.open(object.url, '_blank')
            }
        }
    }

    _construct_chart_datasets() {
        const datasets = []
        let displayed_number = 0
        const max_displayed = 5

        this.data.forEach((sprint_dataset) => {
            if (sprint_dataset.value.length > displayed_number) {
                displayed_number = sprint_dataset.value.length
            }
        })

        if (displayed_number > max_displayed) {
            displayed_number = max_displayed
        }

        for (let i = 0; i < displayed_number; i++) {
            const dataset = {
                type: 'bar',
                borderWidth: 2,
                datalabels: {
                    labels: {
                        title: null
                    }
                }
            }

            dataset.data = this.data.map((element) => {
                if (element.value[i]) {
                    return element.value[i].value
                }
                return null
            })

            const color_base =
                `rgba(0,` +
                `${(255 / displayed_number) * (displayed_number - i)},` +
                `${(255 / displayed_number) * i},`

            dataset.borderColor = `${color_base}1)`
            dataset.backgroundColor = `${color_base}0.25)`
            dataset.hoverBackgroundColor = `${color_base}1)`

            datasets.push(dataset)
        }
        return datasets
    }
}
