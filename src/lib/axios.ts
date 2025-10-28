// lib/axios.ts
import axios from "axios";
import keycloak from "@/lib/keycloak";

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
api.interceptors.request.use(async (config) => {
    // Ensure the token is still valid
    const isTokenValid = await keycloak.updateToken(30).catch(() => false);

    if (!isTokenValid) {
        console.warn("⛔ Token expired, redirecting to login");
        keycloak.login();
        throw new axios.Cancel("Token expired");
    }

    if (keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`;
    }

    return config;
});

export default api;
