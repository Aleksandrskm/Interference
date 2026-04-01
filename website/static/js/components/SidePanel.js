// SidePanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import DataContent from './DataContent.js';

class SidePanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.data = null;
        this.isLoading = false;
        this.error = null;
        this.lastLoadParams = null;
        this.contentContainer = null;
        this.loadTimeout = null;
        this.dataContentComponent = null; // Добавляем ссылку на DataContent
    }

    async loadData(force = false) {
        const state = store.getState();
        const { startDate, endDate, startTime, endTime } = state.dateRange;

        const formattedStartDate = startDate && startTime ? `${startDate}T${startTime}.000+03` : null;
        const formattedEndDate = endDate && endTime ? `${endDate}T${endTime}.000+03` : null;

        if (!formattedStartDate || !formattedEndDate) return;

        const loadParams = `${formattedStartDate}|${formattedEndDate}`;

        if (!force && this.lastLoadParams === loadParams && this.data) {
            console.log('Same params, skipping load');
            return;
        }

        this.lastLoadParams = loadParams;
        this.isLoading = true;
        this.error = null;

        // Обновляем UI
        this.renderContent();

        try {
            console.log('Loading data with params:', { dt_from: formattedStartDate, dt_to: formattedEndDate });
            const response = await dbApi.situation({
                dt_from: formattedStartDate,
                dt_to: formattedEndDate
            });

            console.log('Data loaded:', response);
            this.data = response;
            this.isLoading = false;

            // Обновляем store
            store.setState({ dashboard: { data: response, isLoading: false, error: null } });

            // Обновляем UI
            this.renderContent();
        } catch (err) {
            console.error('Load error:', err);
            this.error = err.message || 'Ошибка сервера';
            this.isLoading = false;
            store.setState({ dashboard: { data: null, isLoading: false, error: this.error } });
            this.renderContent();
        }
    }

    renderContent() {
        if (!this.contentContainer) {
            console.warn('contentContainer not found');
            return;
        }

        console.log('Rendering content, data exists:', !!this.data);
        this.contentContainer.innerHTML = '';

        if (this.isLoading && !this.data) {
            const loader = this.createElement('div', { className: 'loader' }, 'Загружаем данные с сервера...');
            this.contentContainer.appendChild(loader);
            return;
        }

        if (this.error) {
            const errorDiv = this.createElement('div', { className: 'error' });
            errorDiv.innerHTML = `<strong>Ошибка:</strong> ${this.error}`;
            const retryBtn = this.createElement('button', {
                className: 'button',
                onclick: () => this.loadData(true)
            }, 'Повторить');
            errorDiv.appendChild(retryBtn);
            this.contentContainer.appendChild(errorDiv);
            return;
        }

        if (this.data) {
            const article = this.createElement('article', { className: 'side-panel-article' });

            // Общая статистика
            const statsDiv = this.createElement('div', { className: 'stats-section' });
            statsDiv.innerHTML = `
                <h3>Общая статистика:</h3>
                <div class="field">Измерений: ${this.data.spectrums_cnt || 0}</div>
                <div class="field">Помех: ${this.data.noises_cnt || 0}</div>
                <div class="field">Интервал: ${this.data.timeout_sec || 0} сек</div>
            `;

            // Детали
            const detailsDiv = this.createElement('div', { className: 'details-section' });
            detailsDiv.innerHTML = `
                <h3>Детали:</h3>
                <div class="field">РСС с помехами: ${this.data.rss_w_noises_cnt || 0}</div>
                <div class="field">РСС без помех: ${this.data.rss_wo_noises_cnt || 0}</div>
            `;

            article.appendChild(statsDiv);
            article.appendChild(detailsDiv);

            // ИСПОЛЬЗУЕМ DataContent компонент для отображения данных РСС
            if (this.data.rss_stats && this.data.rss_stats.length > 0) {
                // Создаем экземпляр DataContent
                if (!this.dataContentComponent) {
                    this.dataContentComponent = new DataContent();
                }

                // Рендерим данные через DataContent
                const rssSection = this.createElement('div', { className: 'rss-section' });
                rssSection.innerHTML = '<h3>Данные РСС:</h3>';

                // Используем метод renderWithData из DataContent
                const dataContentElement = this.dataContentComponent.renderWithData(this.data);
                rssSection.appendChild(dataContentElement);
                article.appendChild(rssSection);
            }

            this.contentContainer.appendChild(article);
        } else if (!this.data && !this.isLoading && !this.error) {
            const noDataDiv = this.createElement('div', { className: 'no-data' });
            noDataDiv.innerHTML = '<h3>Данные не загружены</h3><p>Нажмите "Обновить данные" для загрузки.</p>';
            this.contentContainer.appendChild(noDataDiv);
        }
    }

    render() {
        const section = this.createElement('section', { className: 'side-panel' });

        const title = this.createElement('h2', {}, 'Текущая помеховая обстановка');

        const refreshBtn = this.createElement('button', {
            className: 'button',
            onclick: (e) => {
                e.preventDefault();
                this.loadData(true);
            }
        }, 'Обновить данные');

        this.contentContainer = this.createElement('div', { className: 'side-panel-content' });

        section.appendChild(title);
        section.appendChild(refreshBtn);
        section.appendChild(this.contentContainer);

        this.element = section;
        return section;
    }

    onStoreUpdate(state) {
        // Проверяем, что мы на правильной странице
        if (state.currentPage !== '/') {
            return; // Не обновляем данные если не на главной странице
        }

        if (this.element && state.dateRange) {
            const { startDate, endDate, startTime, endTime } = state.dateRange;
            if (startDate && endDate && startTime && endTime) {
                if (this.loadTimeout) clearTimeout(this.loadTimeout);
                this.loadTimeout = setTimeout(() => this.loadData(), 500);
            }
        }
    }

    mount() {
        console.log('SidePanel mounted');
        this.loadData();
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
    }

    unmount() {
        if (this.loadTimeout) clearTimeout(this.loadTimeout);
        if (this.unsubscribe) this.unsubscribe();
        // Очищаем компонент DataContent
        if (this.dataContentComponent && this.dataContentComponent.unmount) {
            this.dataContentComponent.unmount();
        }
    }
}

export default SidePanel;