import './App.css'

import { BrowserRouter, Routes, Route } from "react-router-dom";
import {ThemeProvider} from "@/components/theme-provider.tsx";
import CreateCoursePage from "@/pages/CreateCoursePage.tsx";


function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <Routes>
                    <Route path="/creer-cours" element={<CreateCoursePage  />} />
                    {/* autres routes */}
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;