import Keycloak from "keycloak-js";


const keycloakSingleton = new Keycloak({
    url: import.meta.env.VITE_KEYCLOAK_URL,
    realm: import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

//@ts-ignore
keycloakSingleton.__initialized = false;

export default keycloakSingleton;