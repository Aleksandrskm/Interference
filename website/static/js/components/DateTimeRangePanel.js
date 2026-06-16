// components/DateTimeRangePanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';

class DateTimeRangePanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.inputs = {};
    }

    // Метод для получения текущего времени
    getCurrentDateTime() {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 1);

        return {
            startDate: this.getDateForInput(startDate),
            endDate: this.getDateForInput(endDate),
            startTime: this.getTimeForInput(startDate),
            endTime: this.getTimeForInput(endDate)
        };
    }

    render() {
        const div = this.createElement('div', { className: 'date-time-panel' });

        // Всегда берем актуальное время
        const currentTime = this.getCurrentDateTime();

        // Обновляем store
        store.state.dateRange = currentTime;
        store.notify();

        const startDateInput = this.createDateInput('start-date', 'date', currentTime.startDate, 'Период анализа с:', (e) => {
            store.setNestedState('dateRange.startDate', e.target.value);
        });

        const startTimeInput = this.createDateInput('start-time', 'time', currentTime.startTime, ' ', (e) => {
            store.setNestedState('dateRange.startTime', e.target.value);
        });

        const endDateInput = this.createDateInput('end-date', 'date', currentTime.endDate, 'по:', (e) => {
            store.setNestedState('dateRange.endDate', e.target.value);
        });

        const endTimeInput = this.createDateInput('end-time', 'time', currentTime.endTime, ' ', (e) => {
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
            onchange: onChange,
            step: 1,
        });

        this.inputs[id] = input;
        wrapper.appendChild(input);
        return wrapper;
    }

    getDateForInput(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    getTimeForInput(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    onStoreUpdate(state) {
        // Обновляем только если пользователь изменил даты вручную
        const newState = state.dateRange;
        if (!this.inputs['start-date']) return;

        // Проверяем, изменились ли значения
        const currentStartDate = this.inputs['start-date'].value;
        const currentStartTime = this.inputs['start-time'].value;
        const currentEndDate = this.inputs['end-date'].value;
        const currentEndTime = this.inputs['end-time'].value;

        if (currentStartDate !== newState.startDate) {
            this.inputs['start-date'].value = newState.startDate || '';
        }
        if (currentStartTime !== newState.startTime) {
            this.inputs['start-time'].value = newState.startTime || '';
        }
        if (currentEndDate !== newState.endDate) {
            this.inputs['end-date'].value = newState.endDate || '';
        }
        if (currentEndTime !== newState.endTime) {
            this.inputs['end-time'].value = newState.endTime || '';
        }
    }

    mount() {
        console.log('DateTimeRangePanel mounted');
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default DateTimeRangePanel;