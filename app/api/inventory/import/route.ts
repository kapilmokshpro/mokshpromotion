import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseImportFile, generateErrorReport, type ImportRow } from "@/lib/inventory-import-utils";
import { nanoid } from "nanoid";

export const maxDuration = 60; // Allow up to 60 seconds for large imports

/**
 * POST /api/inventory/import
 * Bulk import inventory from CSV/Excel
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Only ADMIN, SUPER_ADMIN can import
        if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
            return new NextResponse("Forbidden: Admin access required", {
                status: 403,
            });
        }

        const body = await req.json();
        const { data, duplicateHandling = "skip" } = body as {
            data: ImportRow[];
            duplicateHandling?: "skip" | "update";
        };

        if (!data || !Array.isArray(data) || data.length === 0) {
            return new NextResponse("Invalid data format", { status: 400 });
        }

        // Parse and validate all rows
        const { items, errors, warnings } = parseImportFile(data);

        if (items.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No valid items to import",
                totalRows: data.length,
                successRows: 0,
                failedRows: errors.length,
                errors,
                warnings,
            });
        }

        // Generate batch ID for this import
        const importBatchId = `import_${nanoid(10)}_${Date.now()}`;

        // Process imports in transaction
        const results = await db.$transaction(async (tx) => {
            let successCount = 0;
            let updateCount = 0;
            let skipCount = 0;

            for (const item of items) {
                try {
                    // Check for duplicates
                    const existing = await tx.inventoryHoarding.findFirst({
                        where: {
                            outletName: item.outletName,
                            locationName: item.locationName,
                            district: item.district,
                            state: item.state,
                        },
                    });

                    if (existing) {
                        if (duplicateHandling === "update") {
                            // Update existing
                            await tx.inventoryHoarding.update({
                                where: { id: existing.id },
                                data: {
                                    sourceSrNo: item.sourceSrNo,
                                    areaType: item.areaType,
                                    widthFt: item.widthFt,
                                    heightFt: item.heightFt,
                                    areaSqft: item.areaSqft,
                                    ratePerSqft: item.ratePerSqft,
                                    installationCharge: item.installationCharge,
                                    printingCharge: item.printingCharge,
                                    netTotal: item.netTotal,
                                    computedArea: item.computedArea,
                                    computedBaseCost: item.computedBaseCost,
                                    computedNetTotal: item.computedNetTotal,
                                    view360Url: item.view360Url,
                                    rawImportData: item.rawImportData,
                                    importBatchId,
                                    // Update legacy fields for backward compatibility
                                    location: item.locationName,
                                    name: item.outletName,
                                    width: item.widthFt,
                                    height: item.heightFt,
                                    totalArea: item.areaSqft,
                                    rate: item.ratePerSqft,
                                },
                            });
                            updateCount++;
                            successCount++;
                        } else {
                            // Skip duplicate
                            skipCount++;
                        }
                    } else {
                        // Create new
                        await tx.inventoryHoarding.create({
                            data: {
                                sourceSrNo: item.sourceSrNo,
                                outletName: item.outletName,
                                locationName: item.locationName,
                                state: item.state,
                                district: item.district,
                                areaType: item.areaType,
                                widthFt: item.widthFt,
                                heightFt: item.heightFt,
                                areaSqft: item.areaSqft,
                                ratePerSqft: item.ratePerSqft,
                                installationCharge: item.installationCharge,
                                printingCharge: item.printingCharge,
                                netTotal: item.netTotal,
                                computedArea: item.computedArea,
                                computedBaseCost: item.computedBaseCost,
                                computedNetTotal: item.computedNetTotal,
                                view360Url: item.view360Url,
                                rawImportData: item.rawImportData,
                                importBatchId,
                                // Set legacy fields for backward compatibility
                                location: item.locationName,
                                name: item.outletName,
                                city: item.state, // Use state as city for now
                                width: item.widthFt,
                                height: item.heightFt,
                                totalArea: item.areaSqft,
                                rate: item.ratePerSqft,
                            },
                        });
                        successCount++;
                    }
                } catch (error) {
                    console.error("Error importing item:", error);
                    // Add to errors
                    errors.push({
                        rowNumber: 0, // We don't have row number here
                        srNo: item.sourceSrNo,
                        outletName: item.outletName,
                        errors: [error instanceof Error ? error.message : "Unknown error"],
                    });
                }
            }

            return { successCount, updateCount, skipCount };
        });

        // Generate error report if there are errors
        let errorReportCsv: string | null = null;
        if (errors.length > 0) {
            errorReportCsv = generateErrorReport(errors);
        }

        return NextResponse.json({
            success: true,
            message: `Import completed: ${results.successCount} items imported${results.updateCount > 0 ? ` (${results.updateCount} updated)` : ""
                }${results.skipCount > 0 ? `, ${results.skipCount} skipped` : ""}`,
            totalRows: data.length,
            successRows: results.successCount,
            failedRows: errors.length,
            skippedRows: results.skipCount,
            updatedRows: results.updateCount,
            errors,
            warnings,
            errorReportCsv,
            importBatchId,
        });
    } catch (error) {
        console.error("INVENTORY_IMPORT_ERROR", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Failed to import inventory",
            { status: 500 }
        );
    }
}
