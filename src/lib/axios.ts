// lib/axios.ts
import axios from "axios";


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,  // 🔥 Envoie automatiquement les cookies (SKILLSHUB_AUTH)
});

// Gestion globale des erreurs HTTP
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status || 500;

        // 401 → utilisateur non connecté
        if (status === 401) {
            console.warn("⛔ Non authentifié → redirection login");
        }

        return Promise.reject({
            status,
            message: error?.response?.data?.message || "Une erreur inconnue est survenue.",
        });
    }
);
export default api;
