import './App.css'
import {BrowserRouter} from "react-router-dom";
import {ThemeProvider} from "@/components/ThemeProvider.tsx";
import {useEffect, useState} from "react";
import {useAuth} from "@/context/AuthContext.tsx";
import {AppRoutes} from "@/routes";


function App() {
    const {keycloak, ready} = useAuth();
    const [isAuthenticated, setIsAuthenticated] = useState(!!keycloak.authenticated);

    useEffect(() => {
        const updateAuth = () => setIsAuthenticated(!!keycloak.authenticated);
        keycloak.onAuthSuccess = updateAuth;
        keycloak.onAuthLogout = updateAuth;

        const refresh = setInterval(() => {
            if (keycloak.authenticated) {
                keycloak
                    .updateToken(60)
                    .then(refreshed => {
                        if (refreshed) console.debug("🔁 Token refreshed");
                    })
                    .catch(err => console.error("⚠️ Token refresh failed", err));
            }
        }, 60000);

        return () => clearInterval(refresh);
    }, [keycloak]);


    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <AppRoutes/>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;