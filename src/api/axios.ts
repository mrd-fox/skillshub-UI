// lib/axios.ts
import axios from "axios";


const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL || typeof baseURL !== "string") {
    // Fail fast: this prevents silent loops when baseURL is undefined
    // and requests go to unexpected places.
    // eslint-disable-next-line no-console
    console.error("❌ VITE_API_URL is missing. Check your .env file.");
}

const api = axios.create({
    baseURL,
    withCredentials: true, // cookies (SKILLSHUB_AUTH)
});

// eslint-disable-next-line no-console
console.info(`🌐 API baseURL = ${baseURL}`);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status ?? 500;
        const message =
            error?.response?.data?.message ??
            error?.message ??
            "Unknown error";

        if (status === 401) {
            // eslint-disable-next-line no-console
            console.warn("⛔ Not identified (401).");
        }

        // Keep the original axios error attached for debugging when needed
        return Promise.reject({
            status,
            message,
            raw: error,
        });
    }
);

export default api;