// pages/MonitoringPage.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import Header from '../components/Header.js';
import NavPanel from '../components/NavPanel.js';
import MainLayout from '../components/MainLayout.js';
import MonitoringPanel from '../components/MonitoringPanel.js';

class MonitoringPage extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        // Создаем компоненты один раз в конструкторе
        this.header = new Header();
        this.navPanel = new NavPanel();
        this.mainLayout = new MainLayout();
        this.monitoringPanel = new MonitoringPanel();

        // Добавляем все компоненты в children для автоматического монтирования
        this.addChild(this.header);
        this.addChild(this.navPanel);
        this.addChild(this.mainLayout);
        this.addChild(this.monitoringPanel);
    }

    render() {
        const mainContent = this.mainLayout.render();
        mainContent.appendChild(this.navPanel.render());
        mainContent.appendChild(this.monitoringPanel.render());

        const fragment = this.createFragment([
            this.header.render(),
            mainContent
        ]);

        return fragment;
    }

    mount() {
        console.log('MonitoringPage mount called');

        // Сбрасываем данные при монтировании страницы
        store.resetPageData('/monitoring');

        // Вызываем родительский mount (он смонтирует всех детей)
        super.mount();

        // Устанавливаем текущую страницу
        store.setState({ currentPage: '/monitoring' });
    }

    unmount() {
        console.log('MonitoringPage unmount called');

        // Вызываем родительский unmount (он размонтирует всех детей)
        super.unmount();
    }
}

export default MonitoringPage;