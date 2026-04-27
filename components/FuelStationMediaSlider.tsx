"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

type CampaignImage = {
    src: string
    alt: string
}

type FuelStationMediaSliderProps = {
    images: CampaignImage[]
}

function getItemsPerView(windowWidth: number) {
    if (windowWidth >= 1536) return 3
    if (windowWidth >= 1024) return 2
    return 1
}

export default function FuelStationMediaSlider({ images }: FuelStationMediaSliderProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [windowWidth, setWindowWidth] = useState(1280)
    const [isPaused, setIsPaused] = useState(false)

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const itemsPerView = getItemsPerView(windowWidth)
    const maxIndex = Math.max(0, images.length - itemsPerView)
    const safeCurrentIndex = Math.min(currentIndex, maxIndex)
    const shouldSlide = images.length > itemsPerView
    const translateX = -(safeCurrentIndex * (100 / itemsPerView))

    useEffect(() => {
        if (!shouldSlide || isPaused) return

        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                const normalized = Math.min(prev, maxIndex)
                return normalized >= maxIndex ? 0 : normalized + 1
            })
        }, 3200)

        return () => clearInterval(timer)
    }, [isPaused, maxIndex, shouldSlide])

    const handlePrev = () => {
        setCurrentIndex((prev) => {
            const normalized = Math.min(prev, maxIndex)
            return normalized === 0 ? maxIndex : normalized - 1
        })
    }

    const handleNext = () => {
        setCurrentIndex((prev) => {
            const normalized = Math.min(prev, maxIndex)
            return normalized >= maxIndex ? 0 : normalized + 1
        })
    }

    if (!images.length) return null

    return (
        <div
            className="relative max-w-7xl mx-auto mb-24"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocusCapture={() => setIsPaused(true)}
            onBlurCapture={() => setIsPaused(false)}
        >
            <button
                onClick={handlePrev}
                className="absolute left-3 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 bg-[#002147] text-white rounded-full shadow-lg hover:bg-[#00336b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Previous campaign image"
                disabled={!shouldSlide}
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <button
                onClick={handleNext}
                className="absolute right-3 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 md:w-12 md:h-12 bg-[#002147] text-white rounded-full shadow-lg hover:bg-[#00336b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Next campaign image"
                disabled={!shouldSlide}
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            <div className="overflow-hidden py-4">
                <div
                    className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transform: `translateX(${translateX}%)` }}
                >
                    {images.map((image, index) => (
                        <div
                            key={`${image.src}-${index}`}
                            className="relative z-0 flex-shrink-0 px-3 md:px-4 transition-[z-index] duration-300 hover:z-30"
                            style={{ width: `${100 / itemsPerView}%` }}
                        >
                            <div className="group relative aspect-[5/4] rounded-3xl overflow-hidden border border-slate-200 shadow-lg transition-all duration-500 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.06] hover:shadow-2xl">
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 50vw, 33vw"
                                    priority={index < 3}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {maxIndex > 0 && (
                <div className="flex justify-center mt-6 gap-2">
                    {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2.5 rounded-full transition-all ${safeCurrentIndex === index ? "w-6 bg-[#002147]" : "w-2.5 bg-[#94a3b8]"}`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
