import './index.css'
import App from './App.tsx'
import "./i18n";
import ReactDOM from "react-dom/client";
import {AuthProvider} from './context/AuthContext.tsx';


ReactDOM.createRoot(document.getElementById("root")!).render(
    // <React.StrictMode>
    <AuthProvider>
        <App/>
    </AuthProvider>
    // </React.StrictMode>
);

