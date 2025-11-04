// lib/axios.ts
import axios from "axios";
import keycloakSingleton from "@/lib/KeycloakSingleton.ts";

// const api = axios.create({
//     baseURL: "http://localhost:10020",
//     headers: {
//         "Content-Type": "application/json",
//         Authorization: "", // sera modifié plus tard si besoin
//     },
// });
//
//
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         const customError = {
//             status: error?.response?.status || 500,
//             message:
//                 error?.response?.data?.message ||
//                 "Une erreur inconnue est survenue.",
//         };
//
//         return Promise.reject(customError);
//     }
// );
//

// Create an Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Add an interceptor to automatically inject the token
api.interceptors.request.use(
    async (config) => {
        // Attendre que Keycloak soit initialisé
        if (!keycloakSingleton.__initialized) {
            console.warn("⏳ Waiting for Keycloak initialization...");
            // Attend 300ms (petit délai) avant retry
            await new Promise((r) => setTimeout(r, 300));
        }

        // Rafraîchit le token si proche de l’expiration
        try {
            const refreshed = await keycloakSingleton.updateToken(30);
            if (refreshed) {
                console.debug("🔁 Token refreshed successfully");
            } else {
                console.debug("✅ Token still valid, no refresh needed");
            }
        } catch (err) {
            console.warn("⛔ Token refresh failed, redirecting to login...");
            keycloakSingleton.login();
            throw new axios.Cancel("Token refresh failed");
        }

        // Ajoute le token dans les headers
        if (keycloakSingleton.token) {
            console.log("🔑 Token prêt à être envoyé:", keycloakSingleton.token);
            config.headers.Authorization = `Bearer ${keycloakSingleton.token}`;
        } else {
            console.warn("⚠️ No token found in Keycloak instance.");
        }
        console.log("📡 Final URL:", `${config.baseURL}${config.url}`);
        console.log("🧾 Headers envoyés:", config.headers);
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
