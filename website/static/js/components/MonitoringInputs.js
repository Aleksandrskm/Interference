// components/MonitoringInputs.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';

class MonitoringInputs extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.state = store.getState().interference;
        this.usgList = [];
        this.rssList = [];
        this.isLoadingUsg = false;
        this.isLoadingRss = false;
        this.usgSelect = null;
        this.rssSelect = null;
        this.f1Input = null;
        this.f2Input = null;
        this.defaultF1 = this.state.f1;
        this.defaultF2 = this.state.f2;
        this.selectedUsgId = null;
    }

    async loadUsgList() {
        if (this.isLoadingUsg) return;

        this.isLoadingUsg = true;
        try {
            console.log('Loading object of protection list...');
            const response = await dbApi.getUsgList();
            console.log('USG list response:', response);

            if (Array.isArray(response)) {
                this.usgList = response;
            } else if (response && response.data && Array.isArray(response.data)) {
                this.usgList = response.data;
            } else if (response && response.usg_list && Array.isArray(response.usg_list)) {
                this.usgList = response.usg_list;
            } else {
                this.usgList = [];
                console.warn('Unexpected USG response format:', response);
            }

            console.log('Parsed USG list count:', this.usgList.length);
            this.updateUsgSelectOptions();
        } catch (error) {
            console.error('Error loading USG list:', error);
            this.usgList = [];
        } finally {
            this.isLoadingUsg = false;
        }
    }

    async loadRssList() {
        if (this.isLoadingRss) return;

        this.isLoadingRss = true;
        try {
            console.log('Loading RSS list...');
            const response = await dbApi.getRssList();
            console.log('RSS list response:', response);

            if (Array.isArray(response)) {
                this.rssList = response;
            } else {
                this.rssList = [];
                console.warn('Unexpected RSS response format:', response);
            }

            console.log('Parsed RSS list count:', this.rssList.length);
            this.updateRssSelectOptions();
        } catch (error) {
            console.error('Error loading RSS list:', error);
            this.rssList = [];
        } finally {
            this.isLoadingRss = false;
        }
    }

    updateUsgSelectOptions() {
        if (!this.usgSelect) return;

        const currentValue = this.usgSelect.value;

        while (this.usgSelect.options.length > 0) {
            this.usgSelect.remove(0);
        }

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Выберите объект защиты';
        this.usgSelect.appendChild(defaultOption);

        this.usgList.forEach(usg => {
            const option = document.createElement('option');
            option.value = usg.id;
            const label = usg.note || `Объект ${usg.id}`;
            option.textContent = `${label} (${usg.f1 || 0} - ${usg.f2 || 0} МГц)`;
            option.dataset.f1 = usg.f1 || 0;
            option.dataset.f2 = usg.f2 || 0;
            option.dataset.usgId = usg.id;
            this.usgSelect.appendChild(option);
        });

        if (currentValue && this.usgList.some(usg => String(usg.id) === String(currentValue))) {
            this.usgSelect.value = currentValue;
            this.onUsgSelect(currentValue);
        }
    }

    updateRssSelectOptions() {
        if (!this.rssSelect) return;

        const currentValue = this.rssSelect.value;

        while (this.rssSelect.options.length > 0) {
            this.rssSelect.remove(0);
        }

        this.rssList.forEach(rss => {
            const option = document.createElement('option');
            option.value = rss.ID;
            option.textContent = rss.NAIM || `РСС ${rss.ID}`;
            this.rssSelect.appendChild(option);
        });

        const defaultRssId = '2';
        if (this.rssList.some(rss => String(rss.ID) === defaultRssId)) {
            this.rssSelect.value = defaultRssId;
            this.onRssSelect(defaultRssId);
        } else if (this.rssList.length > 0) {
            this.rssSelect.value = this.rssList[0].ID;
            this.onRssSelect(this.rssList[0].ID);
        }
    }

    onUsgSelect(value) {
        console.log('onUsgSelect called with value:', value);

        if (!value || value === '') {
            this.selectedUsgId = null;
            store.setNestedState('interference.usgId', null);
            this.resetToDefaultFrequencies();
            return;
        }

        const selectedUsg = this.usgList.find(usg => String(usg.id) === String(value));
        if (!selectedUsg) {
            console.warn('Selected USG not found:', value);
            this.selectedUsgId = null;
            store.setNestedState('interference.usgId', null);
            this.resetToDefaultFrequencies();
            return;
        }

        console.log('Selected USG:', selectedUsg);
        console.log('USG ID:', selectedUsg.id);

        this.selectedUsgId = selectedUsg.id;
        store.setNestedState('interference.usgId', selectedUsg.id);

        const f1Value = selectedUsg.f1 !== undefined ? Number(selectedUsg.f1) : this.defaultF1;
        const f2Value = selectedUsg.f2 !== undefined ? Number(selectedUsg.f2) : this.defaultF2;

        const f1Input = document.getElementById('f1');
        const f2Input = document.getElementById('f2');

        if (f1Input) {
            f1Input.value = f1Value;
            store.setNestedState('interference.f1', f1Value);
        }

        if (f2Input) {
            f2Input.value = f2Value;
            store.setNestedState('interference.f2', f2Value);
        }

        this.f1Input = f1Input;
        this.f2Input = f2Input;
    }

    onRssSelect(value) {
        if (!value) return;

        console.log('Selected RSS ID:', value);
        store.setNestedState('interference.rssId', Number(value));
    }

    resetToDefaultFrequencies() {
        const f1Input = document.getElementById('f1');
        const f2Input = document.getElementById('f2');

        if (f1Input) {
            f1Input.value = this.defaultF1;
            store.setNestedState('interference.f1', this.defaultF1);
        }

        if (f2Input) {
            f2Input.value = this.defaultF2;
            store.setNestedState('interference.f2', this.defaultF2);
        }
    }

    render() {
        const container = document.createElement('div');

        // ============================================================
        // БЛОК 1: Выбор средства мониторинга помех + Выбор объекта защиты
        // ============================================================
        const block1Section = this.createElement('section', { className: 'monitoring-inputs' });

        const headerRss = document.createElement('div');
        headerRss.innerText = 'Выбор средства мониторинга помех:';
        headerRss.className = 'headerSection';

        const rssWrapper = this.createElement('div', { className: 'input-wrapper' });
        const rssLabel = this.createElement('label', { className: 'input-label', for: 'rss-id' }, 'Пост мониторинга:');

        this.rssSelect = document.createElement('select');
        this.rssSelect.id = 'rss-id';
        this.rssSelect.className = 'defaultSelect';

        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Загрузка постов...';
        this.rssSelect.appendChild(loadingOption);

        this.rssSelect.addEventListener('change', (e) => {
            this.onRssSelect(e.target.value);
        });

        rssWrapper.appendChild(rssLabel);
        rssWrapper.appendChild(this.rssSelect);

        // Блок выбора объекта защиты (внутри первого блока)
        const divDefence = document.createElement('div');
        divDefence.className = 'divDefence';

        const labelDefence = document.createElement('label');
        labelDefence.innerText = 'Выбор объекта защиты:';
        labelDefence.className = 'labelDefence';

        this.usgSelect = document.createElement('select');
        this.usgSelect.className = 'defaultSelect';
        this.usgSelect.id = 'usg-select';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Загрузка объектов защиты...';
        this.usgSelect.appendChild(defaultOption);

        this.usgSelect.addEventListener('change', (e) => {
            console.log('USG select changed to:', e.target.value);
            this.onUsgSelect(e.target.value);
        });

        divDefence.appendChild(labelDefence);
        divDefence.appendChild(this.usgSelect);

        // Собираем первый блок
        block1Section.appendChild(headerRss);
        block1Section.appendChild(rssWrapper);
        block1Section.appendChild(divDefence);

        // ============================================================
        // БЛОК 2: Полоса частот мониторинга
        // ============================================================
        const block2Section = this.createElement('section', { className: 'monitoring-inputs' });

        const headerFreq = document.createElement('div');
        headerFreq.innerText = 'Полоса частот мониторинга:';
        headerFreq.className = 'headerSection';

        // Поле начальной частоты (f1)
        const f1Wrapper = this.createElement('div', { className: 'input-wrapper' });
        const f1Label = this.createElement('label', { className: 'input-label', for: 'f1' }, 'Начало полосы частот, МГц:');
        this.f1Input = this.createElement('input', {
            id: 'f1',
            type: 'number',
            className: 'input',
            value: this.state.f1,
            step: '0.5',
            onchange: (e) => {
                const val = Number(e.target.value);
                store.setNestedState('interference.f1', val);
                if (this.usgSelect && this.usgSelect.value) {
                    this.usgSelect.value = '';
                    this.selectedUsgId = null;
                    store.setNestedState('interference.usgId', null);
                }
            }
        });
        f1Wrapper.appendChild(f1Label);
        f1Wrapper.appendChild(this.f1Input);

        // Поле конечной частоты (f2)
        const f2Wrapper = this.createElement('div', { className: 'input-wrapper' });
        const f2Label = this.createElement('label', { className: 'input-label', for: 'f2' }, 'Конец полосы частот, МГц:');
        this.f2Input = this.createElement('input', {
            id: 'f2',
            type: 'number',
            className: 'input',
            value: this.state.f2,
            step: '0.5',
            onchange: (e) => {
                const val = Number(e.target.value);
                store.setNestedState('interference.f2', val);
                if (this.usgSelect && this.usgSelect.value) {
                    this.usgSelect.value = '';
                    this.selectedUsgId = null;
                    store.setNestedState('interference.usgId', null);
                }
            }
        });
        f2Wrapper.appendChild(f2Label);
        f2Wrapper.appendChild(this.f2Input);

        // Контейнер для полей частот
        const freqContainer = document.createElement('div');
        freqContainer.className = 'freq-container';
        freqContainer.appendChild(f1Wrapper);
        freqContainer.appendChild(f2Wrapper);

        block2Section.appendChild(headerFreq);
        block2Section.appendChild(freqContainer);

        // ============================================================
        // СБОРКА ВСЕХ БЛОКОВ
        // ============================================================
        container.appendChild(block1Section);
        container.appendChild(block2Section);

        this.element = container;

        setTimeout(() => {
            this.loadRssList();
            this.loadUsgList();
        }, 100);

        return container;
    }

    onStoreUpdate(state) {
        this.state = state.interference;
        if (this.defaultF1 !== state.interference.f1) {
            this.defaultF1 = state.interference.f1;
        }
        if (this.defaultF2 !== state.interference.f2) {
            this.defaultF2 = state.interference.f2;
        }
    }

    mount() {
        console.log('MonitoringInputs mounted');
        if (this.rssList.length === 0) {
            this.loadRssList();
        }
        if (this.usgList.length === 0) {
            this.loadUsgList();
        }
    }

    unmount() {
        console.log('MonitoringInputs unmounted');
    }
}

export default MonitoringInputs;