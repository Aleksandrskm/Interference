// core/router.js
class Router {
    constructor(routes, container) {
        this.routes = routes;
        this.container = container;
        this.currentComponent = null;
        this.currentPath = window.location.pathname;
        this.isNavigating = false; // Флаг для предотвращения одновременных переходов
    }

    async handleRoute() {
        // Предотвращаем одновременные переходы
        if (this.isNavigating) {
            console.log('Navigation already in progress, skipping...');
            return;
        }

        const path = window.location.pathname;
        console.log('Handling route:', path);

        // Если это тот же путь, не делаем ничего
        if (path === this.currentPath && this.currentComponent) {
            console.log('Same route, skipping');
            return;
        }

        this.isNavigating = true;

        let route = this.routes[path];

        if (!route) {
            console.warn('Route not found:', path);
            route = this.routes['/'];
        }

        if (route) {
            try {
                // Очищаем предыдущий компонент
                if (this.currentComponent && this.currentComponent.unmount) {
                    this.currentComponent.unmount();
                }
                this.currentComponent = null;

                // Загружаем новый компонент
                const Component = await route();
                this.currentComponent = new Component();

                // Очищаем контейнер
                if (this.container) {
                    this.container.innerHTML = '';

                    // Рендерим компонент
                    const rendered = this.currentComponent.render();
                    this.container.appendChild(rendered);

                    // Монтируем компонент
                    if (this.currentComponent.mount) {
                        this.currentComponent.mount();
                    }
                } else {
                    console.error('Container not found');
                }

                this.currentPath = path;
            } catch (error) {
                console.error('Error rendering route:', error);
                if (this.container) {
                    this.container.innerHTML = `<div class="error">Ошибка загрузки страницы: ${error.message}</div>`;
                }
            } finally {
                this.isNavigating = false;
            }
        } else {
            this.isNavigating = false;
        }
    }

    navigate(path) {
        console.log('Navigating to:', path);

        // Не навигируем на тот же путь
        if (path === this.currentPath) {
            console.log('Already on this path, skipping navigation');
            return;
        }

        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    refresh() {
        this.handleRoute();
    }
}

export default Router;