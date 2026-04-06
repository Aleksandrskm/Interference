// endpoints.js
const DB_ENDPOINTS = {
    SITUATION: '/v1/situation',
    NEW_RSS_TASK: '/v1/new_rss_task',
    GET_STATUS_RSS_TASK: '/v1/get_status_rss_task',
    SPECTRUM: '/api/v1/spectrum',
    // Новые endpoints
    GET_SESSIONS: '/api/v1/get_sessions',        // Решенные задачи
    GET_SPECTRUMS: '/api/v1/get_spectrums',     // Список спектрограмм по ID задачи
    GET_SPECTRUM_BY_ID: '/api/v1/get_spectrum'  // Спектрограмма по ID
};

export default DB_ENDPOINTS;