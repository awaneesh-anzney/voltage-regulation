import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_URL ,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptors can be added here if needed
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle errors globally
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

export default apiClient;
