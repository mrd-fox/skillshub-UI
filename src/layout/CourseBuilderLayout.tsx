// src/layouts/CourseBuilderLayout.tsx
import {Navigate, Outlet, useLocation, useNavigate, useParams} from "react-router-dom";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";

export default function CourseBuilderLayout() {
    const navigate = useNavigate();
    const {courseId} = useParams();
    const location = useLocation();

    if (!courseId) {
        return <Navigate to="/dashboard/tutor" replace/>;
    }

    const basePath = `/dashboard/tutor/course-builder/${courseId}`;

    const tabs = [
        {value: "edit", label: "Informations"},
        {value: "sections", label: "Sections & chapitres"},
        {value: "resources", label: "Ressources"},
        {value: "settings", label: "Paramètres"},
    ];

    const allowed = tabs.map((t) => t.value);

    const pathParts = location.pathname.split("/").filter(Boolean);
    const idx = pathParts.indexOf("course-builder");
    const candidate = idx >= 0 ? pathParts[idx + 2] : null;

    const current = candidate && allowed.includes(candidate) ? candidate : "edit";

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <Tabs
                value={current}
                onValueChange={(value) => {
                    navigate(`${basePath}/${value}`);
                }}
            >
                <TabsList className="flex gap-1 px-8 pt-5 pb-0 bg-gray-100 border-b border-gray-200">
                    {tabs.map(({value, label}) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className={`
                relative px-5 py-2 text-sm font-medium transition-all duration-200
                rounded-t-lg
                data-[state=active]:bg-white
                data-[state=active]:text-blue-700
                data-[state=active]:shadow-[0_-2px_6px_rgba(0,0,0,0.1)]
                data-[state=active]:border
                data-[state=active]:border-b-0
                data-[state=active]:border-gray-200
                data-[state=active]:-translate-y-[3px]
                data-[state=inactive]:bg-gray-50
                data-[state=inactive]:text-gray-600
                hover:bg-gray-100
              `}
                        >
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="flex-1 p-8 overflow-y-auto bg-white rounded-b-lg shadow-inner">
                <Outlet/>
            </div>
        </div>
    );
}