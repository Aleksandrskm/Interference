// static/js/components/SpectrumSetting.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';

class SpectrumSetting extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.state = store.getState().spectrumParams;
        this.isLoading = false;
        this.button = null;
        this.inputs = {};
    }

    render() {
        const section = this.createElement('section', { className: 'spectrum-setting' });

        const title = this.createElement('h3', {}, 'Настройки спектроанализатора');
        section.appendChild(title);

        // Создаем форму с настройками
        const form = this.createElement('div', {
            className: 'spectrum-form',
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px'
            }
        });

        // Поле для начальной частоты (fr1)
        const fr1Field = this.createField({
            label: 'Начальная частота (МГц)',
            id: 'fr1',
            type: 'number',
            value: this.state.fr1,
            min: 0,
            max: 6000,
            step: 1,
            unit: 'МГц'
        });
        form.appendChild(fr1Field);

        // Поле для конечной частоты (fr2)
        const fr2Field = this.createField({
            label: 'Конечная частота (МГц)',
            id: 'fr2',
            type: 'number',
            value: this.state.fr2,
            min: 0,
            max: 6000,
            step: 1,
            unit: 'МГц'
        });
        form.appendChild(fr2Field);

        // Поле для количества усреднений (averages)
        const averagesField = this.createField({
            label: 'Количество усреднений',
            id: 'averages',
            type: 'number',
            value: this.state.averages,
            min: 1,
            max: 100,
            step: 1,
            unit: ''
        });
        form.appendChild(averagesField);

        // Поле для усиления (gain)
        const gainField = this.createField({
            label: 'Усиление (dB)',
            id: 'gain',
            type: 'number',
            value: this.state.gain,
            min: 0,
            max: 40,
            step: 1,
            unit: 'dB'
        });
        form.appendChild(gainField);

        section.appendChild(form);

        // Кнопки управления
        const buttonsContainer = this.createElement('div', {
            className: 'spectrum-buttons',
            style: {
                display: 'flex',
                gap: '10px',
                marginBottom: '10px'
            }
        });

        this.button = this.createElement('button', {
            className: 'button button-primary',
            style: {
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
            },
            onclick: () => this.getSpectrogramm()
        }, 'Получить спектрограмму');

        const resetBtn = this.createElement('button', {
            className: 'button button-secondary',
            style: {
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
            },
            onclick: () => this.resetToDefaults()
        }, 'Сбросить к значениям по умолчанию');

        const statusBtn = this.createElement('button', {
            className: 'button button-secondary',
            style: {
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
            },
            onclick: () => console.log('Статус устройства')
        }, 'Статус устройства');

        buttonsContainer.appendChild(this.button);
        buttonsContainer.appendChild(resetBtn);
        buttonsContainer.appendChild(statusBtn);
        section.appendChild(buttonsContainer);

        // Добавляем отображение текущих параметров
        this.paramsDisplay = this.createElement('div', {
            className: 'params-display',
            style: {
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
            }
        });
        section.appendChild(this.paramsDisplay);

        this.element = section;
        this.updateParamsDisplay();
        return section;
    }

    createField({ label, id, type, value, min, max, step, unit }) {
        const fieldContainer = this.createElement('div', {
            className: 'spectrum-field',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
            }
        });

        const labelEl = this.createElement('label', {
            htmlFor: id,
            style: {
                fontWeight: '500',
                fontSize: '13px',
                color: '#333'
            }
        }, label);

        const inputWrapper = this.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
            }
        });

        const input = this.createElement('input', {
            id: id,
            type: type,
            value: value,
            min: min,
            max: max,
            step: step,
            style: {
                flex: 1,
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
            },
            onchange: (e) => this.updateParam(id, parseFloat(e.target.value))
        });

        this.inputs[id] = input;
        inputWrapper.appendChild(input);

        if (unit) {
            const unitSpan = this.createElement('span', {
                style: {
                    fontSize: '12px',
                    color: '#666'
                }
            }, unit);
            inputWrapper.appendChild(unitSpan);
        }

        fieldContainer.appendChild(labelEl);
        fieldContainer.appendChild(inputWrapper);

        return fieldContainer;
    }

    updateParam(param, value) {
        // Валидация значений
        if (param === 'fr1') {
            if (value < 0) value = 0;
            if (value > 6000) value = 6000;
            if (value >= this.state.fr2) {
                value = this.state.fr2 - 1;
                if (this.inputs[param]) {
                    this.inputs[param].value = value;
                }
            }
        }

        if (param === 'fr2') {
            if (value < 0) value = 0;
            if (value > 6000) value = 6000;
            if (value <= this.state.fr1) {
                value = this.state.fr1 + 1;
                if (this.inputs[param]) {
                    this.inputs[param].value = value;
                }
            }
        }

        if (param === 'averages') {
            if (value < 1) value = 1;
            if (value > 100) value = 100;
        }

        if (param === 'gain') {
            if (value < 0) value = 0;
            if (value > 40) value = 40;
        }

        // Обновляем состояние
        const newState = {
            ...this.state,
            [param]: value
        };

        this.state = newState;
        store.setNestedState('spectrumParams', newState);

        // Обновляем отображение параметров
        this.updateParamsDisplay();
    }

    resetToDefaults() {
        const defaultParams = {
            fr1: 2100,
            fr2: 2200,
            averages: 2,
            gain: 5
        };

        this.state = defaultParams;
        store.setNestedState('spectrumParams', defaultParams);

        // Обновляем значения в инпутах
        if (this.inputs.fr1) this.inputs.fr1.value = defaultParams.fr1;
        if (this.inputs.fr2) this.inputs.fr2.value = defaultParams.fr2;
        if (this.inputs.averages) this.inputs.averages.value = defaultParams.averages;
        if (this.inputs.gain) this.inputs.gain.value = defaultParams.gain;

        // Обновляем отображение
        this.updateParamsDisplay();

        console.log('Reset to defaults:', defaultParams);
    }

    updateParamsDisplay() {
        if (!this.paramsDisplay) return;

        const { fr1, fr2, averages, gain } = this.state;
        this.paramsDisplay.innerHTML = `
            Текущие параметры: 
            частота ${fr1} - ${fr2} МГц | 
            усреднений: ${averages} | 
            усиление: ${gain} dB
        `;
    }

    async getSpectrogramm() {
        if (this.isLoading) return;

        const { fr1, fr2, averages, gain } = this.state;

        console.log('📡 Getting spectrogram with params:', {
            f1: fr1 * 1000000,
            f2: fr2 * 1000000,
            aver_cnt: averages,
            gain: gain
        });

        try {
            this.isLoading = true;
            if (this.button) {
                this.button.disabled = true;
                this.button.textContent = 'Загрузка...';
                this.button.style.opacity = '0.6';
                this.button.style.cursor = 'not-allowed';
            }

            store.setNestedState('spectrogramm.isLoading', true);
            store.setNestedState('spectrogramm.error', null);

            const result = await dbApi.postSpectrum({
                f1: Number(fr1 * 1000000),
                f2: Number(fr2 * 1000000),
                aver_cnt: Number(averages),
                gain: Number(gain)
            });

            console.log('✅ Received spectrogram data:', {
                hasF1: !!result.f1,
                hasF2: !!result.f2,
                pointsCount: result.points?.length,
                pointsCnt: result.points_cnt
            });

            // Сохраняем данные в store
            store.setNestedState('spectrogramm.data', result);
            store.setNestedState('spectrogramm.isLoading', false);
            store.setNestedState('spectrogramm.lastUpdate', Date.now());

        } catch (error) {
            console.error('❌ Error getting spectrogram:', error);
            store.setNestedState('spectrogramm.data', null);
            store.setNestedState('spectrogramm.isLoading', false);
            store.setNestedState('spectrogramm.error', error.message);
        } finally {
            this.isLoading = false;
            if (this.button) {
                this.button.disabled = false;
                this.button.textContent = 'Получить спектрограмму';
                this.button.style.opacity = '1';
                this.button.style.cursor = 'pointer';
            }
        }
    }

    onStoreUpdate(state) {
        if (state.spectrumParams && JSON.stringify(state.spectrumParams) !== JSON.stringify(this.state)) {
            this.state = state.spectrumParams;
            // Обновляем значения в инпутах
            if (this.inputs.fr1) this.inputs.fr1.value = this.state.fr1;
            if (this.inputs.fr2) this.inputs.fr2.value = this.state.fr2;
            if (this.inputs.averages) this.inputs.averages.value = this.state.averages;
            if (this.inputs.gain) this.inputs.gain.value = this.state.gain;
            this.updateParamsDisplay();
        }
    }

    mount() {
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default SpectrumSetting;