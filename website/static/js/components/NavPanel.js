// components/NavPanel.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';

// Двухуровневое меню с разделами
const MENU_ITEMS = [
    // Раздел 1: Текущее состояние
    {
        id: 'section-status',
        label: 'Текущее состояние',
        children: [
            { id: 'interference', label: 'ЭМ обстановка', to: '/interference', disabled: false },
        ]
    },
    // Раздел 2: Объект защиты
    {
        id: 'section-object',
        label: 'Объект защиты',
        children: [
            { id: 'object_info', label: 'Норма полосы частот', to: '#', disabled: true },
            { id: 'object_norms', label: 'Нормы маски сигналов', to: '#', disabled: true },
        ]
    },
    // Раздел 3: Результаты контроля
    {
        id: 'section-results',
        label: 'Результаты контроля',
        children: [
            { id: 'reportsALL', label: 'Общие результаты', to: '#', disabled: true },
            { id: 'reportsPom', label: 'Статистика помех', to: '#', disabled: true },
            { id: 'sessions', label: 'Список результатов', to: '/', disabled: false },
            { id: 'reportsSpectr', label: 'Спектрограммы', to: '#', disabled: true },
        ]
    },
    // Раздел 4: Постановка задач
    {
        id: 'section-tasks',
        label: 'Постановка задач',
        children: [
            { id: 'monitoring', label: 'Постановка задач мониторинга', to: '/monitoring', disabled: false },
            { id: 'task_history', label: 'Задачи контроля', to: '#', disabled: true },
        ]
    },
    // Раздел 5: Анализ спектра
    {
        id: 'section-spectrum',
        label: 'Анализ спектра',
        children: [
            { id: 'spectrogram', label: 'Спектрограмма', to: '/spectrogram', disabled: false },
        ]
    },
    // Раздел 6: Помеховая обстановка
    {
        id: 'section-interference',
        label: 'Помеховая обстановка',
        children: [
            { id: 'sost_mon_map', label: 'Состояние мониторинга на карте', to: '#', disabled: true },
            { id: 'tek_calc', label: 'Текущее измерение', to: '#', disabled: true },
        ]
    },
    // Раздел 7: Электромагнитная обстановка
    {
        id: 'section-emc',
        label: 'Электромагнитная обстановка',
        children: [
            { id: 'satellite_3d', label: '3D диаграмма', to: '#', disabled: true },
            { id: 'satellite_2d', label: '2D диаграмма', to: '#', disabled: true },
            { id: 'mapss', label: 'На карте', to: '#', disabled: true },
        ]
    }
];

class NavPanel extends Component {
    constructor() {
        super();
        this.selectedId = this.getCurrentId();
        this.subscribeToStore = true;

        // Сохраняем ссылки на details элементы
        this.detailsElements = {};
        this.isInitialized = false;

        // Проверяем, есть ли уже состояние в store
        const hasState = Object.keys(store.getState().navState.openSections || {}).length > 0;

        // Если состояния нет - инициализируем
        if (!hasState) {
            this.initNavState();
        }
    }

    // Проверяет, есть ли в секции хотя бы один активный пункт
    hasActiveItems(section) {
        return section.children.some(item => !item.disabled);
    }

    // Инициализация состояния навигации в store (только при первом запуске)
    initNavState() {
        // Сначала закрываем все секции
        MENU_ITEMS.forEach(section => {
            store.setNavSectionOpen(section.id, false);
        });

        // Открываем только те секции, в которых есть активные пункты
        MENU_ITEMS.forEach(section => {
            if (this.hasActiveItems(section)) {
                store.setNavSectionOpen(section.id, true);
            }
        });

        // Находим секцию с текущим активным пунктом и убеждаемся, что она открыта
        const currentPath = window.location.pathname;
        for (const section of MENU_ITEMS) {
            for (const item of section.children) {
                if (item.to === currentPath && !item.disabled) {
                    store.setNavSectionOpen(section.id, true);
                    return;
                }
            }
        }
    }

    // Получаем состояние секции из store
    isSectionOpen(sectionId) {
        return store.getNavSectionOpen(sectionId);
    }

    // Устанавливаем состояние секции в store
    setSectionOpen(sectionId, isOpen) {
        store.setNavSectionOpen(sectionId, isOpen);
    }

    getCurrentId() {
        const path = window.location.pathname;
        for (const section of MENU_ITEMS) {
            for (const item of section.children) {
                if (item.to === path && !item.disabled) {
                    return item.id;
                }
            }
        }
        return 'interference';
    }

    handleToggle(sectionId, event) {
        // Сохраняем состояние в store при клике пользователя
        this.setSectionOpen(sectionId, event.target.open);
    }

    render() {
        const nav = this.createElement('nav', { className: 'nav-panel' });
        const ul = this.createElement('ul', { className: 'nav-list' });

        MENU_ITEMS.forEach((section, sectionIndex) => {
            const isOpen = this.isSectionOpen(section.id);

            // Используем details как контейнер для секции
            const details = this.createElement('details', {
                className: 'nav-section',
                open: isOpen,
                onToggle: (e) => this.handleToggle(section.id, e)
            });

            // Сохраняем ссылку на details
            this.detailsElements[section.id] = details;

            // Заголовок секции - summary
            const summary = this.createElement('summary', {
                className: 'nav-section-header'
            }, section.label);

            details.appendChild(summary);

            // Контейнер для пунктов меню
            const contentDiv = this.createElement('div', {
                className: 'nav-section-content'
            });

            // Добавляем пункты меню
            section.children.forEach(item => {
                const isSelected = this.selectedId === item.id && !item.disabled;

                if (item.disabled) {
                    // Неактивный пункт
                    const span = this.createElement('span', {
                        className: `nav-link nav-link-disabled`,
                    }, item.label);
                    contentDiv.appendChild(span);
                } else {
                    // Активный пункт - ссылка
                    const link = this.createElement('a', {
                        className: `nav-link ${isSelected ? 'nav-link-selected' : ''}`,
                        href: item.to,
                        'data-nav': item.to,
                        onclick: (e) => {
                            e.preventDefault();
                            console.log('Navigating to:', item.to);
                            store.setState({ currentPage: item.to });
                            if (window.app && window.app.router) {
                                window.app.router.navigate(item.to);
                            } else {
                                console.error('Router not found');
                                window.location.href = item.to;
                            }
                        }
                    }, item.label);
                    contentDiv.appendChild(link);
                }
            });

            details.appendChild(contentDiv);
            ul.appendChild(details);

            // Разделитель между секциями (кроме последней)
            if (sectionIndex < MENU_ITEMS.length - 1) {
                const separator = this.createElement('li', {
                    className: 'nav-separator'
                });
                ul.appendChild(separator);
            }
        });

        nav.appendChild(ul);
        this.element = nav;
        return nav;
    }

    updateSelection() {
        // Обновляем только классы выбранных пунктов
        const links = this.element?.querySelectorAll('.nav-link:not(.nav-link-disabled)');
        if (!links) return;

        links.forEach(link => {
            const href = link.getAttribute('href');
            const isSelected = href === window.location.pathname;
            if (isSelected) {
                link.classList.add('nav-link-selected');
            } else {
                link.classList.remove('nav-link-selected');
            }
        });
    }

    onStoreUpdate(state) {
        // Если изменилось состояние навигации - обновляем details
        if (state.navState) {
            // Синхронизируем details с состоянием из store
            MENU_ITEMS.forEach(section => {
                const isOpen = this.isSectionOpen(section.id);
                if (this.detailsElements[section.id] &&
                    this.detailsElements[section.id].open !== isOpen) {
                    this.detailsElements[section.id].open = isOpen;
                }
            });
        }

        // Обновляем выделение
        const newSelectedId = this.getCurrentId();
        if (newSelectedId !== this.selectedId) {
            this.selectedId = newSelectedId;
            this.updateSelection();

            // Открываем секцию с активным пунктом, если она закрыта
            // НО ТОЛЬКО если в ней есть активные пункты
            for (const section of MENU_ITEMS) {
                // Проверяем, есть ли в секции активные пункты
                if (!this.hasActiveItems(section)) {
                    continue; // Пропускаем полностью disabled секции
                }

                for (const item of section.children) {
                    if (item.id === newSelectedId && !item.disabled) {
                        if (!this.isSectionOpen(section.id)) {
                            this.setSectionOpen(section.id, true);
                        }
                        break;
                    }
                }
            }
        }
    }

    mount() {
        // Подписываемся на store
        this.unsubscribe = window.app.store.subscribe((state) => this.onStoreUpdate(state));

        // После монтирования обновляем выделение
        setTimeout(() => this.updateSelection(), 50);
    }

    unmount() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

export default NavPanel;