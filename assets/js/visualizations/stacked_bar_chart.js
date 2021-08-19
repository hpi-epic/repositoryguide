import MultipleDatasetChart from './multiple_dataset_chart.js'
import BarChart from './bar_chart.js'

import '../../../external/chartjs-plugin-datalabels.js'

export default class StackedBarChart extends MultipleDatasetChart {
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
            formatter: (value) => {
                if (value === 0) {
                    return ''
                }
                return `${dataset[0].label}: ${value}`
            }
        }

        return dataset_object
    }

    _construct_detail_chart_container(position = { x: 0, y: 0 }) {
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.height = '300px'
        container.style.width = '300px'
        container.style.top = `${position.y}px`
        container.style.left = `${position.x}px`
        container.style.zIndex = '1'
        container.style.backgroundColor = 'white'
        container.style.boxShadow =
            '0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)'
        container.style.padding = '5px 5px 5px 5px'
        container.onmousedown = (mouse_down_event) => {
            mouse_down_event.preventDefault()

            let start_position = {
                x: mouse_down_event.clientX,
                y: mouse_down_event.clientY
            }

            document.body.onmouseup = () => {
                document.body.onmouseup = null
                document.body.onmousemove = null
            }

            document.body.onmousemove = (mouse_move_event) => {
                mouse_move_event.preventDefault()

                const position_offset = {
                    x: start_position.x - mouse_move_event.clientX,
                    y: start_position.y - mouse_move_event.clientY
                }

                start_position = {
                    x: mouse_move_event.clientX,
                    y: mouse_move_event.clientY
                }

                container.style.top = `${container.offsetTop - position_offset.y}px`
                container.style.left = `${container.offsetLeft - position_offset.x}px`
            }
        }

        const close_button = document.createElement('button')
        close_button.innerHTML = 'x'
        close_button.className = 'btn'
        close_button.style.float = 'right'
        close_button.addEventListener('click', () => {
            document.body.removeChild(container)
        })

        const canvas_container = document.createElement('div')
        canvas_container.style.display = 'inline-block'
        canvas_container.style.height = '100%'
        canvas_container.style.width = '80%'
        canvas_container.style.float = 'left'

        const canvas = document.createElement('canvas')
        canvas_container.appendChild(canvas)

        container.append(close_button, canvas_container)

        return {
            container: container,
            canvas: canvas
        }
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
            },
            onClick: (event, clickedElements, chart) => {
                const stack_index = clickedElements[0].index
                const container = this._construct_detail_chart_container({
                    x: event.native.pageX,
                    y: event.native.pageY
                })
                document.body.appendChild(container.container)

                const mini_chart = new BarChart({
                    canvas: container.canvas,
                    statistics_container: null
                })
                mini_chart.data = this.data[stack_index]
                mini_chart.title = this.title
                if (this.config.team_filtered) {
                    mini_chart.title += ` of team '${
                        this.config.teams[this.config.team_index].name
                    }'`
                }
                mini_chart.title += ` in ${chart.data.labels[stack_index]}`
                mini_chart.data_title = this.title
                mini_chart.draw()
            }
        }
    }
}
