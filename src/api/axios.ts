import axios, {AxiosError} from "axios";
import {toast} from "sonner";

export type ApiError = {
    status: number;
    message: string;
};

// Global guard to prevent toast spam + redirect loops
let sessionExpiredHandled = false;

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL || typeof baseURL !== "string") {
    // Fail-fast: environment misconfiguration must not lead to silent, unstable runtime behavior
    throw new Error("VITE_API_URL is required and must be a valid string (example: http://localhost:8080/api).");
}

const api = axios.create({
    baseURL,
    withCredentials: true, // HttpOnly cookies managed by Gateway
});

// Single mapping HTTP status -> UX message
function mapStatusToMessage(status: number): string {
    if (status === 401) {
        return "Votre session a expiré. Veuillez vous reconnecter.";
    } else if (status === 403) {
        return "Accès refusé.";
    } else if (status >= 500) {
        return "Service indisponible. Réessayez plus tard.";
    } else {
        return "Une erreur est survenue. Réessayez.";
    }
}

function buildGatewayUrl(path: string): string {
    // Ensure stable URL resolution even if baseURL ends with "/api" or "/api/"
    const normalizedBase = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
    return new URL(path.replace(/^\//, ""), normalizedBase).toString();
}

function redirectToLogin(): void {
    // Gateway endpoint: GET {baseURL}/auth/login
    globalThis.location.assign(buildGatewayUrl("auth/login"));
}

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        const status =
            typeof error.response?.status === "number"
                ? error.response.status
                : 500;

        const message = mapStatusToMessage(status);

        if (status === 401) {
            if (sessionExpiredHandled === false) {
                sessionExpiredHandled = true;

                toast.warning(message);
                redirectToLogin();
            }
        }

        const apiError: ApiError = {
            status,
            message,
        };

        // Never propagate backend error details to the UI layer
        return Promise.reject(apiError);
    }
);

export default api;
