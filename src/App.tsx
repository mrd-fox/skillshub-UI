import './App.css'
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {ThemeProvider} from "@/components/ThemeProvider.tsx";
import CreateCoursePage from "@/pages/CreateCoursePage.tsx";
import {AppLayout} from "@/layout/AppLayout.tsx";
import {useEffect, useState} from "react";
import HomePage from "@/pages/HomePage.tsx";
import UnauthorizedPage from "@/pages/UnautorizedPage.tsx";
import {useAuth} from "@/context/AuthContext.tsx";
import ProtectedRoute from "@/routes/ProtectedRoute.tsx";


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
                <Routes>
                    <Route element={<AppLayout/>}>
                        <Route path="/" element={<HomePage/>}/>
                        <Route
                            path="/course"
                            element={
                                <ProtectedRoute requiredRoles={["TUTOR"]}>
                                    <CreateCoursePage/>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/unauthorized" element={<UnauthorizedPage/>}/>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;