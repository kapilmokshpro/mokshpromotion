"use client"

import { useState, useMemo } from "react"
import { Image as ImageIcon, CheckSquare, Square, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { useCart } from "@/context/CartContext"
import CartFooter from "@/components/CartFooter"

interface Hoarding {
    id: number
    name: string | null
    location: string
    district: string | null
    hoardingsCount: number
    width: any
    height: any
    totalArea: any
    rate: any
    printingCharge: any
    netTotal: any
    state: string
    city: string
    imageUrl?: string | null
    mediaImages?: string[]
    mediaVideoUrl?: string | null
    view360Url?: string | null
}

interface CityHoardingTableProps {
    hoardings: Hoarding[]
}

export default function CityHoardingTable({ hoardings }: CityHoardingTableProps) {
    const { toggleCartItem, isInCart } = useCart()

    const [searchQuery, setSearchQuery] = useState("")
    const [selectedGallery, setSelectedGallery] = useState<{
        title: string
        images: string[]
        currentIndex: number
        videoUrl?: string | null
        view360Url?: string | null
    } | null>(null)

    const filteredHoardings = useMemo(() => {
        if (!searchQuery) return hoardings

        const lowerQuery = searchQuery.toLowerCase().trim()

        return hoardings.filter((h) =>
            (h.name?.toLowerCase() || "").includes(lowerQuery) ||
            h.location.toLowerCase().includes(lowerQuery) ||
            (h.district?.toLowerCase() || "").includes(lowerQuery) ||
            (h.state?.toLowerCase() || "").includes(lowerQuery) ||
            (h.city?.toLowerCase() || "").includes(lowerQuery)
        )
    }, [hoardings, searchQuery])

    const toggleAll = () => {
        if (filteredHoardings.length === 0) return

        const allSelected = filteredHoardings.every((h) => isInCart(h.id))

        filteredHoardings.forEach((h) => {
            if (allSelected) {
                if (isInCart(h.id)) toggleCartItem(h)
            } else {
                if (!isInCart(h.id)) toggleCartItem(h)
            }
        })
    }

    const formatCurrency = (val: any) => {
        if (!val) return "-"
        return `INR ${Number(val).toLocaleString("en-IN")}`
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by Outlet Name, Location, District, State, or City..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden relative">
                <div className="overflow-x-auto pb-16">
                    <table className="w-full text-xs text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-3 w-10 text-center">Sn</th>
                                <th className="px-3 py-3 min-w-[150px]">Retail Outlet Name</th>
                                <th className="px-3 py-3 min-w-[200px]">Location</th>
                                <th className="px-3 py-3">District</th>
                                <th className="px-3 py-3 text-center">No. of<br />Hoardings</th>
                                <th className="px-3 py-3 text-center">Width<br />(ft)</th>
                                <th className="px-3 py-3 text-center">Height<br />(ft)</th>
                                <th className="px-3 py-3 text-center">Total Area<br />(sq ft)</th>
                                <th className="px-3 py-3 text-right">Rates<br />(INR)</th>
                                <th className="px-3 py-3 text-right">Printing<br />Charge (INR)</th>
                                <th className="px-3 py-3 text-right">Net Total<br />(INR)</th>
                                <th className="px-3 py-3 text-center">Gallery</th>
                                <th className="px-3 py-3 text-center">
                                    <button onClick={toggleAll} className="focus:outline-none" title="Select All on Page">
                                        {filteredHoardings.length > 0 && filteredHoardings.every((h) => isInCart(h.id)) ? (
                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <Square className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredHoardings.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                                        No inventory found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredHoardings.map((hoarding, index) => {
                                    const isSelected = isInCart(hoarding.id)
                                    return (
                                        <tr key={hoarding.id} className={`hover:bg-blue-50 transition-colors ${isSelected ? "bg-blue-50" : "bg-white"}`}>
                                            <td className="px-3 py-3 text-center font-medium">{index + 1}</td>
                                            <td className="px-3 py-3 font-medium text-blue-600">{hoarding.name || "N/A"}</td>
                                            <td className="px-3 py-3 text-gray-700 max-w-xs truncate" title={hoarding.location}>
                                                {hoarding.location}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">{hoarding.district || "-"}</td>
                                            <td className="px-3 py-3 text-center">{hoarding.hoardingsCount}</td>
                                            <td className="px-3 py-3 text-center">{hoarding.width ? Number(hoarding.width) : "-"}</td>
                                            <td className="px-3 py-3 text-center">{hoarding.height ? Number(hoarding.height) : "-"}</td>
                                            <td className="px-3 py-3 text-center font-medium">{hoarding.totalArea ? Number(hoarding.totalArea) : "-"}</td>
                                            <td className="px-3 py-3 text-right whitespace-nowrap">{formatCurrency(hoarding.rate)}</td>
                                            <td className="px-3 py-3 text-right whitespace-nowrap">{formatCurrency(hoarding.printingCharge)}</td>
                                            <td className="px-3 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(hoarding.netTotal)}</td>
                                            <td className="px-3 py-3 text-center">
                                                <button
                                                    onClick={() =>
                                                        setSelectedGallery({
                                                            title: hoarding.name || "Site View",
                                                            images: hoarding.mediaImages?.length
                                                                ? hoarding.mediaImages
                                                                : hoarding.imageUrl
                                                                    ? [hoarding.imageUrl]
                                                                    : ["/images/petrol-pump-demo.png"],
                                                            currentIndex: 0,
                                                            videoUrl: hoarding.mediaVideoUrl,
                                                            view360Url: hoarding.view360Url,
                                                        })
                                                    }
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="View Gallery"
                                                >
                                                    <ImageIcon className="w-4 h-4 mx-auto" />
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <button onClick={() => toggleCartItem(hoarding)} className="focus:outline-none">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <CartFooter />

                {selectedGallery && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedGallery(null)}
                    >
                        <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
                            <button
                                onClick={() => setSelectedGallery(null)}
                                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>

                            {selectedGallery.images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            setSelectedGallery((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1,
                                                    }
                                                    : prev
                                            )
                                        }}
                                        className="absolute left-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            setSelectedGallery((prev) =>
                                                prev
                                                    ? {
                                                        ...prev,
                                                        currentIndex: prev.currentIndex === prev.images.length - 1 ? 0 : prev.currentIndex + 1,
                                                    }
                                                    : prev
                                            )
                                        }}
                                        className="absolute right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </>
                            )}

                            <img
                                src={selectedGallery.images[selectedGallery.currentIndex]}
                                alt={selectedGallery.title}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                                onClick={(e) => e.stopPropagation()}
                            />

                            <div className="absolute left-0 bottom-0 right-0 bg-black/50 text-white px-4 py-3 text-sm flex items-center justify-between gap-3">
                                <span>{selectedGallery.title}</span>
                                <div className="flex items-center gap-4">
                                    {selectedGallery.videoUrl && (
                                        <a
                                            href={selectedGallery.videoUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-2"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            Open video
                                        </a>
                                    )}
                                    {selectedGallery.view360Url && (
                                        <a
                                            href={selectedGallery.view360Url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-2"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            360 view
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
