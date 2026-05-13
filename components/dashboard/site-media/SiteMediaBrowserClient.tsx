"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"

type StateRow = {
    state: string
    count: number
}

type DistrictRow = {
    district: string
    count: number
}

type SiteRow = {
    id: number
    siteCode: string
    outletName: string
    locationName: string
    city: string | null
    district: string
    state: string
    view360Url: string | null
    mediaCount: {
        images: number
        videos: number
    }
}

const fetchJson = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
        throw new Error(await response.text())
    }
    return response.json() as Promise<T>
}

export default function SiteMediaBrowserClient() {
    const [states, setStates] = useState<StateRow[]>([])
    const [districts, setDistricts] = useState<DistrictRow[]>([])
    const [sites, setSites] = useState<SiteRow[]>([])

    const [selectedState, setSelectedState] = useState("")
    const [selectedDistrict, setSelectedDistrict] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    const [loadingStates, setLoadingStates] = useState(true)
    const [loadingDistricts, setLoadingDistricts] = useState(false)
    const [loadingSites, setLoadingSites] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true

        const run = async () => {
            setLoadingStates(true)
            setError("")
            try {
                const response = await fetchJson<{ states: StateRow[] }>("/api/site-media/states")
                if (!active) return
                setStates(response.states)
            } catch (err) {
                if (!active) return
                setError(err instanceof Error ? err.message : "Failed to load states")
            } finally {
                if (active) setLoadingStates(false)
            }
        }

        run()

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!selectedState) {
            setDistricts([])
            return
        }

        let active = true

        const run = async () => {
            setLoadingDistricts(true)
            setError("")
            try {
                const query = new URLSearchParams({ state: selectedState })
                const response = await fetchJson<{ districts: DistrictRow[] }>(`/api/site-media/districts?${query.toString()}`)
                if (!active) return
                setDistricts(response.districts)
            } catch (err) {
                if (!active) return
                setError(err instanceof Error ? err.message : "Failed to load districts")
            } finally {
                if (active) setLoadingDistricts(false)
            }
        }

        run()

        return () => {
            active = false
        }
    }, [selectedState])

    useEffect(() => {
        if (!selectedState || !selectedDistrict) {
            setSites([])
            return
        }

        let active = true
        const timer = setTimeout(async () => {
            setLoadingSites(true)
            setError("")
            try {
                const params = new URLSearchParams({
                    state: selectedState,
                    district: selectedDistrict,
                    q: searchQuery,
                })

                const response = await fetchJson<{ sites: SiteRow[] }>(`/api/site-media/sites?${params.toString()}`)
                if (!active) return
                setSites(response.sites)
            } catch (err) {
                if (!active) return
                setError(err instanceof Error ? err.message : "Failed to load sites")
            } finally {
                if (active) setLoadingSites(false)
            }
        }, 250)

        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [selectedState, selectedDistrict, searchQuery])

    const stateHeader = useMemo(() => {
        if (!selectedState) return "Select State"
        if (!selectedDistrict) return `State: ${selectedState}`
        return `${selectedState} / ${selectedDistrict}`
    }, [selectedDistrict, selectedState])

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Site Media</h1>
                <p className="text-sm text-gray-600">Select a state, district, and site to upload public images/video.</p>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Browse</p>
                        <p className="text-sm font-semibold text-gray-900">{stateHeader}</p>
                    </div>
                    {selectedState && (
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedDistrict) {
                                    setSelectedDistrict("")
                                    setSearchQuery("")
                                } else {
                                    setSelectedState("")
                                    setSelectedDistrict("")
                                    setSearchQuery("")
                                }
                            }}
                            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            Back
                        </button>
                    )}
                </div>
            </div>

            {!selectedState && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {loadingStates && (
                        <div className="col-span-full rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
                            Loading states...
                        </div>
                    )}
                    {!loadingStates && states.map((item) => (
                        <button
                            key={item.state}
                            type="button"
                            onClick={() => {
                                setSelectedState(item.state)
                                setSelectedDistrict("")
                                setSearchQuery("")
                            }}
                            className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50"
                        >
                            <p className="text-sm font-semibold text-gray-900">{item.state}</p>
                            <p className="text-xs text-gray-500">{item.count} sites</p>
                        </button>
                    ))}
                    {!loadingStates && states.length === 0 && (
                        <div className="col-span-full rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                            No states found.
                        </div>
                    )}
                </div>
            )}

            {selectedState && !selectedDistrict && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {loadingDistricts && (
                        <div className="col-span-full rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
                            Loading districts...
                        </div>
                    )}
                    {!loadingDistricts && districts.map((item) => (
                        <button
                            key={item.district}
                            type="button"
                            onClick={() => {
                                setSelectedDistrict(item.district)
                                setSearchQuery("")
                            }}
                            className="rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50"
                        >
                            <p className="text-sm font-semibold text-gray-900">{item.district}</p>
                            <p className="text-xs text-gray-500">{item.count} sites</p>
                        </button>
                    ))}
                    {!loadingDistricts && districts.length === 0 && (
                        <div className="col-span-full rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                            No districts found.
                        </div>
                    )}
                </div>
            )}

            {selectedState && selectedDistrict && (
                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search by site code, petrol pump name, site name, city"
                            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                    <th className="px-3 py-2">Site ID/Code</th>
                                    <th className="px-3 py-2">Petrol Pump / Site</th>
                                    <th className="px-3 py-2">Location</th>
                                    <th className="px-3 py-2">District</th>
                                    <th className="px-3 py-2">State</th>
                                    <th className="px-3 py-2">Media</th>
                                    <th className="px-3 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingSites && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-4 text-sm text-gray-500">Loading sites...</td>
                                    </tr>
                                )}
                                {!loadingSites && sites.map((site) => (
                                    <tr key={site.id}>
                                        <td className="px-3 py-3 font-medium text-gray-800">{site.siteCode || "-"}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium text-gray-900">{site.outletName || "-"}</p>
                                        </td>
                                        <td className="px-3 py-3 text-gray-600">{site.locationName || site.city || "-"}</td>
                                        <td className="px-3 py-3 text-gray-600">{site.district}</td>
                                        <td className="px-3 py-3 text-gray-600">{site.state}</td>
                                        <td className="px-3 py-3 text-gray-600">
                                            {site.mediaCount.images}/5 images, {site.mediaCount.videos}/1 video
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Link
                                                href={`/dashboard/site-media/sites/${site.id}`}
                                                className="inline-flex rounded-md bg-[#002147] px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                                            >
                                                Open
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {!loadingSites && sites.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                                            No sites found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
