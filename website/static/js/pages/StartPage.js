// pages/StartPage.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import Header from '../components/Header.js';
import NavPanel from '../components/NavPanel.js';
import MainLayout from '../components/MainLayout.js';
import ContentView from '../components/ContentView.js';
import SidePanel from '../components/SidePanel.js';

class StartPage extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        // Создаем компоненты один раз в конструкторе
        this.header = new Header();
        this.navPanel = new NavPanel();
        this.mainLayout = new MainLayout();
        this.contentView = new ContentView();
        this.sidePanel = new SidePanel();

        // Добавляем все компоненты в children для автоматического монтирования
        this.addChild(this.header);
        this.addChild(this.navPanel);
        this.addChild(this.mainLayout);
        this.addChild(this.contentView);
        this.addChild(this.sidePanel);
    }

    render() {
        const mainContent = this.mainLayout.render();
        mainContent.appendChild(this.navPanel.render());
        mainContent.appendChild(this.contentView.render());
        mainContent.appendChild(this.sidePanel.render());

        const fragment = this.createFragment([
            this.header.render(),
            mainContent
        ]);

        return fragment;
    }

    mount() {
        console.log('StartPage mount called');

        // Сбрасываем данные при монтировании страницы
        store.resetPageData('/');

        // Вызываем родительский mount (он смонтирует всех детей)
        super.mount();

        // Устанавливаем текущую страницу
        store.setState({ currentPage: '/' });
    }

    unmount() {
        console.log('StartPage unmount called');

        // Вызываем родительский unmount (он размонтирует всех детей)
        super.unmount();
    }
}

export default StartPage;