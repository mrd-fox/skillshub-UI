// lib/axios.ts
import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:10020",
    headers: {
        "Content-Type": "application/json",
        Authorization: "", // sera modifié plus tard si besoin
    },
});


api.interceptors.response.use(
    (response) => response,
    (error) => {
        const customError = {
            status: error?.response?.status || 500,
            message:
                error?.response?.data?.message ||
                "Une erreur inconnue est survenue.",
        };

        return Promise.reject(customError);
    }
);

export default api;
