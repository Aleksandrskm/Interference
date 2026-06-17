// components/SessionsPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import DateTimeRangePanel from './DateTimeRangePanel.js';
import Chart from './Chart.js';
import SpectrumChart from './SpectrumChart.js';
import { dbmToDbMkvM, dbMkvMToDbm, dbmArrayToDbMkvM, dbMkvMArrayToDbm } from '../utils/unitConverters.js';

class SessionsPanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        this.sessions = [];
        this.selectedSession = null;
        this.spectrumsList = [];
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;

        this.isLoadingSessions = false;
        this.isLoadingSpectrums = false;
        this.isLoadingSpectrum = false;

        this.error = null;

        this.chartInstance = null;

        // Состояние модальных окон
        this.modalState = {
            spectrumsModal: false,
            detailsModal: false
        };

        // Соответствие ID РСС и наименований
        this.rssMap = {
            1: 'Мурманск',
            2: 'Евпатория',
            3: 'Новосибирск',
            4: 'Хабаровск',
            5: 'Магадан'
        };
    }

    getRssName(rssId) {
        return this.rssMap[rssId] || `РСС ${rssId}`;
    }

    formatApiDate(date, time) {
        return `${date}T${time}.000+03`;
    }

    async loadSessions() {
        const state = store.getState();
        const { startDate, endDate, startTime, endTime } = state.dateRange;

        if (!startDate || !endDate || !startTime || !endTime) {
            this.error = 'Заполните дату и время';
            this.updateUI();
            return;
        }

        const formattedStartDate = this.formatApiDate(startDate, startTime);
        const formattedEndDate = this.formatApiDate(endDate, endTime);

        this.isLoadingSessions = true;
        this.error = null;
        this.sessions = [];
        this.selectedSession = null;
        this.spectrumsList = [];
        this.currentSpectrumData = null;

        this.updateUI();

        try {
            console.log('Loading sessions:', { dt_from: formattedStartDate, dt_to: formattedEndDate });

            const response = await dbApi.getSessions({
                dt_from: formattedStartDate,
                dt_to: formattedEndDate
            });

            console.log('Raw API response:', response);

            if (Array.isArray(response)) {
                this.sessions = response;
            } else if (response && response.sessions && Array.isArray(response.sessions)) {
                this.sessions = response.sessions;
            } else if (response && response.data && Array.isArray(response.data)) {
                this.sessions = response.data;
            } else if (response && response.items && Array.isArray(response.items)) {
                this.sessions = response.items;
            } else {
                this.sessions = [];
                console.warn('Unexpected response format:', response);
            }

            console.log('Parsed sessions count:', this.sessions.length);
            this.isLoadingSessions = false;
            this.updateUI();

        } catch (err) {
            console.error('Error loading sessions:', err);
            this.error = err.message || 'Ошибка загрузки задач';
            this.isLoadingSessions = false;
            this.updateUI();
        }
    }

    async loadSpectrumsForSession(sessionId) {
        if (!sessionId) return;

        this.isLoadingSpectrums = true;
        this.spectrumsList = [];
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;

        this.destroyChart();
        this.updateUI();

        try {
            console.log('Loading spectrums for session:', sessionId);

            const response = await dbApi.getSpectrumsByTaskId({ task_id: sessionId });

            console.log('Raw spectrums response:', response);

            if (Array.isArray(response)) {
                this.spectrumsList = response;
            } else if (response && response.spectrums && Array.isArray(response.spectrums)) {
                this.spectrumsList = response.spectrums;
            } else if (response && response.data && Array.isArray(response.data)) {
                this.spectrumsList = response.data;
            } else {
                this.spectrumsList = [];
            }

            console.log('Parsed spectrums count:', this.spectrumsList.length);
            this.isLoadingSpectrums = false;

            this.modalState.spectrumsModal = true;
            this.updateUI();

        } catch (err) {
            console.error('Error loading spectrums:', err);
            this.error = err.message || 'Ошибка загрузки спектрограмм';
            this.isLoadingSpectrums = false;
            this.updateUI();
        }
    }

    async loadSpectrumById(spectrumId) {
        if (!spectrumId) return;

        this.isLoadingSpectrum = true;
        this.currentSpectrumData = null;

        this.destroyChart();
        this.updateUI();

        try {
            console.log('Loading spectrum by ID:', spectrumId);

            const response = await dbApi.getSpectrumById({ spectrum_id: spectrumId });

            console.log('Raw spectrum response:', response);

            if (response && typeof response === 'object') {
                this.currentSpectrumData = response;
            } else {
                this.currentSpectrumData = null;
            }

            this.isLoadingSpectrum = false;

            this.modalState.detailsModal = true;
            this.updateUI();

            setTimeout(() => {
                this.createChart();
            }, 100);

        } catch (err) {
            console.error('Error loading spectrum:', err);
            this.error = err.message || 'Ошибка загрузки спектрограммы';
            this.isLoadingSpectrum = false;
            this.updateUI();
        }
    }

    createChart() {
        if (!this.currentSpectrumData || !this.currentSpectrumData.spectrum) {
            return;
        }

        const spectrumData = this.currentSpectrumData.spectrum;
        let f1 = this.currentSpectrumData.f1;
        let f2 = this.currentSpectrumData.f2;

        if (f1 > 1e6) f1 = f1 / 1e6;
        if (f2 > 1e6) f2 = f2 / 1e6;

        const chartContainer = this.element?.querySelector('.spectrum-chart-container');
        if (!chartContainer) return;

        chartContainer.innerHTML = '';

        const chartConfig = {
            data: spectrumData,
            f1MHz: f1,
            f2MHz: f2,
            threshold: this.currentSpectrumData.threshold,
            usefulSignals: this.getUsefulSignals(this.currentSpectrumData),
            noises: this.getRealNoises(this.currentSpectrumData.noises)
        };

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new SpectrumChart(chartContainer, chartConfig);
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    closeModal(modalName) {
        this.modalState[modalName] = false;
        this.updateUI();
    }

    closeSpectrumsModal() {
        this.modalState.spectrumsModal = false;
        this.modalState.detailsModal = false;
        this.selectedSession = null;
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;
        this.spectrumsList = [];
        this.destroyChart();
        this.updateUI();
    }

    closeDetailsModal() {
        this.modalState.detailsModal = false;
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;
        this.destroyChart();
        this.updateUI();
    }

    onSessionClick(session) {
        console.log('Selected session:', session);
        this.selectedSession = session;
        this.loadSpectrumsForSession(session.id);
    }

    onSpectrumClick(spectrum) {
        console.log('Selected spectrum:', spectrum);
        this.selectedSpectrum = spectrum;
        this.loadSpectrumById(spectrum.id);
    }

    formatDateTime(dtString) {
        if (!dtString) return '—';
        try {
            const date = new Date(dtString);
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return dtString;
        }
    }

    formatNumber(value, decimals = 2) {
        if (value === undefined || value === null || isNaN(value)) return '';
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return '';
        return num.toFixed(decimals);
    }

    /**
     * Конвертирует значение из dBm в dB(мкВ/м) с учетом частоты
     */
    convertDbmToDbMkvM(dbm, freqMhz) {
        if (dbm === undefined || dbm === null || isNaN(dbm)) return '';
        if (freqMhz === undefined || freqMhz === null || isNaN(freqMhz) || freqMhz === 0) return '';
        try {
            return dbmToDbMkvM(dbm, freqMhz);
        } catch (e) {
            return '';
        }
    }

    hasNoisesInSession(session) {
        if (session.spectrum_w_noises_cnt > 0) return true;
        if (session.channels_w_noises > 0) return true;
        return false;
    }

    hasNoisesInSpectrum(spectrum) {
        if (spectrum.channels_w_noises > 0) return true;
        return false;
    }

    getRealNoises(noisesArray) {
        if (!noisesArray || !Array.isArray(noisesArray)) return [];
        return noisesArray.filter(noise => {
            return !(noise.max === 0 && noise.f1 === 0 && noise.f2 === 0);
        });
    }

    getUsefulSignals(data) {
        return data.useful_signals || data.channels || [];
    }

    renderSpectrumsModal() {
        const overlay = this.createElement('div', { className: 'modal-overlay' });

        const modal = this.createElement('div', { className: 'modal-content spectrums-modal' });

        const modalHeader = this.createElement('div', { className: 'modal-header' });

        const backBtn = this.createElement('button', {
            className: 'modal-back-btn',
            onclick: () => this.closeSpectrumsModal()
        });
        backBtn.innerHTML = '← Назад к задачам';

        const headerCenter = this.createElement('div', { className: 'modal-header-center' });

        const title = this.createElement('h3', { className: 'modal-title' }, 'Список спектрограмм');
        headerCenter.appendChild(title);

        if (this.selectedSession) {
            const taskInfo = this.createElement('div', { className: 'task-info' });

            const taskIdSpan = this.createElement('span', {}, `Задача: ${this.selectedSession.id}`);
            taskInfo.appendChild(taskIdSpan);

            if (this.selectedSession.rss_id) {
                const sep3 = this.createElement('span', { className: 'separator' }, '|');
                taskInfo.appendChild(sep3);

                const rssName = this.getRssName(this.selectedSession.rss_id);
                const rssSpan = this.createElement('span', { className: 'rss-info' }, `Пост мониторинга: ${rssName}`);
                taskInfo.appendChild(rssSpan);
            }

            if (this.selectedSession.usg) {
                const sep4 = this.createElement('span', { className: 'separator' }, '|');
                taskInfo.appendChild(sep4);
                const usgSpan = this.createElement('span', {}, `Объект защиты: ${this.selectedSession.usg}`);
                taskInfo.appendChild(usgSpan);
            }

            const sep1 = this.createElement('span', { className: 'separator' }, '|');
            taskInfo.appendChild(sep1);

            const dateSpan = this.createElement('span', {}, `Дата завершения: ${this.formatDateTime(this.selectedSession.dt_to)}`);
            taskInfo.appendChild(dateSpan);

            const sep2 = this.createElement('span', { className: 'separator' }, '|');
            taskInfo.appendChild(sep2);

            const countSpan = this.createElement('span', {}, `Всего спектрограмм: ${this.spectrumsList.length}`);
            taskInfo.appendChild(countSpan);

            headerCenter.appendChild(taskInfo);
        }

        const closeBtn = this.createElement('button', {
            className: 'modal-close-btn',
            onclick: () => this.closeSpectrumsModal()
        });
        closeBtn.innerHTML = '×';

        modalHeader.appendChild(backBtn);
        modalHeader.appendChild(headerCenter);
        modalHeader.appendChild(closeBtn);

        const modalBody = this.createElement('div', { className: 'modal-body' });

        if (this.isLoadingSpectrums) {
            modalBody.appendChild(this.createElement('div', { className: 'loading-message' }, 'Загрузка спектрограмм...'));
        } else if (!this.spectrumsList || this.spectrumsList.length === 0) {
            modalBody.appendChild(this.createElement('div', { className: 'empty-message' }, 'Нет спектрограмм для выбранной задачи'));
        } else {
            const table = this.renderSpectrumsTable();
            modalBody.appendChild(table);
        }

        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        overlay.appendChild(modal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSpectrumsModal();
            }
        });

        return overlay;
    }

    renderSpectrumsTable() {
        const table = this.createElement('table', { className: 'sessions-table' });

        const thead = this.createElement('thead');
        const headerRow = this.createElement('tr');
        const headers = ['ID', 'Дата', 'С помехами', 'Без помех', 'Сигналов'];

        headers.forEach(headerText => {
            const th = this.createElement('th', {}, headerText);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = this.createElement('tbody');

        this.spectrumsList.forEach(spectrum => {
            const hasNoises = this.hasNoisesInSpectrum(spectrum);
            const row = this.createElement('tr', {
                className: hasNoises ? 'row-noises' : 'row-clean',
                onclick: () => this.onSpectrumClick(spectrum)
            });

            const cells = [
                spectrum.id || '—',
                this.formatDateTime(spectrum.dt),
                spectrum.channels_w_noises || 0,
                spectrum.channels_wo_noises || 0,
                spectrum.channels_cnt || 0
            ];

            cells.forEach(cellData => {
                const td = this.createElement('td', {}, String(cellData));
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    }

    renderDetailsModal() {
        const overlay = this.createElement('div', { className: 'modal-overlay details-overlay' });

        const modal = this.createElement('div', { className: 'modal-content details-modal' });

        const modalHeader = this.createElement('div', { className: 'modal-header' });

        const backBtn = this.createElement('button', {
            className: 'modal-back-btn',
            onclick: () => this.closeDetailsModal()
        });
        backBtn.innerHTML = '← Назад к спектрограммам';

        const title = this.createElement('h3', { className: 'modal-title' },
            `Задача: ${this.selectedSession?.id} | Спектрограмма: ${this.selectedSpectrum?.id}`);

        const closeBtn = this.createElement('button', {
            className: 'modal-close-btn',
            onclick: () => this.closeDetailsModal()
        });
        closeBtn.innerHTML = '×';

        modalHeader.appendChild(backBtn);
        modalHeader.appendChild(title);
        modalHeader.appendChild(closeBtn);

        const modalBody = this.createElement('div', { className: 'modal-body' });

        if (this.isLoadingSpectrum) {
            modalBody.appendChild(this.createElement('div', { className: 'loading-message' }, 'Загрузка спектрограммы...'));
        } else if (!this.currentSpectrumData) {
            modalBody.appendChild(this.createElement('div', { className: 'empty-message' }, 'Данные спектрограммы не загружены'));
        } else {
            modalBody.appendChild(this.renderSpectrumDetailsContent());
        }

        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        overlay.appendChild(modal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeDetailsModal();
            }
        });

        return overlay;
    }

    renderSpectrumDetailsContent() {
        const data = this.currentSpectrumData;
        const usefulSignals = this.getUsefulSignals(data);
        const realNoises = this.getRealNoises(data.noises);

        const container = this.createElement('div', { className: 'spectrum-details' });

        const infoTable = this.createElement('table', { className: 'spectrum-details-table' });
        const infoRows = [
            { label: 'Начало полосы (f1):', value: `${this.formatNumber(data.f1)} МГц` },
            { label: 'Конец полосы (f2):', value: `${this.formatNumber(data.f2)} МГц` },
            { label: 'Уровень шума:', value: `${this.formatNumber(data.noise_level)} дБм` },
            { label: 'Порог обнаружения:', value: `${this.formatNumber(data.threshold)} дБм` },
            { label: 'Количество полезных сигналов под помехами:', value: data.channels_w_noises ?? 0 }
        ];

        infoRows.forEach(row => {
            const tr = this.createElement('tr');
            const tdLabel = this.createElement('td', {}, row.label);
            const tdValue = this.createElement('td', {}, String(row.value));
            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            infoTable.appendChild(tr);
        });
        container.appendChild(infoTable);

        const chartSection = this.createElement('div', { className: 'chart-section' });
        const chartTitle = this.createElement('h4', {}, 'Спектрограмма');
        const chartContainer = this.createElement('div', {
            className: 'spectrum-chart-container',
            style: { width: '100%' }
        });
        chartSection.appendChild(chartTitle);
        chartSection.appendChild(chartContainer);
        container.appendChild(chartSection);

        if (usefulSignals && usefulSignals.length > 0) {
            const signalsSection = this.createElement('div', { className: 'signals-section' });

            const signalsTitle = this.createElement('h5', {},
                `Маски полезных сигналов` +
                (this.selectedSession?.usg ? ` | Объект защиты: ${this.selectedSession.usg}` : '')
            );
            signalsSection.appendChild(signalsTitle);

            const signalsCountLabel = this.createElement('div', { className: 'signals-count-label' },
                `Сигналов в маске: ${usefulSignals.length}`
            );
            signalsSection.appendChild(signalsCountLabel);

            const signalsTable = this.renderSignalsTable(usefulSignals);
            signalsSection.appendChild(signalsTable);
            container.appendChild(signalsSection);
        }

        if (realNoises && realNoises.length > 0) {
            const noisesSection = this.createElement('div', { className: 'noises-section' });

            const noisesTitle = this.createElement('h5', {}, `Помехи`);
            noisesSection.appendChild(noisesTitle);

            const noisesCountLabel = this.createElement('div', { className: 'noises-count-label' },
                `Количество помех: ${realNoises.length}`
            );
            noisesSection.appendChild(noisesCountLabel);

            const noisesTable = this.renderNoisesTable(realNoises);
            noisesSection.appendChild(noisesTable);
            container.appendChild(noisesSection);
        }

        return container;
    }

    /**
     * Рендерит таблицу полезных сигналов с 4 колонками (округление до 6 знаков)
     */
    renderSignalsTable(signals) {
        const table = this.createElement('table', { className: 'signals-table' });

        const thead = this.createElement('thead');
        const headerRow = this.createElement('tr');
        ['f1 (МГц)', 'f2 (МГц)', 'max (дБм)', 'max (дБ(мкВ/м))'].forEach(text => {
            const th = this.createElement('th', {}, text);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = this.createElement('tbody');
        signals.forEach(signal => {
            const row = this.createElement('tr');

            const avgFreq = (signal.f1 + signal.f2) / 2;
            const maxDb = signal.max;
            const maxDbMkvM = this.convertDbmToDbMkvM(maxDb, avgFreq);

            // Округление до 6 знаков
            const td1 = this.createElement('td', {}, this.formatNumber(signal.f1, 6));
            const td2 = this.createElement('td', {}, this.formatNumber(signal.f2, 6));
            const td3 = this.createElement('td', {}, this.formatNumber(maxDb, 6));
            const td4 = this.createElement('td', {}, typeof maxDbMkvM === 'string' ? maxDbMkvM : this.formatNumber(maxDbMkvM, 6));

            row.appendChild(td1);
            row.appendChild(td2);
            row.appendChild(td3);
            row.appendChild(td4);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        return table;
    }

    /**
     * Рендерит таблицу помех с 4 колонками (округление до 6 знаков)
     */
    renderNoisesTable(noises) {
        const table = this.createElement('table', { className: 'noises-table' });

        const thead = this.createElement('thead');
        const headerRow = this.createElement('tr');
        ['f1 (МГц)', 'f2 (МГц)', 'max (дБм)', 'max (дБ(мкВ/м))'].forEach(text => {
            const th = this.createElement('th', {}, text);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = this.createElement('tbody');
        noises.forEach(noise => {
            const row = this.createElement('tr');

            const avgFreq = (noise.f1 + noise.f2) / 2;
            const maxDb = noise.max;
            const maxDbMkvM = this.convertDbmToDbMkvM(maxDb, avgFreq);

            // Округление до 6 знаков
            const td1 = this.createElement('td', {}, this.formatNumber(noise.f1, 6));
            const td2 = this.createElement('td', {}, this.formatNumber(noise.f2, 6));
            const td3 = this.createElement('td', {}, this.formatNumber(maxDb, 6));
            const td4 = this.createElement('td', {}, typeof maxDbMkvM === 'string' ? maxDbMkvM : this.formatNumber(maxDbMkvM, 6));

            row.appendChild(td1);
            row.appendChild(td2);
            row.appendChild(td3);
            row.appendChild(td4);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        return table;
    }

    renderSessionsList() {
        if (this.isLoadingSessions) {
            return this.createElement('div', { className: 'loading-message' }, 'Загрузка задач...');
        }

        if (this.error) {
            const errorDiv = this.createElement('div', { className: 'error-message' });
            errorDiv.innerHTML = `Ошибка: ${this.error}`;
            return errorDiv;
        }

        if (!this.sessions || this.sessions.length === 0) {
            return this.createElement('div', { className: 'empty-message' }, 'Нет решенных задач за выбранный период');
        }

        const table = this.createElement('table', { className: 'sessions-table' });

        const thead = this.createElement('thead');
        const headerRow = this.createElement('tr');

        const headers = [
            'ID',
            'РСС',
            'Начало',
            'Конец',
            'f1 (МГц)',
            'f2 (МГц)',
            'Объект',
            'Устройство',
            'Измерений',
            'С помехами',
            'Без помех',
            'Каналов',
            'Подавлено'
        ];

        headers.forEach(headerText => {
            const th = this.createElement('th', {}, headerText);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = this.createElement('tbody');

        this.sessions.forEach(session => {
            const hasNoises = this.hasNoisesInSession(session);
            const row = this.createElement('tr', {
                className: hasNoises ? 'row-noises' : 'row-clean',
                onclick: () => this.onSessionClick(session)
            });

            const cells = [
                session.id || '—',
                session.rss_id || '—',
                this.formatDateTime(session.dt_from),
                this.formatDateTime(session.dt_to),
                this.formatNumber(session.f1),
                this.formatNumber(session.f2),
                session.usg || '—',
                session.device || '—',
                session.spectrum_cnt || 0,
                session.spectrum_w_noises_cnt || 0,
                session.spectrum_wo_noises_cnt || 0,
                session.channels_cnt || 0,
                session.suppressed_cnt || 0
            ];

            cells.forEach(cellData => {
                const td = this.createElement('td', {}, String(cellData));
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    }

    updateUI() {
        const mainContainer = this.element?.querySelector('.sessions-main-container');
        if (!mainContainer) return;

        while (mainContainer.firstChild) {
            mainContainer.removeChild(mainContainer.firstChild);
        }

        if (this.modalState.detailsModal) {
            const modal = this.renderDetailsModal();
            mainContainer.appendChild(modal);
        } else if (this.modalState.spectrumsModal) {
            const modal = this.renderSpectrumsModal();
            mainContainer.appendChild(modal);
        } else {
            const sessionsContainer = this.createElement('div', { className: 'sessions-list-container' });
            sessionsContainer.appendChild(this.renderSessionsList());
            mainContainer.appendChild(sessionsContainer);
        }

        if (this.modalState.detailsModal && this.currentSpectrumData) {
            setTimeout(() => {
                this.createChart();
            }, 100);
        }
    }

    render() {
        const container = this.createElement('div', { className: 'sessions-panel' });

        const title = this.createElement('h2', {}, 'Результаты задач');
        container.appendChild(title);

        const containerBtns = this.createElement('div', { className: 'contaoner-btn' });

        const dateTimePanel = new DateTimeRangePanel();
        const datePanel = dateTimePanel.render();
        datePanel.style.marginBottom = '15px';
        containerBtns.appendChild(datePanel);

        const loadButton = this.createElement('button', {
            className: 'load-sessions-btn',
            onclick: () => this.loadSessions(),
        }, this.isLoadingSessions ? 'Загрузка...' : 'Загрузить задачи');
        containerBtns.appendChild(loadButton);
        container.appendChild(containerBtns);

        this.mainContainer = this.createElement('div', { className: 'sessions-main-container' });
        container.appendChild(this.mainContainer);

        this.element = container;

        setTimeout(() => {
            this.updateUI();
        }, 0);

        return container;
    }

    onStoreUpdate(state) {
        if (state.currentPage !== '/') {
            return;
        }
    }

    mount() {
        console.log('SessionsPanel mounted');

        this.addModalStyles();

        if (window.app?.store) {
            this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
        }

        setTimeout(() => {
            this.loadSessions();
        }, 100);
    }

    addModalStyles() {
        if (document.getElementById('sessions-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'sessions-modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(3px);
                z-index: 1100;
            }
            
            .details-overlay {
                z-index: 1100;
            }
            
            .modal-content {
                background-color: #fff;
                border-radius: 12px;
                width: 90%;
                max-width: 1200px;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            .spectrums-modal,
            .details-modal {
                width: 90%;
                max-width: 1200px;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e0e0e0;
                background-color: #f8f9fa;
                flex-shrink: 0;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .modal-header-center {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
                text-align: center;
            }
            
            .modal-header-center .modal-title {
                margin: 0 0 4px 0;
                font-size: 20px;
                font-weight: 700;
                color: #333;
            }
            
            .task-info {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                justify-content: center;
                font-size: 13px;
                color: #333;
            }
            
            .task-info .separator {
                color: #999;
                font-weight: 300;
            }
            
            .task-info .rss-info {
                font-weight: 500;
                color: #333;
            }
            
            .modal-back-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 14px;
                color: #2196f3;
                padding: 8px 12px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
                flex-shrink: 0;
            }
            
            .modal-back-btn:hover {
                background-color: #e3f2fd;
            }
            
            .modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 500;
                color: #333;
            }
            
            .modal-close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 0 8px;
                transition: color 0.2s;
                flex-shrink: 0;
            }
            
            .modal-close-btn:hover {
                color: #333;
            }
            
            .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            
            .chart-section {
                margin: 20px 0;
            }
            
            .chart-section h4 {
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #333;
            }
            
            .spectrum-chart-container {
                background: #fff;
                border-radius: 6px;
                border: 1px solid black;
                min-height: 300px;
            }
            
            .signals-count-label,
            .noises-count-label {
                font-size: 16px;
                color: black;
                margin: 4px 0 8px 0;
                font-weight: 500;
            }
            
            @media (max-width: 768px) {
                .modal-content {
                    width: 95%;
                    max-height: 90vh;
                }
                
                .modal-header {
                    padding: 12px 16px;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .modal-back-btn {
                    font-size: 12px;
                    padding: 6px 10px;
                }
                
                .modal-title {
                    font-size: 14px;
                }
                
                .task-info {
                    font-size: 12px;
                    gap: 6px;
                }
                
                .modal-body {
                    padding: 15px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    unmount() {
        this.destroyChart();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default SessionsPanel;