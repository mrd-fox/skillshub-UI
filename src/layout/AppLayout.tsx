import {Footer} from "@/components/Footer.tsx";
import Header from "@/components/Header.tsx";
import {Outlet} from "react-router-dom";


export function AppLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header/>
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-gray-50">
                <Outlet/>
            </main>
            <Footer/>
        </div>
    );
}