export class Component {
    constructor() {
        this.element = null;
        this.unsubscribe = null;
        this.children = []; // Храним дочерние компоненты
        this.isMounted = false; // Добавляем флаг монтирования
    }

    render() {
        throw new Error('Component must implement render()');
    }

    mount() {
        console.log(`Mounting ${this.constructor.name}`);
        this.isMounted = true;

        // Отложенная подписка на store
        if (this.subscribeToStore) {
            // Ждем когда window.app будет доступен
            const subscribeToStore = () => {
                if (window.app?.store) {
                    this.unsubscribe = window.app.store.subscribe((state) => {
                        if (this.isMounted) {
                            this.onStoreUpdate(state);
                        }
                    });
                } else {
                    // Если store еще не готов, пробуем через 100ms
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

        // Обрабатываем children, которые могут быть в attributes
        const allChildren = [...children];

        // Если есть children в attributes.innerHTML, не добавляем другие children
        if (attributes.innerHTML) {
            // Уже установлено через innerHTML
        } else {
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

    // Вспомогательный метод для обновления компонента
    rerender() {
        if (this.element && this.element.parentNode) {
            const newElement = this.render();
            this.element.parentNode.replaceChild(newElement, this.element);
            this.element = newElement;
        }
    }
}