// lib/axios.ts
import axios from "axios";


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,  //  cookies (SKILLSHUB_AUTH)
});


api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status || 500;

        // 401 → utilisateur non connecté
        if (status === 401) {
            console.warn("⛔ Not identified  → redirection login");
        }

        return Promise.reject({
            status,
            message: error?.response?.data?.message || "Unknow error",
        });
    }
);
export default api;
