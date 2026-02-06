import axios, {AxiosError, InternalAxiosRequestConfig} from "axios";
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

function resolveRequestUrl(config: InternalAxiosRequestConfig): string {
    const configBase = typeof config.baseURL === "string" ? config.baseURL : baseURL;
    const rawUrl = typeof config.url === "string" ? config.url : "";
    const normalizedBase = configBase.endsWith("/") ? configBase : `${configBase}/`;
    return new URL(rawUrl.replace(/^\//, ""), normalizedBase).toString();
}

function isPublicApiUrl(url: string): boolean {
    // Public endpoints must never trigger auth redirects
    return url.includes("/api/public/");
}

function isAuthApiUrl(url: string): boolean {
    // Prevent redirect loops on auth endpoints
    return url.includes("/api/auth/login") || url.includes("/api/auth/logout");
}

function isHomePageLocation(): boolean {
    // Safe and real: "/" exists in your app right now
    return (globalThis.location.pathname || "/") === "/";
}

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const status =
            typeof error.response?.status === "number"
                ? error.response.status
                : 500;

        const message = mapStatusToMessage(status);

        const requestUrl = error.config ? resolveRequestUrl(error.config as InternalAxiosRequestConfig) : "";

        if (status === 401) {
            // 1) Never redirect to login for public APIs
            if (isPublicApiUrl(requestUrl)) {
                const apiError: ApiError = {status, message};
                return Promise.reject(apiError);
            }

            // 2) Never redirect to login on auth endpoints (loop protection)
            if (isAuthApiUrl(requestUrl)) {
                const apiError: ApiError = {status, message};
                return Promise.reject(apiError);
            }

            // 3) Optional safety: if you're already on the home page, do not force Keycloak
            // This prevents "logout -> home -> 401 on some call -> redirect to keycloak"
            if (isHomePageLocation()) {
                const apiError: ApiError = {status, message};
                return Promise.reject(apiError);
            }

            if (!sessionExpiredHandled) {
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