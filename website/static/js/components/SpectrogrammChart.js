// components/SpectrogrammChart.js
import { Component } from '../core/component.js';
import Chart from './Chart.js';

class SpectrogrammChart extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.spectrogramm = null;
        this.chart = null;
        this.chartContainer = null;
        this.infoDiv = null;
        this.isUpdating = false;
        this.resizeObserver = null;
        this.updateTimeout = null;
        this.hasValidData = false; // Флаг наличия валидных данных
    }

    render() {
        const container = this.createElement('div', { className: 'spectrogramm-chart' });
        this.chartContainer = this.createElement('div', {
            className: 'chart-container',
            style: { width: '100%', height: '80%', position: 'relative' }
        });

        container.appendChild(this.chartContainer);

        // Информация о данных
        this.infoDiv = this.createElement('div', {
            className: 'spectrogram-info',
            style: {
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
            }
        });

        container.appendChild(this.infoDiv);

        this.element = container;
        return container;
    }

    clearContainer() {
        // Очищаем контейнер от всего, кроме canvas если он есть
        if (!this.chartContainer) return;

        // Сохраняем ссылку на canvas если он существует
        const existingCanvas = this.chartContainer.querySelector('canvas');

        // Очищаем все содержимое
        while (this.chartContainer.firstChild) {
            this.chartContainer.removeChild(this.chartContainer.firstChild);
        }

        // Если был canvas, возвращаем его обратно (но Chart.js создаст новый)
        // Лучше просто очистить и позволить Chart.js создать новый canvas
    }

    updateChart() {
        // Очищаем предыдущий таймаут
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            if (!this.spectrogramm) {
                console.warn('No data to render');
                this.showPlaceholder();
                return;
            }

            // Проверяем, что контейнер существует и в DOM
            if (!this.chartContainer || !this.chartContainer.isConnected) {
                console.warn('Chart container not in DOM');
                return;
            }

            console.log('🎨 Rendering spectrogram with data:', {
                hasF1: this.spectrogramm?.f1 !== undefined,
                hasF2: this.spectrogramm?.f2 !== undefined,
                pointsCount: this.spectrogramm?.points?.length,
                amplitudesCount: this.spectrogramm?.amplitudes?.length
            });

            // Преобразуем данные в формат для Chart.js
            const chartData = this.prepareChartData();

            if (!chartData || !chartData.labels || chartData.labels.length === 0) {
                console.warn('Could not prepare chart data');
                this.showPlaceholder();
                return;
            }

            // Конфигурация графика
            const config = {
                data: chartData,
                options: {
                    scales: {
                        x: {
                            title: {
                                text: 'Частота (МГц)',
                                display: true
                            }
                        },
                        y: {
                            title: {
                                text: 'Амплитуда (dBm)',
                                display: true
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Амплитуда: ${context.raw.toFixed(2)} dBm`;
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
                // Если есть старый график, уничтожаем его
                if (this.chart) {
                    this.chart.destroy();
                    this.chart = null;
                }

                // Очищаем контейнер перед созданием нового графика
                this.clearContainer();

                // Создаем новый график
                this.chart = new Chart(this.chartContainer, config);
                this.hasValidData = true;

                console.log('✅ Chart created successfully');
            } catch (error) {
                console.error('Error creating/updating chart:', error);
                this.showPlaceholder();
                return;
            }

            // Обновляем информационную панель
            this.updateInfoPanel();
        }, 50);
    }

    prepareChartData() {
        let frequencies = [];
        let amplitudes = [];

        // Формат 1: готовые массивы frequencies и amplitudes
        if (this.spectrogramm.frequencies && this.spectrogramm.amplitudes) {
            frequencies = this.spectrogramm.frequencies;
            amplitudes = this.spectrogramm.amplitudes;
            console.log(`Format 1: ${frequencies.length} frequencies, ${amplitudes.length} amplitudes`);
        }
        // Формат 2: f1, f2, points (основной формат)
        else if (this.spectrogramm.f1 !== undefined &&
            this.spectrogramm.f2 !== undefined &&
            this.spectrogramm.points) {

            const f1 = this.spectrogramm.f1;
            const f2 = this.spectrogramm.f2;
            const points = this.spectrogramm.points;
            const pointsCnt = this.spectrogramm.points_cnt || points.length;

            // Создаем массив частот в МГц для отображения
            frequencies = [];
            for (let i = 0; i < pointsCnt; i++) {
                const freq = f1 + (f2 - f1) * (i / (pointsCnt - 1));
                frequencies.push(freq / 1e6); // Конвертируем в МГц
            }
            amplitudes = points;

            console.log(`Format 2: ${frequencies.length} points from ${f1/1e6} to ${f2/1e6} MHz`);
        }
        // Формат 3: массив data
        else if (this.spectrogramm.data && Array.isArray(this.spectrogramm.data)) {
            if (this.spectrogramm.data.length > 0 && Array.isArray(this.spectrogramm.data[0])) {
                // 2D массив для водопада - пока не поддерживается
                console.warn('Waterfall data not supported by Chart.js yet');
                return null;
            } else {
                // 1D массив амплитуд
                amplitudes = this.spectrogramm.data;
                frequencies = amplitudes.map((_, i) => i);
                console.log(`Format 3: ${amplitudes.length} amplitude points`);
            }
        } else {
            console.warn('Unknown data format:', Object.keys(this.spectrogramm));
            return null;
        }

        if (!amplitudes || amplitudes.length === 0) {
            console.warn('No amplitude data');
            return null;
        }

        // Проверяем, что частоты соответствуют амплитудам
        if (frequencies.length !== amplitudes.length) {
            console.warn('Frequencies and amplitudes length mismatch:', frequencies.length, amplitudes.length);
            // Создаем индексы как частоты
            frequencies = amplitudes.map((_, i) => i);
        }

        // Форматируем частоты для отображения (округляем до 2 знаков)
        const labels = frequencies.map(f => typeof f === 'number' ? f.toFixed(2) : String(f));

        // Возвращаем данные в формате Chart.js
        return {
            labels: labels,
            datasets: [{
                label: 'Амплитуда (dBm)',
                data: amplitudes,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true
            }]
        };
    }

    updateInfoPanel() {
        if (!this.spectrogramm || !this.infoDiv) return;

        const info = [];

        // Информация о диапазоне
        if (this.spectrogramm.f1 !== undefined && this.spectrogramm.f2 !== undefined) {
            const f1 = this.spectrogramm.f1 / 1e6;
            const f2 = this.spectrogramm.f2 / 1e6;
            info.push(`Диапазон: ${f1.toFixed(2)} - ${f2.toFixed(2)} МГц`);
        }

        // Информация о точках
        let points = null;
        if (this.spectrogramm.points) {
            points = this.spectrogramm.points;
        } else if (this.spectrogramm.amplitudes) {
            points = this.spectrogramm.amplitudes;
        } else if (this.spectrogramm.data && Array.isArray(this.spectrogramm.data)) {
            points = this.spectrogramm.data;
        }

        if (points && points.length > 0) {
            info.push(`Точек: ${points.length}`);
            const min = Math.min(...points);
            const max = Math.max(...points);
            const avg = points.reduce((a, b) => a + b, 0) / points.length;
            info.push(` Уровень: min=${min.toFixed(2)} dBm, max=${max.toFixed(2)} dBm, avg=${avg.toFixed(2)} dBm`);
        }

        // Информация о времени
        if (this.spectrogramm.timestamp) {
            info.push(`${new Date(this.spectrogramm.timestamp).toLocaleString()}`);
        }

        this.infoDiv.innerHTML = info.join(' • ');
        if (info.length === 0) {
            this.infoDiv.innerHTML = 'Данные загружены';
        }
    }

    showPlaceholder() {
        if (!this.chartContainer) return;

        // Уничтожаем график если он есть
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        this.hasValidData = false;

        // Очищаем контейнер
        while (this.chartContainer.firstChild) {
            this.chartContainer.removeChild(this.chartContainer.firstChild);
        }

        // Создаем placeholder
        const placeholder = this.createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#6c757d',
                fontSize: '14px'
            }
        }, 'Нет данных для отображения. Нажмите "Получить спектрограмму"');

        this.chartContainer.appendChild(placeholder);

        // Обновляем информационную панель
        if (this.infoDiv) {
            this.infoDiv.innerHTML = 'Нет данных для отображения. Нажмите "Получить спектрограмму"';
        }
    }

    onStoreUpdate(state) {
        // Проверяем, что мы на странице спектрограммы
        if (state.currentPage !== '/spectrogram') {
            return;
        }

        if (this.isUpdating) return;

        this.isUpdating = true;

        const newData = state.spectrogramm?.data;
        const isLoading = state.spectrogramm?.isLoading;
        const error = state.spectrogramm?.error;

        // Показываем индикатор загрузки
        if (isLoading && this.infoDiv) {
            this.infoDiv.innerHTML = ' Загрузка данных с сервера...';
            // Показываем плейсхолдер с загрузкой
            if (!this.hasValidData) {
                this.showPlaceholder();
                if (this.chartContainer && this.chartContainer.firstChild) {
                    this.chartContainer.firstChild.textContent = 'Загрузка данных с сервера...';
                }
            }
        }

        // Показываем ошибку
        if (error && this.infoDiv) {
            this.infoDiv.innerHTML = ` Ошибка: ${error}`;
            if (!this.hasValidData) {
                this.showPlaceholder();
                if (this.chartContainer && this.chartContainer.firstChild) {
                    this.chartContainer.firstChild.textContent = ` Ошибка: ${error}`;
                }
            }
        }

        // Если есть новые данные
        if (newData && JSON.stringify(newData) !== JSON.stringify(this.spectrogramm)) {
            this.spectrogramm = newData;
            console.log('📊 Spectrogram data updated:', {
                hasF1: this.spectrogramm?.f1 !== undefined,
                hasF2: this.spectrogramm?.f2 !== undefined,
                pointsCount: this.spectrogramm?.points?.length,
                amplitudesCount: this.spectrogramm?.amplitudes?.length
            });

            // Обновляем график
            this.updateChart();
        }
        // Если нет данных и не загружается и нет ошибки
        else if (!newData && !isLoading && !error && !this.hasValidData) {
            this.showPlaceholder();
        }

        this.isUpdating = false;
    }

    mount() {
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));

        // Наблюдатель за изменением размера контейнера
        this.resizeObserver = new ResizeObserver(() => {
            if (this.hasValidData && this.chart) {
                // При изменении размера пересоздаем график для корректного отображения
                this.updateChart();
            }
        });

        if (this.chartContainer) {
            this.resizeObserver.observe(this.chartContainer);
        }

        // Принудительно проверяем данные при монтировании
        const state = window.app.store.getState();
        if (state.spectrogramm?.data) {
            this.spectrogramm = state.spectrogramm.data;
            this.updateChart();
        } else {
            this.showPlaceholder();
        }
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

export default SpectrogrammChart;