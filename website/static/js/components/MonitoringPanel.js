// components/MonitoringPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import dbApi from '../api/dbApi.js';
import MonitoringInputs from './MonitoringInputs.js';

class MonitoringPanel extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;
        this.tasks = [];
        this.isLoading = false;
        this.error = null;

        // Режим выбора периода: 'current' (от текущего времени) или 'custom' (заданный период)
        this.periodMode = 'current';

        // Продолжительность в секундах (по умолчанию 3 минуты = 180 секунд)
        this.durationHours = 0;
        this.durationMinutes = 3;
        this.durationSeconds = 0;

        // Для режима "Заданный период" - начальная и конечная дата/время
        this.customStartDate = this.getCurrentDateString();
        this.customStartTime = this.getCurrentTimeString();

        // Конечная дата/время = текущее время + 5 минут
        const endDateTime = this.addMinutesToDateTime(
            this.getCurrentDateString(),
            this.getCurrentTimeString(),
            5
        );
        this.customEndDate = endDateTime.newDate;
        this.customEndTime = endDateTime.newTime;

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
        this.pendingRequests = new Map();
    }

    // Получить текущую дату в формате YYYY-MM-DD
    getCurrentDateString() {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    // Получить текущее время в формате HH:MM:SS
    getCurrentTimeString() {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    // Добавить минуты к дате и времени
    addMinutesToDateTime(dateStr, timeStr, minutesToAdd) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);

        const date = new Date(year, month - 1, day, hours, minutes + minutesToAdd, seconds || 0);

        const pad = n => n.toString().padStart(2, '0');
        const newDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        const newTime = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

        return { newDate, newTime };
    }

    formatApiDate(date, time) {
        return `${date}T${time}.000+03`;
    }

    // Получить текущую дату и время в формате для API
    getCurrentDateTimeForApi() {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');

        const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        return this.formatApiDate(date, time);
    }

    // Рассчитать конечную дату/время на основе начальной и продолжительности
    calculateEndDateTime(startDateTimeStr, durationSeconds) {
        const dateTimeParts = startDateTimeStr.split('T');
        const datePart = dateTimeParts[0];
        const timePart = dateTimeParts[1].split('.')[0];

        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        const startDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
        const endDateTime = new Date(startDateTime.getTime() + durationSeconds * 1000);

        const pad = n => n.toString().padStart(2, '0');
        const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())}`;
        const endTime = `${pad(endDateTime.getHours())}:${pad(endDateTime.getMinutes())}:${pad(endDateTime.getSeconds())}`;

        return this.formatApiDate(endDate, endTime);
    }

    // Получить общую продолжительность в секундах
    getDurationSeconds() {
        return (this.durationHours * 3600) + (this.durationMinutes * 60) + this.durationSeconds;
    }

    async addTask() {
        console.log('=== addTask called ===');
        console.log('Current periodMode:', this.periodMode);

        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }

        const state = store.getState();
        const { f1, f2, rssId } = state.interference;

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

        let formattedStartDate, formattedEndDate;

        if (this.periodMode === 'current') {
            const durationSeconds = this.getDurationSeconds();

            if (durationSeconds <= 0) {
                this.error = 'Укажите корректную продолжительность (больше 0 секунд)';
                this.renderContent();
                return;
            }

            formattedStartDate = this.getCurrentDateTimeForApi();
            formattedEndDate = this.calculateEndDateTime(formattedStartDate, durationSeconds);

            if (!formattedEndDate || formattedEndDate.includes('NaN')) {
                this.error = 'Ошибка при расчете конечной даты';
                this.renderContent();
                return;
            }

            console.log(`Current mode: start=${formattedStartDate}, end=${formattedEndDate}, duration=${durationSeconds}sec`);
        } else {
            if (!this.customStartDate || !this.customStartTime || !this.customEndDate || !this.customEndTime) {
                this.error = 'Заполните дату и время начала и окончания';
                this.renderContent();
                return;
            }

            formattedStartDate = this.formatApiDate(this.customStartDate, this.customStartTime);
            formattedEndDate = this.formatApiDate(this.customEndDate, this.customEndTime);

            console.log(`Custom mode: start=${formattedStartDate}, end=${formattedEndDate}`);
        }

        if (formattedStartDate.includes('NaN') || formattedEndDate.includes('NaN')) {
            this.error = 'Ошибка формата даты';
            this.renderContent();
            return;
        }

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

            console.log('Server response:', response);

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

                // Задержка 1.5 секунды перед запросом статуса
                console.log('Waiting 1.5 seconds before status check...');
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Делаем один запрос статуса после создания задачи
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
            this.addButton.textContent = this.isLoading ? 'Отправка...' : 'Поставить задачу мониторинга помех';
        }
    }

    async getTaskStatus(taskId) {
        // Проверяем, нет ли уже активного запроса для этой задачи
        if (this.pendingRequests.has(taskId)) {
            console.log(`Request for task ${taskId} already in progress, skipping`);
            return this.pendingRequests.get(taskId);
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.checking = true;
            this.renderContent();
        }

        const requestPromise = (async () => {
            try {
                console.log(`Getting status for task: ${taskId}`);
                const response = await dbApi.getStatusRssTask({ task_id: taskId });
                console.log(`Status response for task ${taskId}:`, response);

                let status = null;
                if (typeof response === 'number') {
                    status = response;
                } else if (typeof response === 'string') {
                    status = parseInt(response, 10);
                } else if (response && typeof response === 'object') {
                    status = response.status || response.status_code;
                    if (typeof status === 'string') status = parseInt(status, 10);
                }

                console.log(`Task ${taskId} status: ${status} (${this.statusDecryption[status]})`);

                const currentTask = this.tasks.find(t => t.id === taskId);
                if (currentTask) {
                    currentTask.status = status;
                    console.log(`Task ${taskId} updated with status ${status}`);
                    this.renderContent();
                }
                return status;
            } catch (err) {
                console.error(`Error getting status for task ${taskId}:`, err);
                const currentTask = this.tasks.find(t => t.id === taskId);
                if (currentTask) {
                    currentTask.status = -2;
                    this.renderContent();
                }
                return null;
            } finally {
                const currentTask = this.tasks.find(t => t.id === taskId);
                if (currentTask) {
                    currentTask.checking = false;
                    this.renderContent();
                }
                this.pendingRequests.delete(taskId);
            }
        })();

        this.pendingRequests.set(taskId, requestPromise);

        try {
            return await requestPromise;
        } catch (err) {
            console.error(`Request for task ${taskId} failed:`, err);
            this.pendingRequests.delete(taskId);
            return null;
        }
    }

    async handleTaskClick(taskId) {
        console.log(`Manual check for task: ${taskId}`);
        const task = this.tasks.find(t => t.id === taskId);

        if (!task) return;

        if (task.checking) {
            console.log(`Task ${taskId} status check already in progress`);
            return;
        }

        await this.getTaskStatus(taskId);
    }

    getStatusClass(status) {
        if (status === 0) return 'status-pending';
        if (status === 1) return 'status-progress';
        if (status === 2) return 'status-completed';
        if (status === -1 || status === -2) return 'status-error';
        return 'status-unknown';
    }

    // Рендер переключателя режимов периода
    renderPeriodSelector() {
        const container = this.createElement('div', {
            className: 'period-selector',
            style: {
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid black'
            }
        });

        const title = this.createElement('div', {
            className: 'period-title',
            style: {
                fontWeight: '500',
                marginBottom: '12px',
                fontSize: '14px',
                color: '#333'
            }
        }, 'Период мониторинга помех:');

        // Радио кнопка "От текущего времени"
        const currentRadioLabel = this.createElement('label', {
            className: 'radio-label radio-label-current',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '15px'
            }
        });
        const currentRadio = this.createElement('input', {
            type: 'radio',
            name: 'periodMode',
            value: 'current',
            onchange: (e) => {
                this.periodMode = e.target.value;
                this.updateBlocksHighlight();
            }
        });
        currentRadio.checked = (this.periodMode === 'current');

        currentRadioLabel.appendChild(currentRadio);
        currentRadioLabel.appendChild(document.createTextNode(' От текущего времени'));

        // Блок "От текущего времени"
        const currentBlock = this.createElement('div', {
            className: `period-block period-block-current ${this.periodMode === 'current' ? 'period-block-active' : 'period-block-inactive'}`,
            style: {
                marginTop: '10px',
                marginBottom: '15px',
                padding: '12px',
                borderRadius: '6px',
                transition: 'all 0.2s'
            }
        });

        const currentTitle = this.createElement('div', {
            className: 'block-title',
            style: {
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '10px',
                color: '#555'
            }
        }, 'Продолжительность:');

        const currentInputs = this.createElement('div', {
            className: 'inputs-container',
            style: {
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap'
            }
        });

        const hoursWrapper = this.createElement('div', { className: 'input-wrapper', style: { display: 'flex', alignItems: 'center', gap: '8px' } });
        const hoursInput = this.createElement('input', {
            type: 'number',
            min: 0,
            max: 720,
            value: this.durationHours,
            className: 'number-input',
            style: {
                width: '70px',
                padding: '6px',
                border: '1px solid black',
                borderRadius: '4px',
                textAlign: 'center'
            },
            onchange: (e) => {
                this.durationHours = Math.max(0, parseInt(e.target.value) || 0);
                hoursInput.value = this.durationHours;
            }
        });
        hoursWrapper.appendChild(hoursInput);
        hoursWrapper.appendChild(document.createTextNode(' часов'));

        const minutesWrapper = this.createElement('div', { className: 'input-wrapper', style: { display: 'flex', alignItems: 'center', gap: '8px' } });
        const minutesInput = this.createElement('input', {
            type: 'number',
            min: 0,
            max: 59,
            value: this.durationMinutes,
            className: 'number-input',
            style: {
                width: '70px',
                padding: '6px',
                border: '1px solid black',
                borderRadius: '4px',
                textAlign: 'center'
            },
            onchange: (e) => {
                this.durationMinutes = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                minutesInput.value = this.durationMinutes;
            }
        });
        minutesWrapper.appendChild(minutesInput);
        minutesWrapper.appendChild(document.createTextNode(' минут'));

        const secondsWrapper = this.createElement('div', { className: 'input-wrapper', style: { display: 'flex', alignItems: 'center', gap: '8px' } });
        const secondsInput = this.createElement('input', {
            type: 'number',
            min: 0,
            max: 59,
            value: this.durationSeconds,
            className: 'number-input',
            style: {
                width: '70px',
                padding: '6px',
                border: '1px solid black',
                borderRadius: '4px',
                textAlign: 'center'
            },
            onchange: (e) => {
                this.durationSeconds = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                secondsInput.value = this.durationSeconds;
            }
        });
        secondsWrapper.appendChild(secondsInput);
        secondsWrapper.appendChild(document.createTextNode(' секунд'));

        currentInputs.appendChild(hoursWrapper);
        currentInputs.appendChild(minutesWrapper);
        currentInputs.appendChild(secondsWrapper);
        currentBlock.appendChild(currentTitle);
        currentBlock.appendChild(currentInputs);

        // Радио кнопка "Заданный период"
        const customRadioLabel = this.createElement('label', {
            className: 'radio-label radio-label-custom',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '15px',
                marginBottom: '10px'
            }
        });
        const customRadio = this.createElement('input', {
            type: 'radio',
            name: 'periodMode',
            value: 'custom',
            onchange: (e) => {
                this.periodMode = e.target.value;
                this.updateBlocksHighlight();
            }
        });
        customRadio.checked = (this.periodMode === 'custom');

        customRadioLabel.appendChild(customRadio);
        customRadioLabel.appendChild(document.createTextNode(' Заданный период'));

        // Блок "Заданный период"
        const customBlock = this.createElement('div', {
            className: `period-block period-block-custom ${this.periodMode === 'custom' ? 'period-block-active' : 'period-block-inactive'}`,
            style: {
                marginTop: '10px',
                padding: '12px',
                borderRadius: '6px',
                transition: 'all 0.2s'
            }
        });

        const customTitle = this.createElement('div', {
            className: 'block-title',
            style: {
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '10px',
                color: '#555'
            }
        }, 'Заданный период:');

        const customContent = this.createElement('div', {
            className: 'custom-content',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }
        });

        const fromBlock = this.createElement('div', {
            className: 'date-time-group',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }
        });

        const fromLabel = this.createElement('span', {
            className: 'label-min-width',
            style: { fontWeight: '500', minWidth: '30px' }
        }, 'С:');

        const fromDateInput = this.createElement('input', {
            type: 'date',
            value: this.customStartDate,
            className: 'date-input',
            style: { padding: '6px', border: '1px solid black', borderRadius: '4px' },
            onchange: (e) => { this.customStartDate = e.target.value; }
        });

        const fromTimeInput = this.createElement('input', {
            type: 'time',
            step: '1',
            value: this.customStartTime,
            className: 'time-input',
            style: { padding: '6px', border: '1px solid black', borderRadius: '4px' },
            onchange: (e) => { this.customStartTime = e.target.value; }
        });

        fromBlock.appendChild(fromLabel);
        fromBlock.appendChild(fromDateInput);
        fromBlock.appendChild(fromTimeInput);

        const toBlock = this.createElement('div', {
            className: 'date-time-group',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
            }
        });

        const toLabel = this.createElement('span', {
            className: 'label-min-width',
            style: { fontWeight: '500', minWidth: '30px' }
        }, 'По:');

        const toDateInput = this.createElement('input', {
            type: 'date',
            value: this.customEndDate,
            className: 'date-input',
            style: { padding: '6px', border: '1px solid black', borderRadius: '4px' },
            onchange: (e) => { this.customEndDate = e.target.value; }
        });

        const toTimeInput = this.createElement('input', {
            type: 'time',
            step: '1',
            value: this.customEndTime,
            className: 'time-input',
            style: { padding: '6px', border: '1px solid black', borderRadius: '4px' },
            onchange: (e) => { this.customEndTime = e.target.value; }
        });

        toBlock.appendChild(toLabel);
        toBlock.appendChild(toDateInput);
        toBlock.appendChild(toTimeInput);

        customContent.appendChild(fromBlock);
        customContent.appendChild(toBlock);
        customBlock.appendChild(customTitle);
        customBlock.appendChild(customContent);

        // Собираем все в контейнер
        container.appendChild(title);
        container.appendChild(currentRadioLabel);
        container.appendChild(currentBlock);
        container.appendChild(customRadioLabel);
        container.appendChild(customBlock);

        this.currentBlock = currentBlock;
        this.customBlock = customBlock;
        this.currentRadio = currentRadio;
        this.customRadio = customRadio;

        this.updateBlocksHighlight();

        return container;
    }

    updateBlocksHighlight() {
        if (this.currentBlock && this.customBlock) {
            if (this.periodMode === 'current') {
                this.currentBlock.style.backgroundColor = '#e3f2fd';
                this.currentBlock.style.border = '2px solid #2196f3';
                this.customBlock.style.backgroundColor = '#fff';
                this.customBlock.style.border = '1px solid black';
            } else {
                this.customBlock.style.backgroundColor = '#e3f2fd';
                this.customBlock.style.border = '2px solid #2196f3';
                this.currentBlock.style.backgroundColor = '#fff';
                this.currentBlock.style.border = '1px solid black';
            }
        }

        if (this.currentRadio && this.customRadio) {
            this.currentRadio.checked = (this.periodMode === 'current');
            this.customRadio.checked = (this.periodMode === 'custom');
        }
    }

    renderContent() {
        if (!this.contentContainer) {
            console.warn('contentContainer is null');
            return;
        }

        this.contentContainer.innerHTML = '';

        if (this.error) {
            const errorDiv = this.createElement('div', {
                className: 'error-container',
                style: {
                    padding: '15px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    margin: '10px 0'
                }
            });
            errorDiv.innerHTML = `<span class="error-text" style="font-weight: bold;"> Ошибка:</span> ${this.error}`;
            const retryBtn = this.createElement('button', {
                className: 'retry-button',
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
            const loader = this.createElement('div', {
                className: 'loader',
                style: {
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666'
                }
            }, 'Отправка запроса на сервер...');
            this.contentContainer.appendChild(loader);
            return;
        }

        if (this.tasks.length > 0) {
            const container = this.createElement('div', {
                className: 'tasks-container',
                style: { marginTop: '20px' }
            });
            const title = this.createElement('h3', {
                className: 'tasks-title',
                style: {
                    margin: '0 0 15px 0',
                    fontSize: '16px',
                    color: '#333'
                }
            }, 'Идентификаторы задач:');
            container.appendChild(title);

            this.tasks.forEach(task => {
                const taskDiv = this.createElement('div', {
                    className: 'task-item',
                    style: {
                        padding: '12px',
                        margin: '10px 0',
                        border: '1px solid black',
                        borderRadius: '6px',
                        backgroundColor: '#fafafa'
                    }
                });

                const taskIdElem = this.createElement('div', {
                    className: 'task-id',
                    style: {
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: '#2196f3',
                        textDecoration: 'underline',
                        fontSize: '14px',
                        marginBottom: '8px'
                    },
                    onclick: () => this.handleTaskClick(task.id)
                }, `Задача: ${task.id}`);

                let statusText = 'Неизвестно';
                let statusColor = '#9e9e9e';

                if (task.checking) {
                    statusText = 'Проверка статуса...';
                    statusColor = '#9e9e9e';
                } else if (task.status !== null && task.status !== undefined) {
                    statusText = this.statusDecryption[task.status] || `Код: ${task.status}`;
                    if (task.status === 0) statusColor = '#ff9800';
                    else if (task.status === 1) statusColor = '#2196f3';
                    else if (task.status === 2) statusColor = '#4caf50';
                    else if (task.status === -1 || task.status === -2) statusColor = '#f44336';
                }

                const statusElem = this.createElement('div', {
                    className: `task-status ${this.getStatusClass(task.status)}`,
                    style: {
                        fontSize: '13px',
                        color: statusColor,
                        fontWeight: '500'
                    }
                }, `Статус: ${statusText}`);

                taskDiv.appendChild(taskIdElem);
                taskDiv.appendChild(statusElem);
                container.appendChild(taskDiv);
            });

            this.contentContainer.appendChild(container);
        } else if (!this.isLoading) {
            const emptyDiv = this.createElement('div', {
                className: 'empty-state',
                style: {
                    padding: '30px',
                    textAlign: 'center',
                    color: '#999',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px dashed #ddd'
                }
            }, 'Нет созданных задач. Нажмите кнопку выше, чтобы создать задачу мониторинга.');
            this.contentContainer.appendChild(emptyDiv);
        }
    }

    render() {
        const section = this.createElement('section', {
            className: 'monitoring-section',
            style: {
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'auto',
                height: '90%',
                width: '100%'
            }
        });

        const monitoringInputs = new MonitoringInputs();

        // Сначала добавляем блок с частотами
        section.appendChild(monitoringInputs.render());

        // Затем добавляем блок с выбором периода
        section.appendChild(this.renderPeriodSelector());

        this.addButton = this.createElement('button', {
            className: 'add-button',
            style: {
                marginTop: '20px',
                padding: '10px 24px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                width: '100%'
            },
            onclick: () => this.addTask()
        }, 'Поставить задачу мониторинга помех');

        section.appendChild(this.addButton);

        this.contentContainer = this.createElement('div', {
            className: 'tasks-container',
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

        this.periodMode = 'current';

        setTimeout(() => {
            if (this.currentRadio && this.customRadio) {
                this.currentRadio.checked = true;
                this.customRadio.checked = false;
            }
            this.updateBlocksHighlight();
        }, 100);

        this.updateButtonState();
        this.renderContent();

        console.log('MonitoringPanel mounted, periodMode =', this.periodMode);
    }

    unmount() {
        console.log('MonitoringPanel unmounting...');
        this.isMounted = false;
        this.pendingRequests.clear();
    }
}

export default MonitoringPanel;