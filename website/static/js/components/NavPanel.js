// components/NavPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';

// Обновить MENU_ITEMS:
const MENU_ITEMS = [
    { id: 'currentInterference', label: 'Текущая помеховая обстановка', to: '/' },
    { id: 'monitoringInterference', label: 'Мониторинг помех', to: '/monitoring' },
    { id: 'spectrogram', label: 'Спектрограмма', to: '/spectrogram' },
    { id: 'sessions', label: 'Решенные задачи', to: '/sessions' }  // Новый пункт
];

class NavPanel extends Component {
    constructor() {
        super();
        this.selectedId = this.getCurrentId();
        this.subscribeToStore = true;
    }

    getCurrentId() {
        const path = window.location.pathname;
        const item = MENU_ITEMS.find(item => item.to === path);
        return item ? item.id : 'currentInterference';
    }

    render() {
        const nav = this.createElement('nav', { className: 'nav-panel' });
        const ul = this.createElement('ul', { className: 'nav-list' });

        MENU_ITEMS.forEach(item => {
            const li = this.createElement('li', { className: 'nav-item' });
            const isSelected = this.selectedId === item.id;

            const link = this.createElement('a', {
                className: `nav-link ${isSelected ? 'nav-link-selected' : ''}`,
                href: item.to,
                'data-nav': item.to,
                onclick: (e) => {
                    e.preventDefault();
                    console.log('Navigating to:', item.to);
                    // Обновляем store
                    store.setState({ currentPage: item.to });
                    // Используем роутер для навигации
                    if (window.app && window.app.router) {
                        window.app.router.navigate(item.to);
                    } else {
                        console.error('Router not found');
                        // fallback
                        window.location.href = item.to;
                    }
                }
            }, item.label);

            li.appendChild(link);
            ul.appendChild(li);
        });

        nav.appendChild(ul);
        this.element = nav;
        return nav;
    }

    onStoreUpdate(state) {
        const newSelectedId = this.getCurrentId();
        if (newSelectedId !== this.selectedId) {
            this.selectedId = newSelectedId;
            this.rerender();
        }
    }

    rerender() {
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
    }

    mount() {
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));
    }
}

export default NavPanel;