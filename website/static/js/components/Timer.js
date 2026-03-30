import { Component } from '../core/component.js';

class Timer extends Component {
    constructor() {
        super();
        this.time = '';
        this.intervalId = null;
        this.element = null;
        this.subscribeToStore = false; // Таймеру не нужен store
    }

    render() {
        // Создаем элемент только если его нет
        if (!this.element) {
            this.element = this.createElement('time', { className: 'timer' }, this.getDateTime());
        } else {
            this.element.textContent = this.getDateTime();
        }
        return this.element;
    }

    getDateTime() {
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    update() {
        if (this.element && this.element.isConnected) {
            this.element.textContent = this.getDateTime();
        } else if (this.intervalId) {
            // Если элемент не в DOM, останавливаем таймер
            this.unmount();
        }
    }

    mount() {
        console.log('Timer mount called');

        // Очищаем предыдущий интервал, если есть
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Обновляем сразу
        this.update();

        // Запускаем интервал
        this.intervalId = setInterval(() => this.update(), 1000);
        console.log('Timer started, intervalId:', this.intervalId);
    }

    unmount() {
        console.log('Timer unmount called');

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Timer stopped');
        }
    }
}

export default Timer;