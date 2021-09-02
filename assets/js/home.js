import Config from './config.js'
import { metrics } from './metrics.js'
import { add_header } from '../components/components.js'

const config = Config.from_storage()

async function initializeChart(
    chartClass,
    canvas,
    statistics_container,
    data_retrieval_function,
    sprint_segmented,
    title,
    data_title
) {
    const chart = new chartClass({
        canvas: canvas,
        statistics_container: statistics_container
    })
    chart.data = await data_retrieval_function(config, sprint_segmented)
    chart.title = title
    chart.data_title = data_title
    chart.config = config
    chart.draw()
}

async function initialize() {
    await add_header()
    document.getElementById('button_navigate_home').classList.add('active')

    const canvases = [...document.getElementsByClassName('chart-canvas')]
    const statistic_containers = [...document.getElementsByClassName('chart-statistics-container')]
    const groups = {}

    canvases.forEach((canvas) => {
        if (!groups[canvas.dataset.metric]) {
            groups[canvas.dataset.metric] = {}
        }
        groups[canvas.dataset.metric].canvas = canvas
    })
    statistic_containers.forEach((container) => {
        if (!groups[container.dataset.metric]) {
            groups[container.dataset.metric] = {}
        }
        groups[container.dataset.metric].statistics_container = container
    })

    const promises = []
    for (const metric_name of Object.keys(groups)) {
        const metric = metrics[metric_name]
        const group = groups[metric_name]
        debugger
        promises.push(
            initializeChart(
                metric.chart_class,
                group.canvas,
                group.statistics_container,
                metric.data_retrieval_function,
                metric.sprint_segmented,
                metric_name,
                metric_name
            )
        )
    }
    await Promise.all(promises)
}

if (!config.github_access_token || !config.organization || !config.repository) {
    Toastify({
        text: 'Please load a config or configure your project via the settings tab.',
        duration: -1,
        gravity: 'top',
        position: 'center',
        backgroundColor: '#cc3300',
        offset: {
            x: 0,
            y: 50
        }
    }).showToast()
} else {
    initialize()
}
