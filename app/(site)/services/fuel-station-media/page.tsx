import CartFooter from "@/components/CartFooter"
import FuelStationMediaSlider from "@/components/FuelStationMediaSlider"
import fs from "fs/promises"
import path from "path"

export default async function FuelStationMediaPage() {
    const imageDirectory = path.join(process.cwd(), "public", "images", "fuel-station-media")

    const imageFiles = (await fs.readdir(imageDirectory))
        .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file))
        .sort((first, second) => first.localeCompare(second))

    const campaigns = imageFiles.map((fileName, index) => ({
        src: `/images/fuel-station-media/${encodeURIComponent(fileName)}`,
        alt: `Fuel station campaign ${index + 1}`
    }))

    return (
        <main className="min-h-screen bg-white py-20 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">

                {/* Page Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-[#002147] mb-4 text-center uppercase tracking-wide">
                    Fuel Station Media
                </h1>
                <p className="text-gray-700 text-center mb-12 max-w-3xl mx-auto text-lg">
                    Maximize your brand&apos;s presence with OOH media at fuel stations. Capture attention in high-traffic zones and connect with target audiences through strategically placed, high-visibility branding.
                </p>

                {/* Our Campaigns Section */}
                <h2 className="text-3xl font-bold text-[#002147] mb-8 text-center uppercase tracking-wide">
                    Our Campaigns
                </h2>
                <FuelStationMediaSlider images={campaigns} />

            </div>
            <CartFooter />
        </main>
    )
}
