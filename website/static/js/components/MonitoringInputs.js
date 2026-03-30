import { Component } from '../core/component.js';
import { store } from '../core/store.js';

class MonitoringInputs extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.state = store.getState().interference;
    }

    render() {
        const section = this.createElement('section', { className: 'monitoring-inputs' });

        const rssInput = this.createInput('rss-id', 'number', this.state.rssId, 'Идентификатор РСС:', (e) => {
            store.setNestedState('interference.rssId', Number(e.target.value));
        });

        const f1Input = this.createInput('f1', 'number', this.state.f1, 'Начало полосы частот, МГц. :', (e) => {
            store.setNestedState('interference.f1', Number(e.target.value));
        }, 0.5);

        const f2Input = this.createInput('f2', 'number', this.state.f2, 'Конец полосы частот, МГц. :', (e) => {
            store.setNestedState('interference.f2', Number(e.target.value));
        }, 0.5);

        section.appendChild(rssInput);
        section.appendChild(f1Input);
        section.appendChild(f2Input);

        this.element = section;
        return section;
    }

    createInput(id, type, value, label, onChange, step = null) {
        const wrapper = this.createElement('div', { className: 'input-wrapper' });

        const labelEl = this.createElement('label', { className: 'input-label', for: id }, label);
        const input = this.createElement('input', {
            id: id,
            type: type,
            className: 'input',
            value: value,
            onchange: onChange
        });

        if (step !== null) {
            input.step = step;
        }

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);

        return wrapper;
    }

    onStoreUpdate(state) {
        this.state = state.interference;
        if (this.element) {
            const f1Input = this.element.querySelector('#f1');
            const f2Input = this.element.querySelector('#f2');
            const rssInput = this.element.querySelector('#rss-id');

            if (f1Input && f1Input.value != this.state.f1) f1Input.value = this.state.f1;
            if (f2Input && f2Input.value != this.state.f2) f2Input.value = this.state.f2;
            if (rssInput && rssInput.value != this.state.rssId) rssInput.value = this.state.rssId;
        }
    }
}

export default MonitoringInputs;