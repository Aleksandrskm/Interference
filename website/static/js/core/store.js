// core/store.js
class Store {
    constructor() {
        this.state = {
            dashboard: {
                data: null,
                isLoading: false,
                error: null,
                lastUpdate: null
            },
            monitoring: {
                data: null,
                isLoading: false,
                error: null,
                taskStatuses: {},
                lastUpdate: null
            },
            spectrogramm: {
                data: null,
                isLoading: false,
                error: null,
                lastUpdate: null
            },
            dateRange: {
                startDate: null,
                endDate: null,
                startTime: null,
                endTime: null
            },
            interference: {
                f1: 920,
                f2: 930.5,
                rssId: 1
            },
            spectrumParams: {
                fr1: 2100,
                fr2: 2200,
                averages: 2,
                gain: 5
            },
            // НОВЫЕ СОСТОЯНИЯ ДЛЯ СТРАНИЦЫ СЕССИЙ
            sessions: {
                data: null,
                isLoading: false,
                error: null,
                selectedSession: null
            },
            spectrumsList: {
                data: null,
                isLoading: false,
                error: null,
                selectedSpectrumId: null
            },
            currentSpectrum: {
                data: null,
                isLoading: false,
                error: null
            },
            currentPage: '/'
        };

        this.listeners = [];
        this.initDateRange();
    }

    initDateRange() {
        const now = new Date();
        const pastDate = new Date(now);
        pastDate.setFullYear(pastDate.getFullYear() - 1);

        this.state.dateRange = {
            startDate: this.getDateForInput(pastDate),
            endDate: this.getDateForInput(now),
            startTime: this.getTimeForInput(pastDate),
            endTime: this.getTimeForInput(now)
        };
    }

    getDateForInput(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    getTimeForInput(date) {
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    getState() {
        return { ...this.state };
    }

    setState(updates) {
        Object.assign(this.state, updates);
        this.notify();
    }

    setNestedState(path, value) {
        const parts = path.split('.');
        let current = this.state;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this.notify();
    }

    // Сброс данных для конкретной страницы
    resetPageData(page) {
        switch(page) {
            case '/':
                this.setState({
                    sessions: {
                        data: null,
                        isLoading: false,
                        error: null,
                        selectedSession: null
                    },
                    spectrumsList: {
                        data: null,
                        isLoading: false,
                        error: null,
                        selectedSpectrumId: null
                    },
                    currentSpectrum: {
                        data: null,
                        isLoading: false,
                        error: null
                    }
                });
                break;
            case '/interference':  // Обновленный путь
                this.setState({
                    dashboard: {
                        data: null,
                        isLoading: false,
                        error: null,
                        lastUpdate: null
                    }
                });
                break;
            case '/monitoring':
                this.setState({
                    monitoring: {
                        data: null,
                        isLoading: false,
                        error: null,
                        taskStatuses: {},
                        lastUpdate: null
                    }
                });
                break;
            case '/spectrogram':
                this.setState({
                    spectrogramm: {
                        data: null,
                        isLoading: false,
                        error: null,
                        lastUpdate: null
                    }
                });
                break;
            case '/sessions':
                this.setState({
                    sessions: {
                        data: null,
                        isLoading: false,
                        error: null,
                        selectedSession: null
                    },
                    spectrumsList: {
                        data: null,
                        isLoading: false,
                        error: null,
                        selectedSpectrumId: null
                    },
                    currentSpectrum: {
                        data: null,
                        isLoading: false,
                        error: null
                    }
                });
                break;
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const store = new Store();