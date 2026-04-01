import { Component } from '../core/component.js';
import Timer from './Timer.js';

class Header extends Component {
    constructor() {
        super();
        // Создаем таймер один раз в конструкторе
        this.timer = new Timer();
        // Добавляем таймер в дочерние компоненты
        this.addChild(this.timer);
    }

    render() {
        const header = this.createElement('header', { className: 'header' });

        const homeDiv = this.createElement('div', { className: 'header-home' });
        const homeLink = this.createElement('a', {
            className: 'home-link',
            href: '/',
            onclick: (e) => {
                e.preventDefault();
                window.app.router.navigate('/');
            }
        });

        const homeIcon = this.createElement('img', {
            className: 'home-icon',
            src: '../img/home.svg',
            alt: 'HomePage'
        });

        homeLink.appendChild(homeIcon);
        homeDiv.appendChild(homeLink);

        // Добавляем таймер как компонент
        homeDiv.appendChild(this.timer.render());

        const title = this.createElement('h1', { className: 'header-title' },
            'Система мониторинга помеховой обстановки');

        const settingsBtn = this.createElement('button', { className: 'header-settings' });
        const settingsIcon = this.createElement('img', {
            className: 'settings-icon',
            src: '../img/gear.svg',
            alt: 'Настройки'
        });
        settingsBtn.appendChild(settingsIcon);

        header.appendChild(homeDiv);
        header.appendChild(title);
        header.appendChild(settingsBtn);

        this.element = header;
        return header;
    }

    mount() {
        console.log('Header mount called');
        // Вызываем родительский mount, который смонтирует всех детей
        super.mount();
    }

    unmount() {
        console.log('Header unmount called');
        // Вызываем родительский unmount, который размонтирует всех детей
        super.unmount();
    }
}

export default Header;