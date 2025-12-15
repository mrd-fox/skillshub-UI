import './App.css'
import {BrowserRouter} from "react-router-dom";
import {ThemeProvider} from "@/components/ThemeProvider.tsx";
import {AppRoutes} from "@/routes";
import {Toaster} from "sonner";
import {AuthRedirector} from "@/components/auth/AuthRedirector.tsx";


function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <BrowserRouter>
                <AuthRedirector/>
                <AppRoutes/>
                <Toaster richColors position="top-right"/>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;