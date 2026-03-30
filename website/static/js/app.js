// app.js
import Router from './core/router.js';
import { store } from './core/store.js';

// Инициализация приложения
const app = document.getElementById('app');

if (!app) {
    console.error('App container not found!');
}

// Определение маршрутов
const routes = {
    '/': async () => {
        console.log('Loading StartPage');
        const { default: StartPage } = await import('./pages/StartPage.js');
        return StartPage;
    },
    '/monitoring': async () => {
        console.log('Loading MonitoringPage');
        const { default: MonitoringPage } = await import('./pages/MonitoringPage.js');
        return MonitoringPage;
    },
    '/spectrogram': async () => {
        console.log('Loading SpectrogrammPage');
        const { default: SpectrogrammPage } = await import('./pages/SpectrogrammPage.js');
        return SpectrogrammPage;
    }
};

const router = new Router(routes, app);

// Функция для обработки навигации
const handleNavigation = () => {
    console.log('Popstate event, current path:', window.location.pathname);
    router.handleRoute();
};

// Обработка навигации назад/вперед
window.addEventListener('popstate', handleNavigation);

// Обработка кликов по ссылкам (делегирование)
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
        const path = link.pathname;

        // Проверяем, есть ли такой маршрут
        if (routes[path] || path === '/') {
            e.preventDefault();
            console.log('Link clicked, navigating to:', path);
            router.navigate(path);
        }
    }
});

// Инициализация роутера
router.handleRoute().catch(error => {
    console.error('Failed to initialize router:', error);
    if (app) {
        app.innerHTML = `<div class="error">Ошибка инициализации приложения: ${error.message}</div>`;
    }
});

// Экспорт для использования в компонентах
window.app = { router, store };

console.log('App initialized');