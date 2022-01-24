import MetricChart from './chart.js'
import { transpose } from '../utils.js'

// This class provides some common functionality for charts that deal with sprint-segmented data.
// It should not be used as actual diagram. Please use the corresponding subclasses.
export default class MultipleDatasetChart extends MetricChart {
    constructor(parameters = { canvas: null, statistics_container: null }) {
        super(parameters)
    }

    _construct_chart_options() {}

    _construct_chart_labels() {
        return this.data.map((_, index) =>
            index === this.data.length - 1 ? 'other' : `Sprint ${index + 1}`
        )
    }

    _construct_chart_datasets() {
        const data = transpose(this.data)
        return data.map((dataset, index) =>
            this._construct_chart_dataset(dataset, index, data.length)
        )
    }

    _construct_chart_dataset(dataset, index, nr_of_datasets) {
        return {
            label: dataset[0].label,
            data: dataset.map((element) => (element ? element.value : null))
        }
    }
}
