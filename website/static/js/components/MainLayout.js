import { Component } from '../core/component.js';

class MainLayout extends Component {
    render() {
        const main = this.createElement('main', { className: 'main-layout' });
        this.element = main;
        return main;
    }
}

export default MainLayout;