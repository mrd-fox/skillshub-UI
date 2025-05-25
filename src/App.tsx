import './App.css'

import { BrowserRouter, Routes, Route } from "react-router-dom";
import {ThemeProvider} from "@/components/theme-provider.tsx";
import CreateCoursePage from "@/pages/CreateCoursePage.tsx";
import {AppLayout} from "@/components/layout/AppLayout.tsx";


function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    {/* Toutes les routes partagent AppLayout */}
                    <Route element={<AppLayout />}>
                        <Route path="/course" element={<CreateCoursePage />} />
                        {/* ajoute ici d'autres routes qui doivent avoir le Header/Footer */}
                        {/* <Route path="/" element={<HomePage />} /> */}
                    </Route>

                    {/* Route sans AppLayout si besoin */}
                    {/* <Route path="/login" element={<LoginPage />} /> */}
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
export default App;