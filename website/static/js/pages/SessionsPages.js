// pages/SessionsPages.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import Header from '../components/Header.js';
import NavPanel from '../components/NavPanel.js';
import MainLayout from '../components/MainLayout.js';
import SessionsPanel from '../components/SessionsPanel.js';

class SessionsPages extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        this.header = new Header();
        this.navPanel = new NavPanel();
        this.mainLayout = new MainLayout();
        this.sessionsPanel = new SessionsPanel();

        this.addChild(this.header);
        this.addChild(this.navPanel);
        this.addChild(this.mainLayout);
        this.addChild(this.sessionsPanel);
    }

    render() {
        const mainContent = this.mainLayout.render();
        mainContent.appendChild(this.navPanel.render());
        mainContent.appendChild(this.sessionsPanel.render());

        const fragment = this.createFragment([
            this.header.render(),
            mainContent
        ]);

        return fragment;
    }

    mount() {
        console.log('SessionsPages mount called');

        // Устанавливаем текущую страницу
        store.setState({ currentPage: '/' });

        // Сбрасываем данные при монтировании страницы
        store.resetPageData('/');

        // Монтируем всех детей
        super.mount();
    }

    unmount() {
        console.log('SessionsPages unmount called');
        super.unmount();
    }
}

export default SessionsPages;