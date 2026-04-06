// core/router.js
class Router {
    constructor(routes, container) {
        this.routes = routes;
        this.container = container;
        this.currentComponent = null;
        this.currentPath = window.location.pathname;
    }

    async handleRoute() {
        const path = window.location.pathname;
        console.log('Handling route:', path);

        // Находим соответствующий маршрут
        let route = this.routes[path];

        // Если маршрут не найден, пробуем найти динамический маршрут
        if (!route) {
            // Проверяем динамические маршруты (если есть)
            for (const [routePath, routeHandler] of Object.entries(this.routes)) {
                if (routePath.includes(':')) {
                    // Здесь можно добавить логику для динамических маршрутов
                }
            }
        }

        // Если маршрут все еще не найден, используем 404 или домашнюю страницу
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
                console.log('route',route)
                this.container.innerHTML = `<div class="error">Ошибка загрузки страницы: ${error.message}</div>`;
            }
        }
    }

    navigate(path) {
        console.log('Navigating to:', path);
        window.history.pushState({}, '', path);
        this.handleRoute();
    }

    // Метод для принудительного обновления текущего маршрута
    refresh() {
        this.handleRoute();
    }
}

export default Router;