import React from 'react'

export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse p-1">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-md"></div>
                    <div className="h-4 w-72 bg-gray-100 rounded-md"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
            </div>

            {/* Stat Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                        <div className="h-4 w-24 bg-gray-100 rounded-md"></div>
                        <div className="h-8 w-16 bg-gray-200 rounded-md"></div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full"></div>
                    </div>
                ))}
            </div>

            {/* Main Content Area Skeleton */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="h-4 w-36 bg-gray-200 rounded-md"></div>
                    <div className="h-8 w-24 bg-gray-100 rounded-md"></div>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                                <div className="space-y-1">
                                    <div className="h-4 w-48 bg-gray-200 rounded-md"></div>
                                    <div className="h-3 w-28 bg-gray-100 rounded-md"></div>
                                </div>
                            </div>
                            <div className="h-4 w-16 bg-gray-200 rounded-md"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
