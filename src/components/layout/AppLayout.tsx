// src/components/layout/AppLayout.tsx
import { ReactNode } from "react";
import {Header} from "@/components/layout/Header.tsx";
import {Footer} from "@/components/layout/Footer.tsx";



interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            {/* Zone de contenu centrale, scrollable */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 bg-gray-50">
                {children}
            </main>

            <Footer />
        </div>
    );
}
