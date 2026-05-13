/**
 * Inventory Import Utilities
 * Handles parsing, validation, and calculation for bulk inventory imports
 */

export interface ImportRow {
    'Inventory Code'?: string;
    'Code'?: string;
    'Sr no.'?: string | number;
    'Name of the Outlet'?: string;
    'Location'?: string;
    'Address'?: string; // New: Maps to locationName
    'State'?: string;
    'District'?: string;
    'Urban/ Highway/ Rural'?: string;
    'Width in ft'?: string | number;
    'Height in ft'?: string | number;
    'Total Area in Sq Ft'?: string | number;
    'Rates'?: string | number;
    'Dscounted Rates'?: string | number; // New
    'Installation Charge'?: string | number;
    'Printing Charge'?: string | number;
    'Printinting Charge'?: string | number; // New: Typo support
    'Net Total'?: string | number;
    '360 View'?: string;
    '360 View Link'?: string;
    '360 URL'?: string;
    'Three Sixty View'?: string;
    '360View'?: string;
    [key: string]: any; // Allow other fields
}

export interface ParsedInventoryItem {
    inventoryCode: string; // Mandatory
    sourceSrNo: number | null;
    outletName: string;
    locationName: string;
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
    computedBaseCost: number | null;
    computedNetTotal: number | null;
    view360Url: string | null;
    rawImportData: string;
}

export interface ValidationError {
    rowNumber: number;
    srNo: number | null;
    outletName: string | null;
    errors: string[];
}

export interface ImportResult {
    success: boolean;
    totalRows: number;
    successRows: number;
    failedRows: number;
    errors: ValidationError[];
    warnings: string[];
}

/**
 * Parse currency string to number
 * Handles formats like: ₹11,76,675 or 1176675 or 11,76,675.00
 */
export function parseCurrency(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;

    const str = String(value).trim();
    if (!str) return null;

    // Remove currency symbols and commas
    const cleaned = str.replace(/[₹$,\s]/g, '');

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

/**
 * Parse area type to enum
 */
export function parseAreaType(value: any): string | null {
    if (!value) return null;

    // Handle user input which might have newlines or extra spaces
    const str = String(value).trim().replace(/[\r\n]+/g, ' ').toUpperCase();

    if (str.includes('URBAN')) return 'URBAN';
    if (str.includes('HIGHWAY')) return 'HIGHWAY';
    if (str.includes('RURAL')) return 'RURAL';

    return null;
}

/**
 * Calculate area from width and height
 */
export function calculateArea(widthFt: number | null, heightFt: number | null): number | null {
    if (!widthFt || !heightFt) return null;
    if (widthFt <= 0 || heightFt <= 0) return null;

    return widthFt * heightFt;
}

/**
 * Calculate base cost
 */
export function calculateBaseCost(areaSqft: number | null, ratePerSqft: number | null): number | null {
    if (!areaSqft || !ratePerSqft) return null;
    if (areaSqft <= 0 || ratePerSqft <= 0) return null;

    return areaSqft * ratePerSqft;
}

/**
 * Calculate net total
 */
export function calculateNetTotal(
    baseCost: number | null,
    installationCharge: number | null,
    printingCharge: number | null
): number | null {
    if (baseCost === null) return null;

    const installation = installationCharge || 0;
    const printing = printingCharge || 0;

    return baseCost + installation + printing;
}

/**
 * Check if net total has significant mismatch (>1%)
 */
export function hasNetTotalMismatch(
    providedTotal: number | null,
    computedTotal: number | null
): boolean {
    if (!providedTotal || !computedTotal) return false;

    const diff = Math.abs(providedTotal - computedTotal);
    const percentDiff = (diff / computedTotal) * 100;

    return percentDiff > 1;
}

/**
 * Parse a single row from import file
 */
export function parseImportRow(row: ImportRow, rowNumber: number): {
    item: ParsedInventoryItem | null;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    const normalizedEntries = Object.entries(row).map(([key, value]) => ({
        normalizedKey: key.toLowerCase().replace(/[^a-z0-9]/g, ""),
        value,
    }))

    const pickStringValue = (keys: string[]) => {
        for (const key of keys) {
            const exact = row[key]
            const raw = exact ?? normalizedEntries.find((entry) => entry.normalizedKey === key.toLowerCase().replace(/[^a-z0-9]/g, ""))?.value
            if (raw === null || raw === undefined) continue
            const value = String(raw).trim()
            if (value) return value
        }
        return null
    }

    // Extract and validate required fields
    const outletName = row['Name of the Outlet']?.toString().trim() || '';

    // Support 'Address' (new) or 'Location' (old)
    const locationName = row['Address']?.toString().trim() || row['Location']?.toString().trim() || '';

    const state = row['State']?.toString().trim() || '';
    const district = row['District']?.toString().trim() || '';

    // Validate Inventory Code (Strict)
    const inventoryCode = row['Inventory Code']?.toString().trim() || row['Code']?.toString().trim();
    if (!inventoryCode) {
        errors.push("Inventory Code is MISSING. It is mandatory.");
    }

    // Validate required fields
    if (!outletName) errors.push('Outlet name is required');
    // We allow Location to be inferred or optional, but generally it's good to have.
    // However, previously it wasn't strictly enforcing locationName existence in the validator logic shown in the view, 
    // but the DB schema likely requires it or uses it.
    // The previous code didn't push error for missing locationName explicitly, so I won't either, 
    // but I'll ensure mapped correctly.

    if (!state) errors.push('State is required');
    if (!district) errors.push('District is required');

    // Parse optional fields
    const sourceSrNo = parseCurrency(row['Sr no.']);
    const areaType = parseAreaType(row['Urban/ Highway/ Rural']);
    const widthFt = parseCurrency(row['Width in ft']);
    const heightFt = parseCurrency(row['Height in ft']);
    const providedArea = parseCurrency(row['Total Area in Sq Ft']);

    // Rate: use 'Rates'
    // 'Dscounted Rates' is available but we currently map 'Rates' to ratePerSqft.
    // If the user intends 'Dscounted Rates' to be the one used, we might need to swap, 
    // but typically standard logic implies 'Rates' is the base.
    const ratePerSqft = parseCurrency(row['Rates']);

    const installationCharge = parseCurrency(row['Installation Charge']);

    // Support 'Printinting Charge' (typo) or 'Printing Charge'
    const printingCharge = parseCurrency(row['Printinting Charge']) ?? parseCurrency(row['Printing Charge']);

    const providedNetTotal = parseCurrency(row['Net Total']);
    const view360Url = pickStringValue([
        "360 View",
        "360 View Link",
        "360 URL",
        "Three Sixty View",
        "360View",
    ]);

    // Validate area type if provided
    if (row['Urban/ Highway/ Rural'] && !areaType) {
        errors.push(`Invalid area type: "${row['Urban/ Highway/ Rural']}". Must be Urban, Highway, or Rural`);
    }

    // Calculate or use provided area
    let areaSqft: number | null = null;
    let computedArea: number | null = null;

    if (providedArea && providedArea > 0) {
        areaSqft = providedArea;
        // Also compute from dimensions for validation
        computedArea = calculateArea(widthFt, heightFt);
    } else if (widthFt && heightFt) {
        computedArea = calculateArea(widthFt, heightFt);
        areaSqft = computedArea;
    }

    // Validate dimensions
    if (widthFt !== null && widthFt <= 0) errors.push('Width must be positive');
    if (heightFt !== null && heightFt <= 0) errors.push('Height must be positive');
    if (!areaSqft || areaSqft <= 0) errors.push('Area must be positive (provide area or width+height)');

    // Validate rate
    if (ratePerSqft !== null && ratePerSqft <= 0) errors.push('Rate must be positive');

    // Validate charges
    if (installationCharge !== null && installationCharge < 0) errors.push('Installation charge cannot be negative');
    if (printingCharge !== null && printingCharge < 0) errors.push('Printing charge cannot be negative');

    // Calculate costs
    const computedBaseCost = calculateBaseCost(areaSqft, ratePerSqft);
    const computedNetTotal = calculateNetTotal(computedBaseCost, installationCharge, printingCharge);

    // Use provided or computed net total
    let netTotal: number | null = null;
    if (providedNetTotal && providedNetTotal > 0) {
        netTotal = providedNetTotal;
        // Check for mismatch
        if (hasNetTotalMismatch(providedNetTotal, computedNetTotal)) {
            warnings.push(
                `Net total mismatch: Provided ₹${providedNetTotal.toLocaleString('en-IN')} vs Computed ₹${computedNetTotal?.toLocaleString('en-IN')} (>1% difference)`
            );
        }
    } else {
        netTotal = computedNetTotal;
    }

    // If there are critical errors, return null
    if (errors.length > 0) {
        return { item: null, errors, warnings };
    }

    // Create parsed item
    const item: ParsedInventoryItem = {
        inventoryCode: inventoryCode!,
        sourceSrNo: sourceSrNo ? Math.floor(sourceSrNo) : null,
        outletName,
        locationName,
        state,
        district,
        areaType,
        widthFt,
        heightFt,
        areaSqft,
        ratePerSqft,
        installationCharge,
        printingCharge,
        netTotal,
        computedArea,
        computedBaseCost,
        computedNetTotal,
        view360Url,
        rawImportData: JSON.stringify(row),
    };

    return { item, errors, warnings };
}

/**
 * Parse entire import file
 */
export function parseImportFile(rows: ImportRow[]): {
    items: ParsedInventoryItem[];
    errors: ValidationError[];
    warnings: string[];
} {
    const items: ParsedInventoryItem[] = [];
    const errors: ValidationError[] = [];
    const allWarnings: string[] = [];

    rows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because index starts at 0 and we skip header
        const { item, errors: rowErrors, warnings: rowWarnings } = parseImportRow(row, rowNumber);

        if (item) {
            items.push(item);

            // Add warnings with row context
            rowWarnings.forEach(warning => {
                allWarnings.push(`Row ${rowNumber}: ${warning}`);
            });
        } else {
            errors.push({
                rowNumber,
                srNo: parseCurrency(row['Sr no.']) ? Math.floor(parseCurrency(row['Sr no.'])!) : null,
                outletName: row['Name of the Outlet']?.toString().trim() || null,
                errors: rowErrors,
            });
        }
    });

    return { items, errors, warnings: allWarnings };
}

/**
 * Generate error report CSV
 */
export function generateErrorReport(errors: ValidationError[]): string {
    const headers = ['Row Number', 'Sr No', 'Outlet Name', 'Errors'];
    const rows = errors.map(error => [
        error.rowNumber.toString(),
        error.srNo?.toString() || '',
        error.outletName || '',
        error.errors.join('; '),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
}
