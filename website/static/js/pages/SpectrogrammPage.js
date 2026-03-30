// pages/SpectrogrammPage.js
import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import Header from '../components/Header.js';
import NavPanel from '../components/NavPanel.js';
import MainLayout from '../components/MainLayout.js';
import SpectrumLayout from '../components/SpectrumLayout.js';

class SpectrogrammPage extends Component {
    constructor() {
        super();
        this.subscribeToStore = true;

        // Создаем компоненты один раз в конструкторе
        this.header = new Header();
        this.navPanel = new NavPanel();
        this.mainLayout = new MainLayout();
        this.spectrumLayout = new SpectrumLayout();

        // Добавляем все компоненты в children для автоматического монтирования
        this.addChild(this.header);
        this.addChild(this.navPanel);
        this.addChild(this.mainLayout);
        this.addChild(this.spectrumLayout);
    }

    render() {
        const mainContent = this.mainLayout.render();
        mainContent.appendChild(this.navPanel.render());
        mainContent.appendChild(this.spectrumLayout.render());

        const fragment = this.createFragment([
            this.header.render(),
            mainContent
        ]);

        return fragment;
    }

    mount() {
        console.log('SpectrogrammPage mount called');

        // Сбрасываем данные при монтировании страницы
        store.resetPageData('/spectrogram');

        // Вызываем родительский mount (он смонтирует всех детей)
        super.mount();

        // Устанавливаем текущую страницу
        store.setState({ currentPage: '/spectrogram' });
    }

    unmount() {
        console.log('SpectrogrammPage unmount called');

        // Вызываем родительский unmount (он размонтирует всех детей)
        super.unmount();
    }
}

export default SpectrogrammPage;