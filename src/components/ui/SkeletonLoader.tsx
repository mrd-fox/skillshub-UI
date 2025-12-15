export function SkeletonLoader({className}: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-gray-300 dark:bg-gray-700 rounded-md ${className}`}
        />
    );
}