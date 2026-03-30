// configDbApi.js
// Используем относительный путь к Flask приложению
const URL = window.location.origin; // Берем текущий адрес Flask приложения (http://localhost:5003)
const headers = {
    'Content-Type': 'application/json'
};

const configApi = {
    baseUrl: URL,
    headers
};

export default configApi;