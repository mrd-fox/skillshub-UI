import axios, {AxiosError} from "axios";
import {toast} from "sonner";

export type ApiError = {
    status: number;
    message: string;
};

// Guard global pour éviter spam toast + boucles de redirection
let sessionExpiredHandled = false;

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL || typeof baseURL !== "string") {
    // Fail fast : mieux vaut casser au démarrage que des comportements bizarres
    // eslint-disable-next-line no-console
    console.error("❌ VITE_API_URL is missing or invalid");
}

const api = axios.create({
    baseURL,
    withCredentials: true, // cookies HttpOnly gérés par Gateway
});

// Mapping unique HTTP → message UX
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

function redirectToLogin(): void {
    if (!baseURL || typeof baseURL !== "string") {
        return;
    }

    // baseURL attendu = ".../api"
    window.location.href = `${baseURL}/auth/login`;
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

        // ⚠️ On ne propage JAMAIS le message backend
        return Promise.reject(apiError);
    }
);

export default api;
