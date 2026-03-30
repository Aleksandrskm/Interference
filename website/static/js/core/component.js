export class Component {
    constructor() {
        this.element = null;
        this.unsubscribe = null;
        this.children = []; // Храним дочерние компоненты
    }

    render() {
        throw new Error('Component must implement render()');
    }

    mount() {
        console.log(`Mounting ${this.constructor.name}`);

        if (this.subscribeToStore && window.app?.store) {
            this.unsubscribe = window.app.store.subscribe((state) => {
                this.onStoreUpdate(state);
            });
        }

        // Монтируем всех дочерних компонентов
        this.children.forEach(child => {
            if (child && child.mount) {
                child.mount();
            }
        });
    }

    onStoreUpdate(state) {
        // Переопределяется в дочерних компонентах
    }

    unmount() {
        console.log(`Unmounting ${this.constructor.name}`);

        // Размонтируем всех дочерних компонентов
        this.children.forEach(child => {
            if (child && child.unmount) {
                child.unmount();
            }
        });

        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    addChild(child) {
        if (child && !this.children.includes(child)) {
            this.children.push(child);
        }
        return child;
    }

    createElement(tag, attributes = {}, ...children) {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            } else if (child && child.element) {
                // Если это компонент, добавляем его элемент и регистрируем как дочерний
                element.appendChild(child.element);
                this.addChild(child);
            }
        });

        return element;
    }

    createFragment(children) {
        const fragment = document.createDocumentFragment();
        children.forEach(child => {
            if (typeof child === 'string') {
                fragment.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                fragment.appendChild(child);
            } else if (child && child.element) {
                fragment.appendChild(child.element);
                this.addChild(child);
            }
        });
        return fragment;
    }
}