import { Component } from '../core/component.js';
import { store } from '../core/store.js';

class DateTimeRangePanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.state = store.getState().dateRange;
    }

    render() {
        const div = this.createElement('div', { className: 'date-time-panel' });

        const startDateInput = this.createDateInput('start-date', 'date', this.state.startDate, 'Период анализа с:', (e) => {
            store.setNestedState('dateRange.startDate', e.target.value);
        });

        const startTimeInput = this.createDateInput('start-time', 'time', this.state.startTime, ' ', (e) => {
            store.setNestedState('dateRange.startTime', e.target.value);
        });

        const endDateInput = this.createDateInput('end-date', 'date', this.state.endDate, 'по:', (e) => {
            store.setNestedState('dateRange.endDate', e.target.value);
        });

        const endTimeInput = this.createDateInput('end-time', 'time', this.state.endTime, ' ', (e) => {
            store.setNestedState('dateRange.endTime', e.target.value);
        });

        div.appendChild(startDateInput);
        div.appendChild(startTimeInput);
        div.appendChild(endDateInput);
        div.appendChild(endTimeInput);

        this.element = div;
        return div;
    }

    createDateInput(id, type, value, label, onChange) {
        const wrapper = this.createElement('div', { className: 'date-input-wrapper' });

        if (label && label.trim()) {
            const labelEl = this.createElement('label', { className: 'input-label', for: id }, label);
            wrapper.appendChild(labelEl);
        }

        const input = this.createElement('input', {
            id: id,
            type: type,
            className: 'input',
            value: value || '',
            onchange: onChange
        });

        wrapper.appendChild(input);
        return wrapper;
    }

    onStoreUpdate(state) {
        this.state = state.dateRange;
        if (this.element) {
            const startDate = this.element.querySelector('#start-date');
            const startTime = this.element.querySelector('#start-time');
            const endDate = this.element.querySelector('#end-date');
            const endTime = this.element.querySelector('#end-time');

            if (startDate && startDate.value !== this.state.startDate) startDate.value = this.state.startDate;
            if (startTime && startTime.value !== this.state.startTime) startTime.value = this.state.startTime;
            if (endDate && endDate.value !== this.state.endDate) endDate.value = this.state.endDate;
            if (endTime && endTime.value !== this.state.endTime) endTime.value = this.state.endTime;
        }
    }
}

export default DateTimeRangePanel;