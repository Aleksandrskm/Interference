// components/MonitoringPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import DateTimeRangePanel from './DateTimeRangePanel.js';
import MonitoringInputs from './MonitoringInputs.js';

class MonitoringPanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.tasks = [];
        this.isLoading = false;
        this.error = null;
        this.statusDecryption = {
            '-3': 'Неизвестен',
            '-2': 'Ошибка исполнения',
            '-1': 'Отменена',
            '0': 'Ожидает выполнения',
            '1': 'В процессе',
            '2': 'Выполнена'
        };
        this.contentContainer = null;
        this.addButton = null;
        this.isMounted = false;
        this.updateInterval = null;
        this.pendingRequests = new Map(); // Отслеживаем pending запросы
    }

    formatApiDate(date, time) {
        return `${date}T${time}.000+03`;
    }

    async addTask() {
        console.log('=== addTask called ===');

        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }

        const state = store.getState();
        const { startDate, endDate, startTime, endTime } = state.dateRange;
        const { f1, f2, rssId } = state.interference;

        if (!startDate || !endDate || !startTime || !endTime) {
            this.error = 'Заполните дату и время';
            this.renderContent();
            return;
        }

        if (!rssId || rssId <= 0) {
            this.error = 'Укажите корректный ID РСС';
            this.renderContent();
            return;
        }

        if (!f1 || !f2 || f1 >= f2) {
            this.error = 'Укажите корректный диапазон частот (f1 < f2)';
            this.renderContent();
            return;
        }

        const formattedStartDate = this.formatApiDate(startDate, startTime);
        const formattedEndDate = this.formatApiDate(endDate, endTime);

        this.isLoading = true;
        this.error = null;
        this.updateButtonState();
        this.renderContent();

        try {
            console.log('Sending request to create task...');
            const response = await dbApi.getNewRssTask({
                rss_id: rssId,
                dt1: formattedStartDate,
                dt2: formattedEndDate,
                f1: f1,
                f2: f2
            });

            console.log('📥 Server response:', response);

            let taskId = null;
            if (typeof response === 'number') {
                taskId = response;
            } else if (typeof response === 'string') {
                taskId = parseInt(response, 10);
            } else if (response && typeof response === 'object') {
                taskId = response.task_id || response.id;
                if (typeof taskId === 'string') taskId = parseInt(taskId, 10);
            }

            if (taskId && !isNaN(taskId)) {
                this.tasks.unshift({ id: taskId, status: null, checking: false });
                console.log('Task added. Total:', this.tasks.length);
                this.renderContent();

                // Получаем статус
                await this.getTaskStatus(taskId);
            } else {
                throw new Error(`Не получен ID задачи. Ответ: ${JSON.stringify(response)}`);
            }
        } catch (err) {
            console.error('Error:', err);
            this.error = err.message || 'Ошибка сервера';
            this.renderContent();
        } finally {
            this.isLoading = false;
            this.updateButtonState();
            this.renderContent();
        }
    }

    updateButtonState() {
        if (this.addButton) {
            this.addButton.disabled = this.isLoading;
            this.addButton.textContent = this.isLoading ? ' Отправка...' : ' Создать задачу мониторинга помех';
        }
    }

    async getTaskStatus(taskId, isRetry = false) {
        // Проверяем, не идет ли уже запрос для этой задачи
        if (this.pendingRequests.has(taskId)) {
            console.log(` Request for task ${taskId} already in progress, skipping`);
            return this.pendingRequests.get(taskId);
        }

        // Создаем Promise с таймаутом
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout for task ${taskId}`)), 10000);
        });

        const requestPromise = (async () => {
            try {
                console.log(`📊 Getting status for task: ${taskId}`);

                const response = await dbApi.getStatusRssTask({ task_id: taskId });
                console.log(`📊 Status response for task ${taskId}:`, response);

                let status = null;
                if (typeof response === 'number') {
                    status = response;
                } else if (typeof response === 'string') {
                    status = parseInt(response, 10);
                } else if (response && typeof response === 'object') {
                    status = response.status || response.status_code;
                    if (typeof status === 'string') status = parseInt(status, 10);
                }

                console.log(`📊 Task ${taskId} status: ${status} (${this.statusDecryption[status]})`);

                // Обновляем задачу
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = status;
                    task.checking = false;
                    console.log(`Task ${taskId} updated with status ${status}`);
                    this.renderContent();
                }

                return status;
            } catch (err) {
                console.error(`Error getting status for task ${taskId}:`, err);

                // Если ошибка и это не повторная попытка, пробуем еще раз через 2 секунды
                if (!isRetry) {
                    console.log(`Will retry task ${taskId} in 2 seconds...`);
                    setTimeout(() => {
                        this.getTaskStatus(taskId, true);
                    }, 2000);
                } else {
                    // Если повторная попытка тоже не удалась, отмечаем ошибку
                    const task = this.tasks.find(t => t.id === taskId);
                    if (task) {
                        task.status = -2; // Ошибка
                        task.checking = false;
                        this.renderContent();
                    }
                }
                return null;
            } finally {
                this.pendingRequests.delete(taskId);
            }
        })();

        // Сохраняем Promise в pendingRequests
        const racePromise = Promise.race([requestPromise, timeoutPromise]);
        this.pendingRequests.set(taskId, racePromise);

        try {
            return await racePromise;
        } catch (err) {
            console.error(`Request for task ${taskId} failed:`, err);
            this.pendingRequests.delete(taskId);

            // Если таймаут, пробуем еще раз
            if (err.message.includes('Timeout')) {
                console.log(`Timeout for task ${taskId}, retrying...`);
                setTimeout(() => {
                    this.getTaskStatus(taskId, true);
                }, 2000);
            }
            return null;
        }
    }

    // Автоматическая проверка всех задач
    async checkAllStatuses() {
        if (!this.isMounted) {
            console.log('Not mounted, skipping');
            return;
        }

        if (this.isLoading) {
            console.log('Loading in progress, skipping status check');
            return;
        }

        if (this.tasks.length === 0) {
            return;
        }

        console.log('🔄 Auto-checking statuses for', this.tasks.length, 'tasks');

        for (const task of this.tasks) {
            // Проверяем только незавершенные задачи и те, которые не проверяются сейчас
            if (task.status !== 2 && task.status !== -1 && task.status !== -2 && !task.checking) {
                task.checking = true;
                await this.getTaskStatus(task.id);
            }
        }
    }

    async handleTaskClick(taskId) {
        console.log(` Manual check for task: ${taskId}`);

        // Находим задачу и отмечаем что проверяем
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.checking = true;
            this.renderContent();
        }

        await this.getTaskStatus(taskId);

        if (task) {
            task.checking = false;
            this.renderContent();
        }
    }

    renderContent() {
        if (!this.contentContainer) {
            console.warn('contentContainer is null');
            return;
        }

        this.contentContainer.innerHTML = '';

        if (this.error) {
            const errorDiv = this.createElement('div', { style: {
                    padding: '15px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    margin: '10px 0'
                }});
            errorDiv.innerHTML = `<strong>Ошибка:</strong> ${this.error}`;
            const retryBtn = this.createElement('button', {
                style: { marginTop: '10px', padding: '5px 10px', cursor: 'pointer' },
                onclick: () => {
                    this.error = null;
                    this.addTask();
                }
            }, 'Повторить');
            errorDiv.appendChild(retryBtn);
            this.contentContainer.appendChild(errorDiv);
            return;
        }

        if (this.isLoading && this.tasks.length === 0) {
            const loader = this.createElement('div', { style: {
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666'
                }}, ' Отправка запроса на сервер...');
            this.contentContainer.appendChild(loader);
            return;
        }

        if (this.tasks.length > 0) {
            const container = this.createElement('div');

            const title = this.createElement('h3', { style: {
                    margin: '0 0 15px 0',
                    fontSize: '16px',
                    color: '#333'
                }}, ' Идентификаторы задач:');
            container.appendChild(title);

            this.tasks.forEach(task => {
                const taskDiv = this.createElement('div', { style: {
                        padding: '12px',
                        margin: '10px 0',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: '#fafafa'
                    }});

                const taskIdElem = this.createElement('div', {
                    style: {
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: '#2196f3',
                        textDecoration: 'underline',
                        fontSize: '14px',
                        marginBottom: '8px'
                    },
                    onclick: () => this.handleTaskClick(task.id)
                }, ` Задача: ${task.id}`);

                let statusText = ' Загрузка...';
                let statusColor = '#9e9e9e';

                if (task.checking && task.status === null) {
                    statusText = ' Проверка статуса...';
                } else if (task.status !== null && task.status !== undefined) {
                    statusText = this.statusDecryption[task.status] || `Код: ${task.status}`;
                    if (task.status === 0) statusColor = '#ff9800';
                    else if (task.status === 1) statusColor = '#2196f3';
                    else if (task.status === 2) statusColor = '#4caf50';
                    else if (task.status === -1 || task.status === -2) statusColor = '#f44336';
                }

                const statusElem = this.createElement('div', {
                    style: {
                        fontSize: '13px',
                        color: statusColor,
                        fontWeight: '500'
                    }
                }, ` Статус: ${statusText}`);

                taskDiv.appendChild(taskIdElem);
                taskDiv.appendChild(statusElem);
                container.appendChild(taskDiv);
            });

            this.contentContainer.appendChild(container);
        } else if (!this.isLoading) {
            const emptyDiv = this.createElement('div', { style: {
                    padding: '30px',
                    textAlign: 'center',
                    color: '#999',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px dashed #ddd'
                }}, ' Нет созданных задач. Нажмите кнопку выше, чтобы создать задачу мониторинга.');
            this.contentContainer.appendChild(emptyDiv);
        }
    }

    render() {
        const section = this.createElement('section', { style: {
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'auto',
                height: '90%',
                width: '100%'
            }});

        const dateTimePanel = new DateTimeRangePanel();
        const monitoringInputs = new MonitoringInputs();

        section.appendChild(dateTimePanel.render());
        section.appendChild(monitoringInputs.render());

        this.addButton = this.createElement('button', {
            style: {
                marginTop: '20px',
                padding: '10px 24px',
                backgroundColor: 'rgb(33, 150, 243)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
            },
            onclick: () => this.addTask()
        }, ' Создать задачу мониторинга помех');

        section.appendChild(this.addButton);

        this.contentContainer = this.createElement('div', {
            style: { marginTop: '20px' }
        });
        section.appendChild(this.contentContainer);

        this.element = section;
        return section;
    }

    onStoreUpdate(state) {
        // Не используем store для избежания циклов
    }

    mount() {
        console.log('=== MonitoringPanel MOUNTING ===');
        this.isMounted = true;

        this.isLoading = false;
        this.updateButtonState();
        this.renderContent();

        // Запускаем периодическую проверку статусов (каждые 10 секунд)
        this.updateInterval = setInterval(() => {
            this.checkAllStatuses();
        }, 10000);

        console.log(' MonitoringPanel mounted');
    }

    unmount() {
        console.log('MonitoringPanel unmounting...');
        this.isMounted = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.isLoading = false;

        // Отменяем все pending запросы
        this.pendingRequests.clear();
    }
}

export default MonitoringPanel;