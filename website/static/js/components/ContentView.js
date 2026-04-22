// components/ContentView.js
import { Component } from '../core/component.js';
import DateTimeRangePanel from './DateTimeRangePanel.js';
import MapComponent from './MapComponent.js';

class ContentView extends Component {
    constructor() {
        super();
        this.mapComponent = null;
    }

    render() {
        const section = this.createElement('section', { className: 'content-view' });
        const h2= document.createElement('h2');
        h2.className='h2-hearder'
        h2.innerText='Текущая помеховая обстановка';
        const dateTimePanel = new DateTimeRangePanel();

        // Создаем экземпляр MapComponent
        this.mapComponent = new MapComponent();

        const wrapper = this.createElement('div', { className: 'date-time-wrapper' });
        wrapper.appendChild(dateTimePanel.render());

        const clearBtn = this.createElement('button', { className: 'clear-map-btn' });
        const container = this.createElement('div', { className: 'clear-map-container' });

        const img = this.createElement('img', {
            className: 'clear-map-icon',
            src: './../img/clear_map.svg',
            alt: 'Очистить карту'
        });

        const label = this.createElement('div', { className: 'clear-map-label' }, 'Очистить карту');

        container.appendChild(img);
        container.appendChild(label);
        clearBtn.appendChild(container);

        clearBtn.addEventListener('click', () => {
            if (this.mapComponent) {
                this.mapComponent.clearAll();
                console.log('Map cleared');
            }
        });
        section.appendChild(h2);
        wrapper.appendChild(clearBtn);

        section.appendChild(wrapper);

        // Добавляем карту (рендерим)
        const mapElement = this.mapComponent.render();
        section.appendChild(mapElement);

        this.element = section;
        return section;
    }

    mount() {
        console.log('ContentView mounting...');

        // ВАЖНО: вызываем mount для mapComponent
        if (this.mapComponent && this.mapComponent.mount) {
            console.log('Calling MapComponent.mount()');
            this.mapComponent.mount();
        } else {
            console.error('MapComponent or mount method not found!');
        }

        // Добавляем тестовые фигуры через 1.5 секунды после загрузки
        setTimeout(() => {
            if (this.mapComponent && this.mapComponent.map) {
                console.log('Adding test shapes...');

                // Тестовый прямоугольник (Москва)
                // this.mapComponent.drawRectangle(55.5, 37.2, 56.0, 37.8, '#ff0000');
                //
                // // Тестовая точка (Москва)
                // this.mapComponent.addPoint(37.6173, 55.7558, '#00ff00');
                //
                // // Тестовая точка (Санкт-Петербург)
                // this.mapComponent.addPoint(30.3159, 59.9386, '#ff9900');

                console.log('Test shapes added');
            } else {
                console.warn('Map component not ready for test shapes');
                if (this.mapComponent) {
                    console.log('MapComponent exists but map property is:', this.mapComponent.map);
                }
            }
        }, 1500);
    }

    unmount() {
        console.log('ContentView unmounting...');
        if (this.mapComponent && this.mapComponent.unmount) {
            this.mapComponent.unmount();
        }
    }
}

export default ContentView;