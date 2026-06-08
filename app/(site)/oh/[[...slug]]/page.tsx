import CartFooter from "@/components/CartFooter"
import InventoryList from "@/components/InventoryList"

export const dynamic = "force-static"

const outdoorMediaInventory = [
    {
        id: 900001,
        outletName: "BTL Activity Zone",
        locationName: "Connaught Place activation area",
        state: "Delhi",
        district: "New Delhi",
        widthFt: 20,
        heightFt: 10,
        width: null,
        height: null,
        ratePerSqft: 450,
        discountedRate: null,
        rate: null,
        areaType: "BTL Activity",
        totalArea: null,
        areaSqft: 200,
        printingCharge: 12000,
        installationCharge: 8000,
        netTotal: 110000,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900002,
        outletName: "Canopy Branding",
        locationName: "Karol Bagh market frontage",
        state: "Delhi",
        district: "New Delhi",
        widthFt: 12,
        heightFt: 8,
        width: null,
        height: null,
        ratePerSqft: 380,
        discountedRate: null,
        rate: null,
        areaType: "Canopy",
        totalArea: null,
        areaSqft: 96,
        printingCharge: 7000,
        installationCharge: 5000,
        netTotal: 48500,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900003,
        outletName: "Bus Branding",
        locationName: "Andheri to Bandra route",
        state: "Maharashtra",
        district: "Mumbai",
        widthFt: 30,
        heightFt: 8,
        width: null,
        height: null,
        ratePerSqft: 520,
        discountedRate: null,
        rate: null,
        areaType: "Bus Branding",
        totalArea: null,
        areaSqft: 240,
        printingCharge: 18000,
        installationCharge: 12000,
        netTotal: 154800,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900004,
        outletName: "Autohood Branding",
        locationName: "Bandra West auto stand network",
        state: "Maharashtra",
        district: "Mumbai",
        widthFt: 6,
        heightFt: 4,
        width: null,
        height: null,
        ratePerSqft: 300,
        discountedRate: null,
        rate: null,
        areaType: "Autohood",
        totalArea: null,
        areaSqft: 24,
        printingCharge: 2500,
        installationCharge: 1500,
        netTotal: 11200,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900005,
        outletName: "Unipole Display",
        locationName: "MG Road arterial visibility",
        state: "Karnataka",
        district: "Bengaluru",
        widthFt: 40,
        heightFt: 20,
        width: null,
        height: null,
        ratePerSqft: 650,
        discountedRate: null,
        rate: null,
        areaType: "Unipole",
        totalArea: null,
        areaSqft: 800,
        printingCharge: 45000,
        installationCharge: 35000,
        netTotal: 600000,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900006,
        outletName: "Metro Branding",
        locationName: "Indiranagar metro concourse",
        state: "Karnataka",
        district: "Bengaluru",
        widthFt: 18,
        heightFt: 8,
        width: null,
        height: null,
        ratePerSqft: 560,
        discountedRate: null,
        rate: null,
        areaType: "Metro Branding",
        totalArea: null,
        areaSqft: 144,
        printingCharge: 10000,
        installationCharge: 9000,
        netTotal: 99640,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900007,
        outletName: "Roadside Media",
        locationName: "SG Highway roadside panel",
        state: "Gujarat",
        district: "Ahmedabad",
        widthFt: 20,
        heightFt: 10,
        width: null,
        height: null,
        ratePerSqft: 420,
        discountedRate: null,
        rate: null,
        areaType: "Roadside Media",
        totalArea: null,
        areaSqft: 200,
        printingCharge: 13000,
        installationCharge: 9000,
        netTotal: 106000,
        availabilityStatus: "AVAILABLE",
    },
    {
        id: 900008,
        outletName: "Standee Placement",
        locationName: "Vastrapur retail cluster",
        state: "Gujarat",
        district: "Ahmedabad",
        widthFt: 3,
        heightFt: 6,
        width: null,
        height: null,
        ratePerSqft: 250,
        discountedRate: null,
        rate: null,
        areaType: "Standee",
        totalArea: null,
        areaSqft: 18,
        printingCharge: 1500,
        installationCharge: 1000,
        netTotal: 7000,
        availabilityStatus: "AVAILABLE",
    },
]

export default function OutdoorHoardingPage() {
    return (
        <main className="min-h-screen bg-white py-20 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-[#002147] mb-3 text-center uppercase tracking-wide">
                        Outdoor Media
                    </h2>
                    <p className="mx-auto mb-8 max-w-3xl text-center text-sm text-gray-600">
                        Static inventory for BTL activity, canopy, autohood, bus branding, unipoles, roadside media, standee, and metro branding.
                    </p>

                    <InventoryList
                        inventory={outdoorMediaInventory}
                        basePath="/oh"
                        itemLabel="Media"
                        itemsLabel="Media Options"
                        emptyItemLabel="media"
                    />
                </div>
            </div>
            <CartFooter />
        </main>
    )
}
