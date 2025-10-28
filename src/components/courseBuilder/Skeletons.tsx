import {Skeleton} from "@/components/ui/skeleton.tsx";

export function CourseFormSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-24 w-full"/>
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-32"/>
        </div>
    );
}

export function SectionSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-1/2"/>
            <Skeleton className="h-6 w-3/4"/>
            <Skeleton className="h-6 w-1/4"/>
        </div>
    );
}
