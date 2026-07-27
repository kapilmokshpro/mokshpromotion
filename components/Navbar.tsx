"use client";

import Link from "next/link";
import { ChevronDown, ArrowUpRight, ShoppingCart, User, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Navbar() {
    const pathname = usePathname() ?? "";
    const { data: session } = useSession();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openMobileSubmenu, setOpenMobileSubmenu] = useState<string | null>(null);

    const toggleSubmenu = (name: string) => {
        setOpenMobileSubmenu((prev) => (prev === name ? null : name));
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    const isActive = (path: string) => {
        if (path === "/") {
            return pathname === "/";
        }
        return pathname?.startsWith(path);
    };

    const navLinks = [
        { name: "HOME", path: "/" },
        { name: "PETROLPUMP MEDIA", path: "/petrolpump-media" },
        { name: "OOH", path: "/oh" },
        {
            name: "SERVICES",
            path: "/services",
            children: [
                { name: "FUEL STATION MEDIA", path: "/services/fuel-station-media", separator: true },
                { name: "BTL/ATL", path: "/services/btl-atl" },
                { name: "DISPLAY SPACE", path: "/services/display-space" },
                { name: "BRANDINGS", path: "/services/brandings" },
            ]
        },
        { name: "CASE STUDY", path: "/case-study" },
        { name: "BLOG", path: "/blog" },
        {
            name: "MORE",
            path: "#",
            children: [
                { name: "GALLERY", path: "/gallery" },
                { name: "ABOUT US", path: "/about-us" },
                { name: "CONTACT", path: "/contact" },
            ]
        },
    ];

    const crmHref = session ? "/crm-dashboard" : "/crm-dashboard/login";

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 ${scrolled
                ? "bg-[#002147]/90 backdrop-blur-md shadow-md py-2"
                : "bg-[#002147] py-4"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left: Logo */}
                    <div className="flex-shrink-0 flex items-center gap-3">
                        <Link href="/">
                            <div className="bg-white p-2 rounded-sm transition-transform hover:scale-105">
                                <Image
                                    src="/images/logo.png"
                                    alt="Moksh Promotion Limited"
                                    width={140}
                                    height={45}
                                    className="h-8 w-auto object-contain"
                                    priority
                                />
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <div key={link.name} className="relative group">
                                <Link
                                    href={link.path}
                                    prefetch={false}
                                    className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-blue-300 ${isActive(link.path) ? "text-white font-bold" : "text-gray-300"
                                        }`}
                                >
                                    {link.name}
                                    {link.children && (
                                        <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                                    )}
                                </Link>

                                {/* Dropdown Menu */}
                                {link.children && (
                                    <div className="absolute left-0 pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out transform group-hover:translate-y-0 translate-y-2">
                                        <div className="bg-[#002147] border border-white/10 rounded-md shadow-xl py-2">
                                            {link.children.map((child) => (
                                                <Link
                                                    key={child.name}
                                                    href={child.path}
                                                    prefetch={false}
                                                    className={`block px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors ${child.separator ? "border-b border-white/20 mb-1" : ""
                                                        }`}
                                                >
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right: Actions */}
                    <div className="hidden md:flex items-center gap-6">
                        <CartIcon />
                        <UserMenu />
                        <Link
                            href="/contact"
                            className="group flex items-center gap-2 border border-white/30 px-5 py-2 rounded-full text-sm font-medium text-white hover:bg-white hover:text-[#002147] transition-all"
                        >
                            Get in Touch
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href={crmHref}
                            className="group flex items-center gap-2 border border-amber-400/35 px-5 py-2 rounded-full text-sm font-semibold text-amber-100 bg-amber-400/10 hover:bg-amber-400 hover:text-[#002147] transition-all"
                        >
                            CRM
                            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <CartIcon />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-white hover:text-gray-300 transition"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-[#002147] border-t border-white/10 fixed inset-x-0 top-[64px] bottom-0 z-[60] animate-fade-in-up shadow-xl overflow-y-auto pb-24">
                    <div className="px-4 pt-3 pb-8 space-y-4 flex flex-col items-center">
                        {navLinks.map((link) => {
                            const isSubmenuOpen = openMobileSubmenu === link.name;
                            return (
                                <div key={link.name} className="w-full flex flex-col items-center">
                                    {link.children ? (
                                        <>
                                            <button
                                                onClick={() => toggleSubmenu(link.name)}
                                                className={`flex items-center gap-2 text-base font-medium py-2 ${isActive(link.path) || isSubmenuOpen ? "text-white" : "text-gray-400"}`}
                                            >
                                                {link.name}
                                                <ChevronDown className={`w-4 h-4 transition-transform ${isSubmenuOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {/* Mobile Submenu */}
                                            {isSubmenuOpen && (
                                                <div className="w-full flex flex-col items-center bg-[#00152e] rounded-md py-2 mt-1 space-y-2">
                                                    {link.children.map((child) => (
                                                        <Link
                                                            key={child.name}
                                                            href={child.path}
                                                            prefetch={false}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className={`text-sm text-gray-400 hover:text-white py-1.5 ${child.separator ? "font-bold text-white border-b border-white/10 w-3/4 text-center mb-1" : ""}`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link
                                            href={link.path}
                                            prefetch={false}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`text-base font-medium py-2 ${isActive(link.path) ? "text-white" : "text-gray-400"}`}
                                        >
                                            {link.name}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                        <div className="h-px w-full bg-white/10 my-2"></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-2">
                            <Link
                                href="/contact"
                                prefetch={false}
                                onClick={() => setMobileMenuOpen(false)}
                                className="w-full text-center bg-white text-[#002147] font-bold py-3 px-2 rounded-md text-sm transition-all hover:bg-slate-100 flex items-center justify-center shadow-sm"
                            >
                                Get in Touch
                            </Link>
                            <Link
                                href={crmHref}
                                prefetch={false}
                                onClick={() => setMobileMenuOpen(false)}
                                className="w-full text-center border border-amber-400/35 bg-amber-400/10 text-amber-100 font-semibold py-3 px-2 rounded-md text-sm transition-all hover:bg-amber-400/20 flex items-center justify-center shadow-sm"
                            >
                                CRM
                            </Link>
                        </div>
                        <UserMenu mobile />
                    </div>
                </div>
            )}
        </nav>
    );
}

function CartIcon() {
    const { cartCount } = useCart()
    if (cartCount === 0) return null

    return (
        <Link href="/cart" className="relative p-2 text-white hover:text-blue-300 transition-colors">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                {cartCount}
            </span>
        </Link>
    )
}

function UserMenu({ mobile }: { mobile?: boolean }) {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)

    if (!session) {
        return (
            <Link
                href="/client-login"
                className={`text-sm font-medium hover:text-white transition-colors ${mobile ? "text-gray-300 text-base" : "text-gray-300"}`}
            >
                Login
            </Link>
        )
    }

    if (mobile) {
        return (
            <div className="flex items-center justify-between gap-3 w-full pt-3 border-t border-white/10 mt-3">
                <div className="flex items-center gap-2 text-white min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        {session.user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                    </div>
                    <span className="font-semibold text-sm truncate">{session.user?.name}</span>
                    {(session.user as any)?.role === 'ADMIN' && (
                        <Link href="/dashboard/admin" className="text-[11px] font-semibold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.5 rounded shrink-0">
                            Admin
                        </Link>
                    )}
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-red-400 hover:text-red-300 font-medium text-xs border border-red-400/30 bg-red-500/10 px-3 py-1.5 rounded-md transition-all shrink-0 ml-auto"
                >
                    Sign Out
                </button>
            </div>
        )
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-medium hover:text-gray-300 transition-colors focus:outline-none"
            >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white ring-2 ring-white/20 hover:ring-white/40 transition-all shadow-md">
                    <span className="text-sm font-bold">{session.user?.name?.charAt(0).toUpperCase()}</span>
                </div>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 text-gray-800 ring-1 ring-black ring-opacity-5 animate-fade-in z-[60]">
                    <div className="px-5 py-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Signed in as</p>
                        <p className="font-bold text-gray-900 truncate">{session.user?.email}</p>
                    </div>

                    <div className="py-1">
                        <Link
                            href="/orders"
                            className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            My Orders
                        </Link>
                        {(session.user as any)?.role === 'ADMIN' && (
                            <Link
                                href="/dashboard/admin"
                                className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Admin Dashboard
                            </Link>
                        )}
                    </div>

                    <div className="border-t border-gray-100 mt-1 py-1">
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
