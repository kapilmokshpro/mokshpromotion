"use client"

import { useState, useEffect } from "react"
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

const clients = [
    { name: "Bank of Maharashtra", logo: "/images/clients/bank.png" },
    { name: "Cars24", logo: "/images/clients/cars24.webp" },
    { name: "SBI", logo: "/images/clients/sbi.png" },
    { name: "PNB", logo: "/images/clients/pnb.png" },
    { name: "Raymond", logo: "/images/clients/raymond.png" },
    { name: "Bank of Maharashtra", logo: "/images/clients/bank.png" },
    { name: "Cars24", logo: "/images/clients/cars24.webp" },
    { name: "SBI", logo: "/images/clients/sbi.png" },
    { name: "PNB", logo: "/images/clients/pnb.png" },
    { name: "Raymond", logo: "/images/clients/raymond.png" },
];

export default function ClientsSection() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [windowWidth, setWindowWidth] = useState(1024);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Enforce 5 visible cards on desktop as requested
    const itemsPerScreen = windowWidth >= 1024 ? 5 : (windowWidth >= 768 ? 3 : 1);

    // We want the carousel to scroll one by one or nicely. 
    // To make the center active logic work well, we need to know which index is "center".
    // If we show 5 items, the one at mapped index 2 (0,1,2,3,4) is center.
    // But since the list slides, we need to calculate the relative center.

    // Simply: The item at `currentIndex + 2` relative to the view is the center.
    // Actually, visually, if we start at `currentIndex`, the item at `currentIndex + 2` is the 3rd visible one.

    const maxIndex = Math.max(0, clients.length - itemsPerScreen);

    // Auto Slide
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
        }, 3000);
        return () => clearInterval(timer);
    }, [maxIndex]);

    const handlePrev = () => {
        setCurrentIndex(prev => (prev === 0 ? maxIndex : prev - 1));
    }

    const handleNext = () => {
        setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
    }

    const translateX = -(currentIndex * (100 / itemsPerScreen));

    return (
        <section className="py-20 bg-[#002147] text-white relative overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <span className="text-[#4cd964] font-bold tracking-widest uppercase text-xs mb-3 block">
                        Our Partners
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-wide text-white">
                        Meet Our Clients
                    </h2>
                    <p className="text-blue-200 text-lg font-light">
                        Trusted by leading brands across industries
                    </p>
                </div>

                <div className="relative group px-4 md:px-12">
                    {/* Arrows */}
                    <button
                        onClick={handlePrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 bg-white/10 hover:bg-white text-white hover:text-[#002147] p-3 rounded-full transition-all shadow-lg backdrop-blur-sm hidden md:flex items-center justify-center"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 bg-white/10 hover:bg-white text-white hover:text-[#002147] p-3 rounded-full transition-all shadow-lg backdrop-blur-sm hidden md:flex items-center justify-center"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Viewport */}
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-700"
                            style={{
                                transform: `translateX(${translateX}%)`,
                                transitionTimingFunction: "cubic-bezier(0.25,1,0.5,1)",
                            }}
                        >
                            {clients.map((client, idx) => {
                                // Calculate if this specific card is currently the "center" card.
                                // The visible window starts at `currentIndex`.
                                // The center position is `currentIndex + 2` (for 5 items).
                                // `idx` is the absolute index in the array.
                                const isCenter = idx === (currentIndex + Math.floor(itemsPerScreen / 2));

                                return (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 px-3 cursor-pointer"
                                        style={{ width: `${100 / itemsPerScreen}%` }}
                                    >
                                        <div className={`
                                            bg-white rounded-2xl p-6 aspect-[4/3] flex items-center justify-center shadow-xl border border-white/10 relative overflow-hidden transition-all duration-500
                                            ${isCenter
                                                ? "scale-110 shadow-2xl shadow-[#4cd964]/30 z-10 -translate-y-2"
                                                : "shadow-black/20 hover:scale-105 hover:shadow-2xl hover:shadow-[#4cd964]/20 hover:-translate-y-1"
                                            }
                                        `}>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-white opacity-50"></div>
                                            <div className={`
                                                relative w-full h-full p-2 transition-all duration-500
                                                ${isCenter
                                                    ? "grayscale-0 opacity-100 scale-110"
                                                    : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                                                }
                                            `}>
                                                <Image
                                                    src={client.logo}
                                                    alt={client.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 20vw"
                                                    className="object-contain"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
