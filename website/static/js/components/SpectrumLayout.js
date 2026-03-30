import { Component } from '../core/component.js';
import SpectrumSetting from './SpectrumSetting.js';
import SpectrogrammChart from './SpectrogrammChart.js';

class SpectrumLayout extends Component {
    constructor() {
        super();
        // Сохраняем ссылки на компоненты при создании
        this.spectrumSetting = new SpectrumSetting();
        this.spectrogrammChart = new SpectrogrammChart();
    }

    render() {
        const section = this.createElement('section', { className: 'spectrum-layout' });

        // Используем сохраненные компоненты
        section.appendChild(this.spectrumSetting.render());
        section.appendChild(this.spectrogrammChart.render());

        this.element = section;
        return section;
    }

    mount() {
        // Монтируем сохраненные компоненты
        this.spectrumSetting.mount?.();
        this.spectrogrammChart.mount?.();
    }

    unmount() {
        // Размонтируем компоненты при необходимости
        this.spectrumSetting.unmount?.();
        this.spectrogrammChart.unmount?.();
    }
}

export default SpectrumLayout;