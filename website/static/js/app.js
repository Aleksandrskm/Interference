// app.js
import Router from './core/router.js';
import { store } from './core/store.js';

const app = document.getElementById('app');

if (!app) {
    console.error('App container not found!');
}

const routes = {
    '/': async () => {
        console.log('Loading SessionsPages');
        const { default: SessionsPages } = await import('./pages/SessionsPages.js');
        return SessionsPages;
    },
    '/interference': async () => {  // Новый путь для стартовой страницы
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

const handleNavigation = () => {
    console.log('Popstate event, current path:', window.location.pathname);
    router.handleRoute();
};

window.addEventListener('popstate', handleNavigation);

document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith(window.location.origin)) {
        const path = link.pathname;
        if (routes[path]) {
            e.preventDefault();
            console.log('Link clicked, navigating to:', path);
            router.navigate(path);
        }
    }
});

router.handleRoute().catch(error => {
    console.error('Failed to initialize router:', error);
    if (app) {
        app.innerHTML = `<div class="error">Ошибка инициализации приложения: ${error.message}</div>`;
    }
});

window.app = { router, store };

console.log('App initialized');