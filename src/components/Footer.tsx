export function Footer() {
    return (
        <footer className="w-full bg-white border-t px-4 md:px-8 py-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Ma plateforme de cours. Tous droits réservés.
        </footer>
    );
}