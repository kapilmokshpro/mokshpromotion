"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Papa from "papaparse"
import readXlsxFile from 'read-excel-file'
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Edit, Clock, Timer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { bulkUpdatePrices } from "@/app/actions/inventory"
import { toast } from "sonner" // or standard toast

export default function InventoryUploader() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    // Timer State
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [totalTime, setTotalTime] = useState<string | null>(null)
    const [uploadFileName, setUploadFileName] = useState<string | null>(null)
    const [rowCount, setRowCount] = useState<number | null>(null)
    const [processedRows, setProcessedRows] = useState(0)
    const [progressPercent, setProgressPercent] = useState(0)
    const [liveCreated, setLiveCreated] = useState(0)
    const [liveUpdated, setLiveUpdated] = useState(0)
    const [liveFailed, setLiveFailed] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = useRef<number>(0)

    // Bulk Update State
    const [bulkModalOpen, setBulkModalOpen] = useState(false)
    const [bulkCsv, setBulkCsv] = useState("")

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now()
        setElapsedSeconds(0)
        setTotalTime(null)
        timerRef.current = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)
    }, [])

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setTotalTime(elapsed < 60 ? `${elapsed.toFixed(1)}s` : `${Math.floor(elapsed / 60)}m ${Math.floor(elapsed % 60)}s`)
    }, [])

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    const formatElapsed = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const BATCH_SIZE = 100

    const postDataInBatches = async (data: any[]) => {
        let totalCreated = 0
        let totalUpdated = 0
        let totalFailed = 0
        const allErrors: string[] = []

        setProcessedRows(0)
        setProgressPercent(0)
        setLiveCreated(0)
        setLiveUpdated(0)
        setLiveFailed(0)

        const totalRows = data.length
        const batches = []
        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
            batches.push(data.slice(i, i + BATCH_SIZE))
        }

        try {
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i]
                const response = await fetch("/api/inventory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ data: batch }),
                })

                const resData = await response.json()

                if (!response.ok) {
                    if (resData.errors && resData.errors.length > 0) {
                        allErrors.push(...resData.errors)
                    }
                    // Continue with next batch instead of stopping
                    totalFailed += batch.length
                } else {
                    totalCreated += resData.created || 0
                    totalUpdated += resData.updated || 0
                    totalFailed += resData.failed || 0
                    if (resData.errors) allErrors.push(...resData.errors)
                }

                const processed = Math.min((i + 1) * BATCH_SIZE, totalRows)
                const percent = Math.round((processed / totalRows) * 100)
                setProcessedRows(processed)
                setProgressPercent(percent)
                setLiveCreated(totalCreated)
                setLiveUpdated(totalUpdated)
                setLiveFailed(totalFailed)
            }

            stopTimer()
            setSuccess(`Success! Created: ${totalCreated}, Updated: ${totalUpdated}.`)
            if (totalFailed > 0) {
                setError(`Completed with ${totalFailed} failed rows.${allErrors.length > 0 ? " Errors: " + allErrors.slice(0, 3).join(", ") + (allErrors.length > 3 ? "..." : "") : ""}`)
            }
            router.refresh()
        } catch (err: any) {
            stopTimer()
            setError(err.message || "Failed to upload inventory. Please check the file format.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target
        const file = target.files?.[0]
        if (!file) return

        setLoading(true)
        setError("")
        setSuccess("")
        setTotalTime(null)
        setUploadFileName(file.name)
        setRowCount(null)
        setProcessedRows(0)
        setProgressPercent(0)
        setLiveCreated(0)
        setLiveUpdated(0)
        setLiveFailed(0)
        startTimer()

        const fileExt = file.name.split('.').pop()?.toLowerCase()

        try {
            if (fileExt === 'xlsx' || fileExt === 'xls') {
                const sheets = await readXlsxFile(file, { getSheets: true } as any) as unknown as any[]
                let allData: any[] = []

                for (const sheet of sheets) {
                    const rows = await readXlsxFile(file, { sheet: sheet.name })
                    if (rows.length < 2) continue

                    // Smart Header Detection
                    let headerRowIndex = -1
                    let headers: string[] = []

                    for (let i = 0; i < Math.min(rows.length, 10); i++) {
                        const row = rows[i] as string[]
                        const rowNormalized = row.map(c => c?.toString().toLowerCase().trim())

                        // Look for Huid, Inventory Code OR State/District
                        if (rowNormalized.includes('huid') || rowNormalized.includes('inventory code') || rowNormalized.includes('code') || (rowNormalized.includes('state') && rowNormalized.includes('district'))) {
                            headerRowIndex = i
                            headers = row.map(h => h?.toString().trim())
                            break
                        }
                    }

                    if (headerRowIndex === -1) {
                        headerRowIndex = 0
                        headers = (rows[0] as string[]).map(h => h?.toString().trim())
                    }

                    // Slice from the row AFTER the header row
                    const sheetData = rows.slice(headerRowIndex + 1).map(row => {
                        const obj: any = {}
                        headers.forEach((header, index) => {
                            if (header) {
                                obj[header] = row[index]
                            }
                        })
                        return obj
                    })
                    allData = [...allData, ...sheetData]
                }

                if (allData.length === 0) throw new Error("No valid data found in any sheet")
                setRowCount(allData.length)
                await postDataInBatches(allData)
            } else {
                // CSV Fallback
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (h) => h.trim(),
                    complete: async (results) => {
                        setRowCount(results.data.length)
                        await postDataInBatches(results.data)
                    },
                    error: (err) => {
                        setError("Error parsing CSV file: " + err.message)
                        setLoading(false)
                    }
                })
            }
        } catch (err: any) {
            setError("Error parsing file: " + err.message)
            setLoading(false)
        }
        target.value = ""
    }

    const handleExportData = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/inventory?showAll=true") // Fetch all for export
            if (!response.ok) throw new Error("Failed to fetch data")
            const data = await response.json()
            const csv = Papa.unparse(data)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'inventory_export.csv')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setSuccess("Inventory exported successfully.")
        } catch (err) {
            setError("Failed to export inventory.")
        } finally {
            setLoading(false)
        }
    }

    const handleBulkUpdate = async () => {
        if (!bulkCsv) return
        setLoading(true)
        try {
            const res = await bulkUpdatePrices(bulkCsv)
            if (res.success) {
                setSuccess(`Bulk update successful. Updated ${res.count} items.`)
                if (res.errors && res.errors.length > 0) {
                    setError(`Some updates failed:\n${res.errors.join("\n")}`)
                }
                setBulkModalOpen(false)
                setBulkCsv("")
                router.refresh()
            } else {
                setError(res.error || "Failed to update")
            }
        } catch (e) {
            setError("Error submitting bulk update")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Inventory Actions
            </h3>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Import Box */}
                <div className="flex-1 space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative bg-gray-50/50">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUpload}
                            disabled={loading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2 w-full">
                            {loading ? (
                                <div className="w-full space-y-3 px-2">
                                    {/* Progress Bar */}
                                    <div className="w-full">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <Timer className="w-4 h-4 animate-pulse" />
                                                <span className="text-sm font-semibold tabular-nums">{formatElapsed(elapsedSeconds)}</span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-600 tabular-nums">{progressPercent}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out relative"
                                                style={{ width: `${progressPercent}%` }}
                                            >
                                                {progressPercent > 5 && (
                                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row Progress */}
                                    <div className="text-center space-y-1">
                                        {uploadFileName && (
                                            <p className="text-xs text-gray-500 truncate max-w-full">{uploadFileName}</p>
                                        )}
                                        {rowCount ? (
                                            <p className="text-sm font-medium text-gray-700">
                                                {processedRows.toLocaleString()} / {rowCount.toLocaleString()} rows
                                            </p>
                                        ) : (
                                            <p className="text-xs text-gray-500">Parsing file...</p>
                                        )}
                                    </div>

                                    {/* Live Counters */}
                                    {processedRows > 0 && (
                                        <div className="flex items-center justify-center gap-4 text-xs">
                                            <span className="flex items-center gap-1 text-green-600">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                Created: {liveCreated}
                                            </span>
                                            <span className="flex items-center gap-1 text-blue-600">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                Updated: {liveUpdated}
                                            </span>
                                            {liveFailed > 0 && (
                                                <span className="flex items-center gap-1 text-red-600">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    Failed: {liveFailed}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Upload className="w-8 h-8 text-gray-400" />
                            )}
                            {!loading && (
                                <>
                                    <p className="text-sm font-medium text-gray-700">Import Excel / CSV</p>
                                    <p className="text-xs text-gray-500">Upsert Mode: Updates existing by Code, Creates new.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                    <Button onClick={handleExportData} disabled={loading} variant="outline" className="w-full justify-start">
                        <Download className="w-4 h-4 mr-2" /> Export All CSV
                    </Button>

                    <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                <Edit className="w-4 h-4 mr-2" /> Bulk Price Update
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Bulk Update Prices</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Paste CSV data below. Format: <span className="font-mono bg-gray-100 p-1">inventoryCode,discountedRate</span>
                                </p>
                                <Textarea
                                    placeholder={`CHD-001,360000\nCHD-002,210000`}
                                    rows={10}
                                    value={bulkCsv}
                                    onChange={(e) => setBulkCsv(e.target.value)}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleBulkUpdate} disabled={loading || !bulkCsv}>
                                    {loading ? "Updating..." : "Run Update"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {(error || success) && (
                <div className="mt-4 space-y-2">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded whitespace-pre-wrap">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{success}</span>
                            {totalTime && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-green-500 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                                    <Clock className="w-3 h-3" />
                                    {totalTime}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
