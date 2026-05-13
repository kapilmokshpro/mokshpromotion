"use client";

import { useState } from "react";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Download,
    Eye,
    Loader2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ImportRow {
    [key: string]: any;
}

interface PreviewItem {
    srNo: number | null;
    outletName: string;
    location: string;
    state: string;
    district: string;
    areaType: string | null;
    widthFt: number | null;
    heightFt: number | null;
    areaSqft: number | null;
    ratePerSqft: number | null;
    installationCharge: number | null;
    printingCharge: number | null;
    netTotal: number | null;
    computedArea: number | null;
    computedNetTotal: number | null;
}

interface ImportResult {
    success: boolean;
    message: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
    skippedRows?: number;
    updatedRows?: number;
    errors: Array<{
        rowNumber: number;
        srNo: number | null;
        outletName: string | null;
        errors: string[];
    }>;
    warnings: string[];
    errorReportCsv?: string;
    importBatchId?: string;
}

export default function InventoryBulkImport() {
    const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<ImportRow[]>([]);
    const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
    const [duplicateHandling, setDuplicateHandling] = useState<"skip" | "update">("skip");
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const parseCurrency = (value: any): number | null => {
        if (value === null || value === undefined || value === "") return null;
        const str = String(value).trim();
        if (!str) return null;
        const cleaned = str.replace(/[₹$,\s]/g, "");
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    };

    const parseAreaType = (value: any): string | null => {
        if (!value) return null;
        const str = String(value).trim().toUpperCase();
        if (str.includes("URBAN")) return "URBAN";
        if (str.includes("HIGHWAY")) return "HIGHWAY";
        if (str.includes("RURAL")) return "RURAL";
        return null;
    };

    const generatePreview = (data: ImportRow[]): PreviewItem[] => {
        return data.slice(0, 20).map((row) => {
            const widthFt = parseCurrency(row["Width in ft"]);
            const heightFt = parseCurrency(row["Height in ft"]);
            const providedArea = parseCurrency(row["Total Area in Sq Ft"]);

            const ratePerSqft = parseCurrency(row["Rates"]);
            const discountedRate = parseCurrency(row["Dscounted Rates"]);

            const installationCharge = parseCurrency(row["Installation Charge"]);

            // Support 'Printinting Charge' (typo) or 'Printing Charge'
            const printingCharge = parseCurrency(row["Printinting Charge"]) ?? parseCurrency(row["Printing Charge"]);

            const providedNetTotal = parseCurrency(row["Net Total"]);

            const computedArea = widthFt && heightFt ? widthFt * heightFt : null;
            const areaSqft = providedArea || computedArea;

            // Use rate per sqft (or discounted rate if you want logic, but standard remains Rates)
            const effectiveRate = ratePerSqft;

            const baseCost = areaSqft && effectiveRate ? areaSqft * effectiveRate : null;
            const computedNetTotal = baseCost
                ? baseCost + (installationCharge || 0) + (printingCharge || 0)
                : null;

            return {
                srNo: parseCurrency(row["Sr no."]) ? Math.floor(parseCurrency(row["Sr no."])!) : null,
                outletName: row["Name of the Outlet"]?.toString().trim() || "",
                // Support Address or Location
                location: row["Address"]?.toString().trim() || row["Location"]?.toString().trim() || "",
                state: row["State"]?.toString().trim() || "",
                district: row["District"]?.toString().trim() || "",
                areaType: parseAreaType(row["Urban/ Highway/ Rural"]),
                widthFt,
                heightFt,
                areaSqft,
                ratePerSqft,
                installationCharge,
                printingCharge,
                netTotal: providedNetTotal || computedNetTotal,
                computedArea,
                computedNetTotal,
            };
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        const uploadedFile = target.files?.[0];
        if (!uploadedFile) return;

        setLoading(true);
        setFile(uploadedFile);

        const fileExt = uploadedFile.name.split(".").pop()?.toLowerCase();

        // Required headers for validation
        const REQUIRED_HEADERS = ["Name of the Outlet", "State", "District"];

        try {
            if (fileExt === "xlsx" || fileExt === "xls") {
                const sheets = (await readXlsxFile(uploadedFile, {
                    getSheets: true,
                } as any)) as unknown as any[];
                let allData: any[] = [];

                for (const sheet of sheets) {
                    const rows = await readXlsxFile(uploadedFile, { sheet: sheet.name });
                    if (rows.length < 2) continue;

                    // Normalize headers: trim whitespace
                    const headers = (rows[0] as string[]).map(h => h?.toString().trim());

                    // Validate headers
                    const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
                    // Check for Address OR Location (one is sufficient)
                    if (!headers.includes("Address") && !headers.includes("Location")) {
                        missingHeaders.push("Address (or Location)");
                    }

                    if (missingHeaders.length > 0) {
                        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
                    }

                    const sheetData = rows.slice(1).map((row) => {
                        const obj: any = {};
                        headers.forEach((header, index) => {
                            if (header) {
                                obj[header] = row[index];
                            }
                        });
                        return obj;
                    });
                    allData = [...allData, ...sheetData];
                }

                setRawData(allData);
                setPreviewData(generatePreview(allData));
                setStep("preview");
            } else {
                Papa.parse(uploadedFile, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (h) => h.trim(), // Trim headers in CSV
                    complete: (results) => {
                        // Validate CSV headers
                        const headers = results.meta.fields || [];
                        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
                        if (!headers.includes("Address") && !headers.includes("Location")) {
                            missingHeaders.push("Address (or Location)");
                        }

                        if (missingHeaders.length > 0) {
                            toast.error(`Invalid file format. Missing columns: ${missingHeaders.join(", ")}`);
                            setLoading(false);
                            return;
                        }

                        setRawData(results.data as ImportRow[]);
                        setPreviewData(generatePreview(results.data as ImportRow[]));
                        setStep("preview");
                    },
                    error: (err) => {
                        toast.error("Error parsing CSV: " + err.message);
                    },
                });
            }
        } catch (err: any) {
            toast.error("Failed to upload inventory. " + err.message);
            target.value = ""; // Reset input
        } finally {
            setLoading(false);
            // Don't clear value here if success, only on error or reset
        }
    };

    const handleImport = async () => {
        setLoading(true);

        try {
            const response = await fetch("/api/inventory/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: rawData,
                    duplicateHandling,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            const result: ImportResult = await response.json();
            setImportResult(result);
            setStep("results");

            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error("Import completed with errors");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to import inventory");
        } finally {
            setLoading(false);
        }
    };

    const downloadErrorReport = () => {
        if (!importResult?.errorReportCsv) return;

        const blob = new Blob([importResult.errorReportCsv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `import_errors_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadTemplate = () => {
        // Updated template to match user request exactly
        const template = `Sr no.,Name of the Outlet,Address,District,State,Urban/ Highway/ Rural,Width in ft,Height in ft,Total Area in Sq Ft,Rates,Dscounted Rates,Printinting Charge,Net Total,360 View Link
1,Sample Outlet 1,Andheri West,Mumbai Suburban,Maharashtra,Urban,20,10,200,150,140,3000,38000,https://example.com/site-360-1
2,Sample Outlet 2,Bandra East,Mumbai Suburban,Maharashtra,Highway,15,8,120,180,170,2500,28100,`;

        const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "inventory_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetImport = () => {
        setStep("upload");
        setFile(null);
        setRawData([]);
        setPreviewData([]);
        setImportResult(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Bulk Import</h1>
                    <p className="text-muted-foreground mt-1">
                        Import inventory/outlet data from CSV or Excel files
                    </p>
                </div>
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                </Button>
            </div>

            {/* Upload Step */}
            {step === "upload" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Upload File
                        </CardTitle>
                        <CardDescription>
                            Upload a CSV or Excel file with inventory data. The file must have the exact headers
                            as shown in the template.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                            <input
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileUpload}
                                disabled={loading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex flex-col items-center justify-center space-y-3">
                                {loading ? (
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="w-12 h-12 text-gray-400" />
                                )}
                                <div>
                                    <p className="text-base font-medium text-gray-900">
                                        {loading ? "Processing file..." : "Click or drag file to upload"}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Supports CSV, XLSX, XLS (Max 10MB)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Required Headers:</strong> Sr no., Name of the Outlet, Address, District, State,
                                Urban/ Highway/ Rural, Width in ft, Height in ft, Total Area in Sq Ft,
                                Rates, Dscounted Rates, Printinting Charge, Net Total. Optional: 360 View Link
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            {/* Preview Step */}
            {step === "preview" && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Preview Data
                            </CardTitle>
                            <CardDescription>
                                Review the first 20 rows. Computed values are shown for validation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        Total rows to import: <strong>{rawData.length}</strong>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Showing first <strong>{Math.min(20, rawData.length)}</strong> rows
                                    </div>
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto max-h-[500px]">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium">Sr No</th>
                                                    <th className="px-3 py-2 text-left font-medium">Outlet Name</th>
                                                    <th className="px-3 py-2 text-left font-medium">Location</th>
                                                    <th className="px-3 py-2 text-left font-medium">State</th>
                                                    <th className="px-3 py-2 text-left font-medium">District</th>
                                                    <th className="px-3 py-2 text-left font-medium">Type</th>
                                                    <th className="px-3 py-2 text-right font-medium">Area (sqft)</th>
                                                    <th className="px-3 py-2 text-right font-medium">Rate</th>
                                                    <th className="px-3 py-2 text-right font-medium">Net Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {previewData.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2">{item.srNo || "-"}</td>
                                                        <td className="px-3 py-2 font-medium">{item.outletName || "-"}</td>
                                                        <td className="px-3 py-2">{item.location || "-"}</td>
                                                        <td className="px-3 py-2">{item.state || "-"}</td>
                                                        <td className="px-3 py-2">{item.district || "-"}</td>
                                                        <td className="px-3 py-2">
                                                            {item.areaType ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {item.areaType}
                                                                </Badge>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {item.areaSqft?.toFixed(2) || "-"}
                                                            {item.computedArea && item.computedArea !== item.areaSqft && (
                                                                <span className="text-xs text-muted-foreground ml-1">
                                                                    (calc: {item.computedArea.toFixed(2)})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {item.ratePerSqft ? `₹${item.ratePerSqft.toLocaleString("en-IN")}` : "-"}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium">
                                                            {item.netTotal ? `₹${item.netTotal.toLocaleString("en-IN")}` : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Import Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-base font-medium mb-3 block">
                                    Duplicate Handling
                                </Label>
                                <RadioGroup
                                    value={duplicateHandling}
                                    onValueChange={(value) => setDuplicateHandling(value as "skip" | "update")}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="skip" id="skip" />
                                        <Label htmlFor="skip" className="font-normal cursor-pointer">
                                            Skip duplicates (keep existing data)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="update" id="update" />
                                        <Label htmlFor="update" className="font-normal cursor-pointer">
                                            Update duplicates (overwrite existing data)
                                        </Label>
                                    </div>
                                </RadioGroup>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Duplicates are matched by: Outlet Name + Location + District + State
                                </p>
                            </div>

                            <Separator />

                            <div className="flex gap-3">
                                <Button onClick={resetImport} variant="outline" className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Import {rawData.length} Items
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Results Step */}
            {step === "results" && importResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {importResult.success ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                Import {importResult.success ? "Completed" : "Failed"}
                            </CardTitle>
                            <CardDescription>{importResult.message}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {importResult.totalRows}
                                    </div>
                                    <div className="text-sm text-blue-600">Total Rows</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {importResult.successRows}
                                    </div>
                                    <div className="text-sm text-green-600">Success</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">
                                        {importResult.failedRows}
                                    </div>
                                    <div className="text-sm text-red-600">Failed</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {importResult.skippedRows || 0}
                                    </div>
                                    <div className="text-sm text-yellow-600">Skipped</div>
                                </div>
                            </div>

                            {importResult.warnings.length > 0 && (
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>{importResult.warnings.length} Warning(s):</strong>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            {importResult.warnings.slice(0, 5).map((warning, idx) => (
                                                <li key={idx} className="text-sm">
                                                    {warning}
                                                </li>
                                            ))}
                                            {importResult.warnings.length > 5 && (
                                                <li className="text-sm text-muted-foreground">
                                                    ...and {importResult.warnings.length - 5} more
                                                </li>
                                            )}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {importResult.errors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>{importResult.errors.length} Error(s):</strong>
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            {importResult.errors.slice(0, 5).map((error, idx) => (
                                                <li key={idx} className="text-sm">
                                                    Row {error.rowNumber}: {error.errors.join(", ")}
                                                </li>
                                            ))}
                                            {importResult.errors.length > 5 && (
                                                <li className="text-sm">
                                                    ...and {importResult.errors.length - 5} more errors
                                                </li>
                                            )}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-3">
                                {importResult.errorReportCsv && (
                                    <Button onClick={downloadErrorReport} variant="outline">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Error Report
                                    </Button>
                                )}
                                <Button onClick={resetImport} className="flex-1">
                                    Import Another File
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
