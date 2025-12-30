// API Configuration - Force direct API for all requests
export const API_CONFIG = {
    BASE_URL: 'http://192.168.55.252:8000',
    getUrl: (endpoint) => {
        const url = `http://192.168.55.252:8000${endpoint}`;
        console.log('API Call to:', url);
        return url;
    }
};
