"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Maximize2, X, Info, ChevronRight, ArrowLeft, Building2, Map, Search, ChevronLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
    id: number;
    outletName: string;
    locationName: string;
    state: string;
    district: string;
    widthFt: number | null;
    heightFt: number | null;
    width: number | null;
    height: number | null;
    ratePerSqft: number | null;
    discountedRate: number | null;
    rate: number | null;
    areaType: string | null;
    totalArea: number | null;
    areaSqft: number | null;
    printingCharge: number | null;
    installationCharge: number | null;
    netTotal: number | null;
    imageUrl?: string | null;
    mediaImages?: string[];
    mediaVideoUrl?: string | null;
    view360Url?: string | null;
    availabilityStatus?: string;
}

interface InventoryListProps {
    inventory: InventoryItem[];
}

type ViewState = "STATES" | "DISTRICTS" | "ITEMS";

export default function InventoryList({ inventory }: InventoryListProps) {
    const { toggleCartItem, isInCart } = useCart();
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    const availableInventory = useMemo(() => inventory, [inventory]);

    const [viewState, setViewState] = useState<ViewState>("STATES");
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const uniqueStates = useMemo(() => {
        const states = new Set(availableInventory.map((item) => item.state).filter(Boolean));
        return Array.from(states).sort();
    }, [availableInventory]);

    const filteredStates = useMemo(() => {
        if (!normalizedQuery) return uniqueStates;
        return uniqueStates.filter((state) => state.toLowerCase().includes(normalizedQuery));
    }, [uniqueStates, normalizedQuery]);

    const uniqueDistricts = useMemo(() => {
        if (!selectedState) return [];
        const districts = new Set(
            availableInventory
                .filter((item) => item.state === selectedState)
                .map((item) => item.district)
                .filter(Boolean)
        );
        return Array.from(districts).sort();
    }, [availableInventory, selectedState]);

    const filteredDistricts = useMemo(() => {
        if (!normalizedQuery) return uniqueDistricts;
        return uniqueDistricts.filter((district) => district.toLowerCase().includes(normalizedQuery));
    }, [uniqueDistricts, normalizedQuery]);

    const filteredInventory = useMemo(() => {
        const scopedItems = availableInventory.filter(
            (item) => (!selectedState || item.state === selectedState) && (!selectedDistrict || item.district === selectedDistrict)
        );

        if (!normalizedQuery) return scopedItems;

        return scopedItems.filter((item) => {
            const outlet = (item.outletName || "").toLowerCase();
            const location = (item.locationName || "").toLowerCase();
            const state = (item.state || "").toLowerCase();
            const district = (item.district || "").toLowerCase();

            return (
                outlet.includes(normalizedQuery) ||
                location.includes(normalizedQuery) ||
                state.includes(normalizedQuery) ||
                district.includes(normalizedQuery)
            );
        });
    }, [availableInventory, selectedState, selectedDistrict, normalizedQuery]);

    const searchPlaceholder =
        viewState === "STATES"
            ? "Search state..."
            : viewState === "DISTRICTS"
                ? `Search district in ${selectedState || "selected state"}...`
                : "Search outlet, location, district, or state...";

    const getStateCount = (state: string) => availableInventory.filter((i) => i.state === state).length;
    const getDistrictCount = (state: string, district: string) =>
        availableInventory.filter((i) => i.state === state && i.district === district).length;

    const handleStateSelect = (state: string) => {
        setSelectedState(state);
        setViewState("DISTRICTS");
        setSelectedDistrict(null);
        setSearchQuery("");
    };

    const handleDistrictSelect = (district: string) => {
        setSelectedDistrict(district);
        setViewState("ITEMS");
        setSearchQuery("");
    };

    const handleBack = () => {
        if (viewState === "ITEMS") {
            setViewState("DISTRICTS");
            setSelectedDistrict(null);
            setSearchQuery("");
        } else if (viewState === "DISTRICTS") {
            setViewState("STATES");
            setSelectedState(null);
            setSearchQuery("");
        }
    };

    const handleReset = () => {
        setViewState("STATES");
        setSelectedState(null);
        setSelectedDistrict(null);
        setSearchQuery("");
    };

    const getCartItem = (item: InventoryItem) => ({
        id: item.id,
        name: item.outletName,
        location: item.locationName || "",
        district: item.district,
        hoardingsCount: 1,
        width: item.widthFt || item.width,
        height: item.heightFt || item.height,
        totalArea: item.areaSqft || item.totalArea,
        rate: item.ratePerSqft || item.rate,
        printingCharge: item.printingCharge,
        netTotal: item.netTotal,
        imageUrl: item.imageUrl,
        state: item.state,
        city: item.district,
    });

    const handleRowClick = (item: InventoryItem, event: React.MouseEvent) => {
        if ((event.target as HTMLElement).closest(".no-modal-trigger")) return;
        setCurrentImageIndex(0);
        setSelectedItem(item);
    };

    const activeMediaImages = selectedItem?.mediaImages?.length
        ? selectedItem.mediaImages
        : selectedItem?.imageUrl
            ? [selectedItem.imageUrl]
            : [];

    const activeMediaImage = activeMediaImages[currentImageIndex] || null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-500">
                    <button onClick={handleReset} className={cn("hover:text-[#002147]", viewState === "STATES" && "font-bold text-[#002147]")}>
                        All States
                    </button>
                    {selectedState && (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            <button
                                onClick={() => {
                                    setViewState("DISTRICTS");
                                    setSelectedDistrict(null);
                                    setSearchQuery("");
                                }}
                                className={cn("hover:text-[#002147]", viewState === "DISTRICTS" && "font-bold text-[#002147]")}
                            >
                                {selectedState}
                            </button>
                        </>
                    )}
                    {selectedDistrict && (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            <span className="font-bold text-[#002147]">{selectedDistrict}</span>
                        </>
                    )}
                </div>
                {viewState !== "STATES" && (
                    <Button variant="ghost" size="sm" onClick={handleBack} className="text-gray-600">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative max-w-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#002147] focus:border-[#002147] sm:text-sm transition duration-150 ease-in-out"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {viewState === "STATES" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredStates.map((state) => (
                        <Card key={state} onClick={() => handleStateSelect(state)} className="cursor-pointer hover:shadow-lg transition-all group bg-white">
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-[#002147] transition-colors">
                                    <Map className="w-8 h-8 text-[#002147] group-hover:text-white" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-gray-900">{state}</h3>
                                    <p className="text-sm text-gray-500">{getStateCount(state)} Outlets</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredStates.length === 0 && (
                        <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center text-sm text-gray-500">
                            No states found for "{searchQuery}".
                        </div>
                    )}
                </div>
            )}

            {viewState === "DISTRICTS" && (
                <div>
                    <h2 className="text-2xl font-bold text-[#002147] mb-6">Districts in {selectedState}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredDistricts.map((district) => (
                            <Card key={district} onClick={() => handleDistrictSelect(district)} className="cursor-pointer hover:shadow-lg transition-all group bg-white">
                                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-[#FF6B00] transition-colors">
                                        <Building2 className="w-6 h-6 text-[#FF6B00] group-hover:text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg text-gray-900">{district}</h3>
                                        <p className="text-sm text-gray-500">{getDistrictCount(selectedState!, district)} Outlets</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredDistricts.length === 0 && (
                            <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center text-sm text-gray-500">
                                No districts found for "{searchQuery}".
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewState === "ITEMS" && (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-[#002147] text-lg">
                            {selectedDistrict}, {selectedState}
                            <Badge variant="secondary" className="ml-3 bg-blue-100 text-[#002147]">
                                {filteredInventory.length} Outlets Available
                            </Badge>
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-[#002147] text-white uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">Select</th>
                                    <th className="px-6 py-4">Outlet Name</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">State / District</th>
                                    <th className="px-6 py-4 text-center">Dimensions</th>
                                    <th className="px-6 py-4 text-right">Rate</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInventory.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                            No inventory found for "{searchQuery}".
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInventory.map((item) => {
                                        const selected = isInCart(item.id);
                                        const isBooked = item.availabilityStatus === "BOOKED";

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={(e) => handleRowClick(item, e)}
                                                className={cn("hover:bg-blue-50/80 transition-colors cursor-pointer group", selected && "bg-blue-50", isBooked && "opacity-60 bg-gray-50")}
                                            >
                                                <td className="px-6 py-4 text-center no-modal-trigger">
                                                    {!isBooked && <Checkbox checked={selected} onCheckedChange={() => toggleCartItem(getCartItem(item))} />}
                                                    {isBooked && <X className="w-4 h-4 text-red-500 mx-auto" />}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-800">{item.outletName}</td>
                                                <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{item.locationName}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs">{item.state}, {item.district}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(item.widthFt || item.width)}' x {(item.heightFt || item.height)}'
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-[#002147]">{formatCurrency((item.ratePerSqft || item.rate) || 0)}</td>
                                                <td className="px-6 py-4 text-center no-modal-trigger">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setCurrentImageIndex(0);
                                                            setSelectedItem(item);
                                                        }}
                                                    >
                                                        <Info className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0">
                    <DialogTitle className="sr-only">
                        {selectedItem?.outletName ? `${selectedItem.outletName} site details` : "Site details"}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Preview site media, 360 link, specifications and financial details.
                    </DialogDescription>
                    <div className="bg-[#002147] p-6 text-white flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold leading-tight">{selectedItem?.outletName}</h2>
                                {selectedItem?.availabilityStatus === "BOOKED" && (
                                    <Badge className="bg-red-500 text-white border-none animate-pulse">BOOKED / NOT AVAILABLE</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-blue-200 text-sm">
                                <MapPin className="w-4 h-4" />
                                <span>{selectedItem?.locationName}, {selectedItem?.district}, {selectedItem?.state}</span>
                            </div>
                        </div>
                        <DialogClose className="text-white/70 hover:text-white">
                            <X className="w-6 h-6" />
                        </DialogClose>
                    </div>

                    <div className="p-6 bg-gray-50 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm aspect-video flex items-center justify-center bg-gray-100 overflow-hidden relative">
                                    {activeMediaImage ? (
                                        <>
                                            <Image
                                                src={activeMediaImage}
                                                alt={selectedItem?.outletName || "Site image"}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                quality={70}
                                                className="object-cover"
                                            />
                                            {activeMediaImages.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCurrentImageIndex((prev) =>
                                                                prev === 0 ? activeMediaImages.length - 1 : prev - 1
                                                            )
                                                        }
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCurrentImageIndex((prev) =>
                                                                prev === activeMediaImages.length - 1 ? 0 : prev + 1
                                                            )
                                                        }
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <Maximize2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <span className="text-sm">No Preview Image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                    <h3 className="font-semibold text-[#002147] mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        Media Highlights
                                    </h3>
                                    <ul className="text-sm text-gray-700 space-y-1 ml-5 list-disc">
                                        <li>{activeMediaImages.length} active image(s)</li>
                                        <li>{selectedItem?.mediaVideoUrl ? "1 active video available" : "No active video uploaded"}</li>
                                        {selectedItem?.view360Url && (
                                            <li>
                                                360 view:{" "}
                                                <a
                                                    href={selectedItem.view360Url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-700 hover:text-blue-900 underline"
                                                >
                                                    Open link
                                                </a>
                                            </li>
                                        )}
                                        <li>High visibility location</li>
                                        <li>24/7 Illumination available</li>
                                        <li>High footfall area</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Specifications</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Dimensions (WxH)</div>
                                            <div className="font-bold text-gray-800">
                                                {(selectedItem?.widthFt || selectedItem?.width) || 0}' x {(selectedItem?.heightFt || selectedItem?.height) || 0}'
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                                            <div className="text-xs text-gray-500 mb-1">Total Area</div>
                                            <div className="font-bold text-gray-800">{(selectedItem?.areaSqft || selectedItem?.totalArea) || 0} Sq.Ft.</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedItem?.mediaVideoUrl && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Video Preview</h3>
                                        <video
                                            controls
                                            preload="metadata"
                                            className="w-full rounded-lg border border-gray-200"
                                            src={selectedItem.mediaVideoUrl}
                                        />
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Financials</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Rate per Sq.Ft</span>
                                            <span className="font-semibold">{formatCurrency(selectedItem?.ratePerSqft || selectedItem?.rate || 0)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-gray-200">
                                            <span className="text-gray-900 font-bold">Net Total</span>
                                            <span className="text-xl font-bold text-[#002147]">{selectedItem?.netTotal ? formatCurrency(selectedItem.netTotal) : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedItem?.availabilityStatus === "BOOKED" && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm font-medium">
                                        Warning: This outlet is currently booked and unavailable for new campaigns. Try similar locations in this district.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setSelectedItem(null)}>
                            Close
                        </Button>
                        {selectedItem && (
                            <Button
                                disabled={selectedItem.availabilityStatus === "BOOKED"}
                                onClick={() => {
                                    toggleCartItem(getCartItem(selectedItem));
                                    if (!isInCart(selectedItem.id)) {
                                        setSelectedItem(null);
                                    }
                                }}
                                className={cn(
                                    "min-w-[140px]",
                                    isInCart(selectedItem.id)
                                        ? "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                        : "bg-[#002147] text-white hover:bg-[#003366]"
                                )}
                            >
                                {selectedItem.availabilityStatus === "BOOKED"
                                    ? "Already Booked"
                                    : isInCart(selectedItem.id)
                                        ? "Remove from List"
                                        : "Select Location"}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
