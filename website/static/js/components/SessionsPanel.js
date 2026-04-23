// components/SessionsPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import DateTimeRangePanel from './DateTimeRangePanel.js';
import Chart from './Chart.js';

// Импортируем CSS (если используется сборщик)
// import '../css/sessionsPanel.css';

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
        this.chartContainer = null;

        this.dateTimePanel = new DateTimeRangePanel();
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
        const f1 = this.currentSpectrumData.f1;
        const f2 = this.currentSpectrumData.f2;

        if (!spectrumData || spectrumData.length === 0) {
            return;
        }

        const chartContainer = this.element?.querySelector('.spectrum-chart-container');
        if (!chartContainer) {
            return;
        }

        chartContainer.innerHTML = '';

        const step = (f2 - f1) / (spectrumData.length - 1);
        const labels = spectrumData.map((_, index) => {
            const freq = f1 + (index * step);
            return freq.toFixed(3);
        });

        const chartConfig = {
            data: {
                labels: labels,
                datasets: [{
                    label: 'Спектрограмма',
                    data: spectrumData,
                    borderColor: '#2196f3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Частота (МГц)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Амплитуда (дБ)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Амплитуда: ${context.raw.toFixed(2)} дБ`;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        };

        try {
            this.chartInstance = new Chart(chartContainer, chartConfig);
        } catch (error) {
            console.error('Error creating chart:', error);
            chartContainer.innerHTML = '<div class="error-message" style="padding:20px;text-align:center;">Ошибка создания графика</div>';
        }
    }

    destroyChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    onSessionClick(session) {
        console.log('Selected session:', session);

        this.selectedSession = session;
        this.spectrumsList = [];
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;

        this.destroyChart();
        this.updateUI();
        this.loadSpectrumsForSession(session.id);
    }

    onSpectrumClick(spectrum) {
        console.log('Selected spectrum:', spectrum);

        this.selectedSpectrum = spectrum;
        this.currentSpectrumData = null;

        this.destroyChart();
        this.updateUI();
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

    hasNoisesInSession(session) {
        if (session.spectrum_w_noises_cnt > 0) return true;
        if (session.channels_w_noises > 0) return true;
        if (session.noises_cnt > 0) return true;
        return false;
    }

    hasNoisesInSpectrum(spectrum) {
        if (spectrum.channels_w_noises > 0) return true;
        if (spectrum.noises_cnt > 0) return true;

        if (spectrum.noises && Array.isArray(spectrum.noises)) {
            const realNoises = spectrum.noises.filter(noise => {
                return noise.max !== 0 || noise.f1 !== 0 || noise.f2 !== 0;
            });
            if (realNoises.length > 0) return true;
        }

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

    scrollToPanel(panelElement) {
        if (!panelElement) return;

        // Находим скроллируемый контейнер
        const scrollContainer = this.element?.querySelector('.sessions-main-content');

        if (scrollContainer) {
            // Вычисляем позицию элемента относительно скролл-контейнера
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = panelElement.getBoundingClientRect();

            // Вычисляем отступ с учетом sticky-элементов (кнопки навигации)
            const offset = elementRect.top - containerRect.top + scrollContainer.scrollTop - 10; // 10px дополнительный отступ

            scrollContainer.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        } else {
            // Fallback: используем стандартный скролл с отступом для header
            const headerHeight = 100; // Высота header + отступ
            const elementPosition = panelElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    getRowClassName(hasNoises, isSelected) {
        if (isSelected) return 'row-selected';
        return hasNoises ? 'row-noises' : 'row-clean';
    }

    renderNavigationButtons() {
        const navContainer = this.createElement('div', { className: 'sessions-nav-buttons' });

        const buttons = [
            { id: 'tasks-list', label: 'Список задач' },
            { id: 'spectro-list', label: 'Список спектрограмм' },
            { id: 'detail-spectro-list', label: 'Детали спектрограммы' }
        ];

        buttons.forEach(btn => {
            const button = this.createElement('button', {
                className: 'nav-btn',
                onclick: () => {
                    const panel = this.element?.querySelector(`#${btn.id}`);
                    this.scrollToPanel(panel);
                }
            }, btn.label);
            navContainer.appendChild(button);
        });

        return navContainer;
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

        const headers = ['ID', 'Начало', 'Конец', 'f1 (МГц)', 'f2 (МГц)', 'Измерений', 'С помехами', 'Без помех', 'Каналов', 'Подавлено'];

        headers.forEach(headerText => {
            const th = this.createElement('th', {}, headerText);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = this.createElement('tbody');

        this.sessions.forEach(session => {
            const isSelected = this.selectedSession && this.selectedSession.id === session.id;
            const hasNoises = this.hasNoisesInSession(session);
            const rowClassName = this.getRowClassName(hasNoises, isSelected);

            const row = this.createElement('tr', {
                className: rowClassName,
                onclick: () => this.onSessionClick(session)
            });

            const cells = [
                session.id,
                this.formatDateTime(session.dt_from),
                this.formatDateTime(session.dt_to),
                this.formatNumber(session.f1),
                this.formatNumber(session.f2),
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

    renderSpectrumsList() {
        if (this.isLoadingSpectrums) {
            return this.createElement('div', { className: 'loading-message' }, 'Загрузка спектрограмм...');
        }

        if (!this.selectedSession) {
            return this.createElement('div', { className: 'empty-message' }, 'Выберите задачу для просмотра спектрограмм');
        }

        if (!this.spectrumsList || this.spectrumsList.length === 0) {
            return this.createElement('div', { className: 'empty-message' }, 'Нет спектрограмм для выбранной задачи');
        }

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
            const isSelected = this.selectedSpectrum && this.selectedSpectrum.id === spectrum.id;
            const hasNoises = this.hasNoisesInSpectrum(spectrum);
            const rowClassName = this.getRowClassName(hasNoises, isSelected);

            const row = this.createElement('tr', {
                className: rowClassName,
                onclick: () => this.onSpectrumClick(spectrum)
            });

            const cells = [
                spectrum.id,
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

    renderSpectrumDetails() {
        if (this.isLoadingSpectrum) {
            return this.createElement('div', { className: 'loading-message' }, 'Загрузка спектрограммы...');
        }

        if (!this.selectedSpectrum) {
            return this.createElement('div', { className: 'empty-message' }, 'Выберите спектрограмму для просмотра');
        }

        if (!this.currentSpectrumData) {
            return this.createElement('div', { className: 'empty-message' }, 'Данные спектрограммы не загружены');
        }

        const data = this.currentSpectrumData;
        const usefulSignals = this.getUsefulSignals(data);
        const realNoises = this.getRealNoises(data.noises);

        const container = this.createElement('div', { className: 'spectrum-details' });

        let detailsHtml = `
            <div style="margin-bottom: 15px;">
                <h4>Данные спектрограммы</h4>
                <table class="spectrum-details-table">
                    <tr><td><strong>Начало полосы (f1):</strong></td><td>${this.formatNumber(data.f1)} МГц</td></tr>
                    <tr><td><strong>Конец полосы (f2):</strong></td><td>${this.formatNumber(data.f2)} МГц</td></tr>
                    <tr><td><strong>Уровень шума:</strong></td><td>${this.formatNumber(data.noise_level)} дБ</td></tr>
                    <tr><td><strong>Порог обнаружения:</strong></td><td>${this.formatNumber(data.threshold)} дБ</td></tr>
                </table>
            </div>
            <div>
                <h4>Спектрограмма</h4>
                <div class="spectrum-chart-container" style="height: 300px; width: 100%; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;"></div>
            </div>
        `;

        if (usefulSignals && usefulSignals.length > 0) {
            detailsHtml += `
                <div class="signals-section">
                    <h5>Полезные сигналы (${usefulSignals.length})</h5>
                    <div class="scrollable-table">
                        <table class="signals-table">
                            <thead><tr><th>f1 (МГц)</th><th>f2 (МГц)</th><th>max (дБ)</th></tr></thead>
                            <tbody>
                                ${usefulSignals.map(signal => `
                                    <tr>
                                        <td>${this.formatNumber(signal.f1)}</td>
                                        <td>${this.formatNumber(signal.f2)}</td>
                                        <td>${this.formatNumber(signal.max)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (realNoises && realNoises.length > 0) {
            detailsHtml += `
                <div class="noises-section">
                    <h5>Помехи (${realNoises.length})</h5>
                    <div class="scrollable-table">
                        <table class="noises-table">
                            <thead><tr><th>f1 (МГц)</th><th>f2 (МГц)</th><th>max (дБ)</th></tr></thead>
                            <tbody>
                                ${realNoises.map(noise => `
                                    <tr>
                                        <td>${this.formatNumber(noise.f1)}</td>
                                        <td>${this.formatNumber(noise.f2)}</td>
                                        <td>${this.formatNumber(noise.max)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        container.innerHTML = detailsHtml;
        return container;
    }

    updateUI() {
        const sessionsContainer = this.element?.querySelector('#tasks-list .sessions-list-container');
        const spectrumsContainer = this.element?.querySelector('#spectro-list .spectrums-list-container');
        const detailsContainer = this.element?.querySelector('#detail-spectro-list .spectrum-details-container');

        if (sessionsContainer) {
            sessionsContainer.innerHTML = '';
            sessionsContainer.appendChild(this.renderSessionsList());
        }

        if (spectrumsContainer) {
            spectrumsContainer.innerHTML = '';
            spectrumsContainer.appendChild(this.renderSpectrumsList());
        }

        if (detailsContainer) {
            detailsContainer.innerHTML = '';
            detailsContainer.appendChild(this.renderSpectrumDetails());

            if (this.currentSpectrumData && this.currentSpectrumData.spectrum) {
                setTimeout(() => {
                    this.createChart();
                }, 100);
            }
        }
    }

    render() {
        const container = this.createElement('div', { className: 'sessions-panel' });

        const title = this.createElement('h2', {}, 'Результаты задач');
        container.appendChild(title);

        const datePanel = this.dateTimePanel.render();
        datePanel.style.marginBottom = '15px';
        container.appendChild(datePanel);

        const navButtons = this.renderNavigationButtons();
        container.appendChild(navButtons);

        const loadButton = this.createElement('button', {
            className: 'load-sessions-btn',
            onclick: () => this.loadSessions(),
        }, this.isLoadingSessions ? 'Загрузка...' : 'Загрузить задачи');
        container.appendChild(loadButton);

        const mainContent = this.createElement('div', { className: 'sessions-main-content' });

        // Панель 1: Список задач
        const panel1 = this.createElement('div', { id: 'tasks-list', className: 'sessions-panel-card' });
        panel1.appendChild(this.createElement('h3', {}, 'Список задач'));
        const sessionsContainer = this.createElement('div', { className: 'sessions-list-container' });
        panel1.appendChild(sessionsContainer);

        // Панель 2: Список спектрограмм
        const panel2 = this.createElement('div', { id: 'spectro-list', className: 'sessions-panel-card' });
        panel2.appendChild(this.createElement('h3', {}, 'Спектрограммы'));
        const spectrumsContainer = this.createElement('div', { className: 'spectrums-list-container' });
        panel2.appendChild(spectrumsContainer);

        // Панель 3: Детали спектрограммы
        const panel3 = this.createElement('div', { id: 'detail-spectro-list', className: 'sessions-panel-card' });
        panel3.appendChild(this.createElement('h3', {}, 'Детали спектрограммы'));
        const detailsContainer = this.createElement('div', { className: 'spectrum-details-container' });
        panel3.appendChild(detailsContainer);

        mainContent.appendChild(panel1);
        mainContent.appendChild(panel2);
        mainContent.appendChild(panel3);
        container.appendChild(mainContent);

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
        if (window.app?.store) {
            this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
        }
        setTimeout(() => {
            this.loadSessions();
        }, 100);
    }

    unmount() {
        this.destroyChart();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default SessionsPanel;