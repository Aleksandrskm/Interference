// components/SessionsPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import DateTimeRangePanel from './DateTimeRangePanel.js';
import Chart from './Chart.js';

class SessionsPanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        // Состояние компонента
        this.sessions = [];
        this.selectedSession = null;
        this.spectrumsList = [];
        this.selectedSpectrum = null;
        this.currentSpectrumData = null;

        this.isLoadingSessions = false;
        this.isLoadingSpectrums = false;
        this.isLoadingSpectrum = false;

        this.error = null;

        // Для графика
        this.chartInstance = null;
        this.chartContainer = null;

        // Панель даты/времени
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

            // Проверяем структуру ответа
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
                scales: {
                    x: {
                        title: {
                            text: 'Частота (МГц)'
                        }
                    },
                    y: {
                        title: {
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
            chartContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Ошибка создания графика</div>';
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

    renderSessionsList() {
        if (this.isLoadingSessions) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#666' }
            }, 'Загрузка задач...');
        }

        if (this.error) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#f44336' }
            }, `Ошибка: ${this.error}`);
        }

        if (!this.sessions || this.sessions.length === 0) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#999' }
            }, 'Нет решенных задач за выбранный период');
        }

        const container = this.createElement('div', { className: 'sessions-list' });

        this.sessions.forEach(session => {
            const isSelected = this.selectedSession && this.selectedSession.id === session.id;

            const sessionDiv = this.createElement('div', {
                className: `session-item ${isSelected ? 'session-item-selected' : ''}`,
                style: {
                    padding: '12px',
                    margin: '8px 0',
                    border: isSelected ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#e3f2fd' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                },
                onclick: () => this.onSessionClick(session)
            });

            // Русские заголовки, данные как в API
            sessionDiv.innerHTML = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #1976d2; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">
                     Задача ID: ${session.id}
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 12px;">
                    <div><strong> Дата начала:</strong><br>${this.formatDateTime(session.dt_from)}</div>
                    <div><strong> Дата окончания:</strong><br>${this.formatDateTime(session.dt_to)}</div>
                    <div><strong> Начало диапазона (f1):</strong><br>${session.f1?.toFixed(2) || session.f1 || '—'} МГц</div>
                    <div><strong> Конец диапазона (f2):</strong><br>${session.f2?.toFixed(2) || session.f2 || '—'} МГц</div>
                    <div><strong> Объект защиты:</strong><br>${session.usg || '—'}</div>
                    <div><strong> Устройство:</strong><br>${session.device || '—'}</div>
                    <div><strong> Количество измерений:</strong><br>${session.spectrum_cnt || 0}</div>
                    <div><strong>️ Измерений с помехами:</strong><br>${session.spectrum_w_noises_cnt || 0}</div>
                    <div><strong> Измерений без помех:</strong><br>${session.spectrum_wo_noises_cnt || 0}</div>
                    <div><strong> Количество сигналов:</strong><br>${session.channels_cnt || 0}</div>
                    <div><strong> Подавленных сигналов:</strong><br>${session.suppressed_cnt || 0}</div>
                </div>
            `;

            container.appendChild(sessionDiv);
        });

        return container;
    }

    renderSpectrumsList() {
        if (this.isLoadingSpectrums) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#666' }
            }, 'Загрузка спектрограмм...');
        }

        if (!this.selectedSession) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#999' }
            }, 'Выберите задачу для просмотра спектрограмм');
        }

        if (!this.spectrumsList || this.spectrumsList.length === 0) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#999' }
            }, 'Нет спектрограмм для выбранной задачи');
        }

        const container = this.createElement('div', { className: 'spectrums-list' });

        const title = this.createElement('h4', {
            style: { margin: '15px 0 10px 0', color: '#333', fontSize: '14px', fontWeight: 'bold' }
        }, `Спектрограммы (${this.spectrumsList.length}):`);

        container.appendChild(title);

        this.spectrumsList.forEach(spectrum => {
            const isSelected = this.selectedSpectrum && this.selectedSpectrum.id === spectrum.id;

            const spectrumDiv = this.createElement('div', {
                className: `spectrum-item ${isSelected ? 'spectrum-item-selected' : ''}`,
                style: {
                    padding: '10px',
                    margin: '6px 0',
                    border: isSelected ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#e3f2fd' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                },
                onclick: () => this.onSpectrumClick(spectrum)
            });

            spectrumDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="font-weight: bold; color: #2196f3;">ID спектрограммы: ${spectrum.id}</div>
                    <div style="font-size: 11px; color: #999;"> Дата: ${this.formatDateTime(spectrum.dt)}</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 11px;">
                    <div><strong>️ С помехами :</strong> ${spectrum?.channels_w_noises || 0}</div>
                    <div><strong> Без помех:</strong> ${spectrum?.channels_wo_noises || 0}</div>
                    <div><strong> Сигналов:</strong> ${spectrum?.channels_cnt || 0}</div>
                </div>
            `;

            container.appendChild(spectrumDiv);
        });

        return container;
    }

    renderSpectrumDetails() {
        if (this.isLoadingSpectrum) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#666' }
            }, 'Загрузка спектрограммы...');
        }

        if (!this.selectedSpectrum) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#999' }
            }, 'Выберите спектрограмму для просмотра');
        }

        if (!this.currentSpectrumData) {
            return this.createElement('div', {
                style: { padding: '20px', textAlign: 'center', color: '#999' }
            }, 'Данные спектрограммы не загружены');
        }

        const data = this.currentSpectrumData;

        const container = this.createElement('div', {
            style: { padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }
        });

        let detailsHtml = `
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #333;">Данные спектрограммы</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px;">
                    <div><strong> Начало полосы (f1):</strong><br>${(data.f1)?.toFixed(2) || data.f1 || '—'} МГц</div>
                    <div><strong> Конец полосы (f2):</strong><br>${(data.f2)?.toFixed(2) || data.f2 || '—'} МГц</div>
                    <div><strong> Уровень шума:</strong><br>${data.noise_level?.toFixed(2) || '—'} дБ</div>
                    <div><strong> Порог обнаружения:</strong><br>${data.threshold?.toFixed(2) || '—'} дБ</div>
                    <div><strong> Сигналов под помехами:</strong><br>${data.channels_w_noises || 0}</div>
                </div>
            </div>
        `;

        detailsHtml += `
            <div style="margin-top: 15px;">
                <h5 style="margin: 0 0 10px 0; color: #333;">Спектрограмма (spectrum)</h5>
                <div class="spectrum-chart-container" style="height: 300px; width: 100%; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;"></div>
            </div>
        `;

        if (data.channels && data.channels.length > 0) {
            detailsHtml += `
                <div style="margin-bottom: 15px; margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 6px;">
                    <h5 style="margin: 0 0 8px 0; color: #2e7d32;">Полезные сигналы - ${data.channels.length}</h5>
                    <div style="max-height: 150px; overflow-y: auto; font-size: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead><tr><th style="padding: 4px;">f1 (МГц)</th><th style="padding: 4px;">f2 (МГц)</th><th style="padding: 4px;">max (дБ)</th></tr></thead>
                            <tbody>
                                ${data.channels.map(ch => `<tr><td style="padding: 4px;">${ch.f1?.toFixed(2)}</td><td style="padding: 4px;">${ch.f2?.toFixed(2)}</td><td style="padding: 4px;">${ch.max?.toFixed(2)}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (data.useful_signals && data.useful_signals.length > 0) {
            detailsHtml += `
                <div style="margin-bottom: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 6px;">
                    <h5 style="margin: 0 0 8px 0; color: #1565c0;">Маски полезных сигналов : ${data.useful_signals.length}</h5>
                    <div style="max-height: 150px; overflow-y: auto; font-size: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead><tr><th style="padding: 4px;">f1 (МГц)</th><th style="padding: 4px;">f2 (МГц)</th><th style="padding: 4px;">max (дБ)</th></tr></thead>
                            <tbody>
                                ${data.useful_signals.map(sig => `<tr><td style="padding: 4px;">${sig.f1?.toFixed(2)}</td><td style="padding: 4px;">${sig.f2?.toFixed(2)}</td><td style="padding: 4px;">${sig.max?.toFixed(2)}</td></tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (data.noises && data.noises.length > 0) {
            detailsHtml += `
                <div style="margin-bottom: 15px; padding: 10px; background-color: #ffebee; border-radius: 6px;">
                    <h5 style="margin: 0 0 8px 0; color: #c62828;">Помехи : ${data.noises.length}</h5>
                    <div style="max-height: 150px; overflow-y: auto; font-size: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead><tr><th style="padding: 4px;">f1 (МГц)</th><th style="padding: 4px;">f2 (МГц)</th><th style="padding: 4px;">max (дБ)</th></tr></thead>
                            <tbody>
                                ${data.noises.map(noise => `<tr><td style="padding: 4px;">${noise.f1?.toFixed(2)}</td><td style="padding: 4px;">${noise.f2?.toFixed(2)}</td><td style="padding: 4px;">${noise.max?.toFixed(2)}</td></tr>`).join('')}
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
        const sessionsContainer = this.element?.querySelector('.sessions-list-container');
        const spectrumsContainer = this.element?.querySelector('.spectrums-list-container');
        const detailsContainer = this.element?.querySelector('.spectrum-details-container');

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
        const container = this.createElement('div', {
            className: 'sessions-panel',
            style: {
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 100px)',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                width: '100%',
            }
        });

        const title = this.createElement('h2', {
            style: { margin: '0 0 15px 0', fontSize: '20px', color: '#333' }
        }, 'Решенные задачи');
        container.appendChild(title);

        const datePanel = this.dateTimePanel.render();
        datePanel.style.marginBottom = '15px';
        container.appendChild(datePanel);

        const loadButton = this.createElement('button', {
            style: {
                padding: '10px 20px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '20px'
            },
            onclick: () => this.loadSessions()
        }, this.isLoadingSessions ? 'Загрузка...' : 'Загрузить задачи');
        container.appendChild(loadButton);

        // Три панели в колонку (вертикальное расположение)
        const mainContent = this.createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: '20px',
                overflow: 'auto',
                minHeight: 0
            }
        });

        // Панель 1: Список задач (верхняя)
        const panel1 = this.createElement('div', {
            style: {
                flex: '0 0 33%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#fafafa',
                minHeight: '42vh',
            }
        });
        panel1.appendChild(this.createElement('h3', {
            style: { margin: '0 0 10px 0', fontSize: '16px', color: '#555' }
        }, 'Список задач'));
        const sessionsContainer = this.createElement('div', {
            className: 'sessions-list-container',
            style: { flex: 1, overflowY: 'auto' }
        });
        panel1.appendChild(sessionsContainer);

        // Панель 2: Список спектрограмм (средняя)
        const panel2 = this.createElement('div', {
            style: {
                flex: '0 0 25%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#fafafa',
                minHeight: '34vh',
            }
        });
        panel2.appendChild(this.createElement('h3', {
            style: { margin: '0 0 10px 0', fontSize: '16px', color: '#555' }
        }, 'Спектрограммы'));
        const spectrumsContainer = this.createElement('div', {
            className: 'spectrums-list-container',
            style: { flex: 1, overflowY: 'auto' }
        });
        panel2.appendChild(spectrumsContainer);

        // Панель 3: Детали спектрограммы (нижняя)
        const panel3 = this.createElement('div', {
            style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#fafafa',
                minHeight: '50vh',
            }
        });
        panel3.appendChild(this.createElement('h3', {
            style: { margin: '0 0 10px 0', fontSize: '16px', color: '#555' }
        }, 'Детали спектрограммы'));
        const detailsContainer = this.createElement('div', {
            className: 'spectrum-details-container',
            style: { flex: 1, overflowY: 'auto' }
        });
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
        if (state.currentPage !== '/sessions') {
            return;
        }
    }

    mount() {
        console.log('SessionsPanel mounted');
        if (window.app?.store) {
            this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
        }
    }

    unmount() {
        this.destroyChart();
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default SessionsPanel;