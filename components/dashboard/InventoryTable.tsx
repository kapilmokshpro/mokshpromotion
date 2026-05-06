"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Image from "next/image"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, Save, Archive, RefreshCw } from "lucide-react"
import { updateInventoryItem, toggleInventoryStatus } from "@/app/actions/inventory"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner" 
import { useRouter } from "next/navigation"

interface InventoryItem {
    id: number
    inventoryCode: string
    outletName: string
    locationName: string
    state: string
    district: string
    isActive: boolean
    discountedRate: number
    netTotal: number
    imageUrl?: string | null
    availabilityStatus: string
}

export default function InventoryTable({ initialData }: { initialData: InventoryItem[] }) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [stateFilter, setStateFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL") // ACTIVE, ARCHIVED

    // Editing State
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editValues, setEditValues] = useState<{ discountedRate?: number, netTotal?: number }>({})
    const [saving, setSaving] = useState(false)

    // Derived Filters
    const uniqueStates = useMemo(() => Array.from(new Set(initialData.map(i => i.state))).sort(), [initialData])
    const uniqueDistricts = useMemo(() => {
        if (stateFilter === "ALL") return []
        return Array.from(new Set(initialData.filter(i => i.state === stateFilter).map(i => i.district))).sort()
    }, [initialData, stateFilter])

    const filteredData = useMemo(() => {
        return initialData.filter(item => {
            const matchesSearch =
                item.outletName.toLowerCase().includes(search.toLowerCase()) ||
                item.locationName.toLowerCase().includes(search.toLowerCase()) ||
                item.inventoryCode?.toLowerCase().includes(search.toLowerCase())

            const matchesState = stateFilter === "ALL" || item.state === stateFilter
            const matchesDistrict = districtFilter === "ALL" || item.district === districtFilter
            const matchesStatus = statusFilter === "ALL"
                ? true
                : statusFilter === "ACTIVE"
                    ? item.isActive
                    : !item.isActive

            return matchesSearch && matchesState && matchesDistrict && matchesStatus
        })
    }, [initialData, search, stateFilter, districtFilter, statusFilter])

    const handleEditStart = (item: InventoryItem) => {
        setEditingId(item.id)
        setEditValues({
            discountedRate: item.discountedRate,
            netTotal: item.netTotal
        })
    }

    const handleSave = async (id: number) => {
        setSaving(true)
        try {
            const res = await updateInventoryItem(id, editValues)
            if (res.success) {
                toast.success("Item updated")
                setEditingId(null)
                router.refresh()
            } else {
                toast.error("Failed to update")
            }
        } catch (e) {
            toast.error("Error saving")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleStatus = async (id: number, currentStatus: boolean) => {
        if (!confirm(currentStatus ? "Archive this item? It will be hidden from public." : "Activate this item?")) return
        const res = await toggleInventoryStatus(id, !currentStatus)
        if (res.success) {
            toast.success(currentStatus ? "Archived" : "Activated")
            router.refresh()
        }
    }

    return (
        <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex flex-1 gap-2 items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search code, outlet, location..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setDistrictFilter("ALL"); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All States</SelectItem>
                            {uniqueStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={districtFilter} onValueChange={setDistrictFilter} disabled={stateFilter === "ALL"}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="District" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Districts</SelectItem>
                            {uniqueDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active Only</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Preview</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Outlet Details</TableHead>
                            <TableHead>State/District</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[150px]">Disc. Rate</TableHead>
                            <TableHead className="w-[150px]">Net Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className={!item.isActive ? "bg-gray-50 opacity-75" : ""}>
                                    <TableCell>
                                        <div className="relative h-10 w-10 rounded border overflow-hidden bg-gray-50">
                                            {item.imageUrl ? (
                                                <Image 
                                                    src={item.imageUrl} 
                                                    alt="Stock" 
                                                    fill 
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
                                                    No Img
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{item.inventoryCode || "-"}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.outletName}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.locationName}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{item.state}</div>
                                        <div className="text-xs text-gray-500">{item.district}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {item.isActive ? (
                                                <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="w-fit">Archived</Badge>
                                            )}
                                            {item.availabilityStatus === "BOOKED" && (
                                                <Badge variant="destructive" className="w-fit text-[10px]">BOOKED</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editingId === item.id ? (
                                            <Input
                                                type="number"
                                                value={editValues.discountedRate || ""}
                                                onChange={(e) => setEditValues({ ...editValues, discountedRate: parseFloat(e.target.value) })}
                                                className="h-8 w-full"
                                            />
                                        ) : (
                                            <span className="cursor-pointer hover:underline decoration-dashed" onClick={() => handleEditStart(item)}>
                                                {item.discountedRate ? formatCurrency(item.discountedRate) : "-"}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === item.id ? (
                                            <Input
                                                type="number"
                                                value={editValues.netTotal || ""}
                                                onChange={(e) => setEditValues({ ...editValues, netTotal: parseFloat(e.target.value) })}
                                                className="h-8 w-full"
                                            />
                                        ) : (
                                            <span className="cursor-pointer hover:underline decoration-dashed" onClick={() => handleEditStart(item)}>
                                                {item.netTotal ? formatCurrency(item.netTotal) : "-"}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === item.id ? (
                                                <Button size="sm" onClick={() => handleSave(item.id)} disabled={saving}>
                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggleStatus(item.id, item.isActive)}
                                                    title={item.isActive ? "Archive" : "Activate"}
                                                >
                                                    {item.isActive ? <Archive className="w-4 h-4 text-gray-500" /> : <RefreshCw className="w-4 h-4 text-green-600" />}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-gray-400 text-center">
                Showing {filteredData.length} of {initialData.length} items
            </div>
        </div>
    )
}
