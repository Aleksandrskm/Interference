export class Component {
    constructor() {
        this.element = null;
        this.unsubscribe = null;
        this.children = [];
        this.isMounted = false;
    }

    render() {
        throw new Error('Component must implement render()');
    }

    mount() {
        console.log(`Mounting ${this.constructor.name}`);
        this.isMounted = true;

        // Отложенная подписка на store
        if (this.subscribeToStore) {
            const subscribeToStore = () => {
                if (window.app?.store) {
                    this.unsubscribe = window.app.store.subscribe((state) => {
                        if (this.isMounted) {
                            this.onStoreUpdate(state);
                        }
                    });
                } else {
                    setTimeout(subscribeToStore, 100);
                }
            };
            subscribeToStore();
        }

        // Монтируем всех дочерних компонентов
        this.children.forEach(child => {
            if (child && child.mount && !child.isMounted) {
                child.mount();
            }
        });
    }

    onStoreUpdate(state) {
        // Переопределяется в дочерних компонентах
    }

    unmount() {
        console.log(`Unmounting ${this.constructor.name}`);
        this.isMounted = false;

        // Размонтируем всех дочерних компонентов
        this.children.forEach(child => {
            if (child && child.unmount) {
                child.unmount();
            }
        });

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // Очищаем ссылку на элемент
        this.element = null;
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
                const eventName = key.slice(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        const allChildren = [...children];

        if (!attributes.innerHTML) {
            allChildren.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                } else if (child && child.element) {
                    element.appendChild(child.element);
                    this.addChild(child);
                }
            });
        }

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

    // ИСПРАВЛЕННЫЙ метод rerender с проверкой
    rerender() {
        if (this.element && this.element.parentNode && this.element.parentNode.isConnected) {
            try {
                const newElement = this.render();
                this.element.parentNode.replaceChild(newElement, this.element);
                this.element = newElement;
            } catch (error) {
                console.warn(`Rerender failed for ${this.constructor.name}:`, error);
            }
        } else {
            console.warn(`Cannot rerender ${this.constructor.name}: element not in DOM`);
        }
    }
}