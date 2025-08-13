'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <header className="sticky mt-4 top-4 z-50 px-2 md:px-4 md:flex justify-center">
            <nav className="border border-[#2C2C2C] px-4 flex items-center backdrop-filter backdrop-blur-xl bg-[#0D0C0D]/80 h-[50px] z-20 relative">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <span className="sr-only">Codexp AI Logo</span>
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 28 28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-6 text-[#F5F5F3]"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M8 6l4 6-4 6" />
                        <path d="M16 6l4 6-4 6" />
                        <path d="M2 3h20v18H2z" />
                    </svg>
                    <span className="font-semibold text-lg text-[#F5F5F3]">Codexp</span>
                </Link>

                {/* Desktop Navigation */}
                <ul className="space-x-2 font-medium text-sm hidden md:flex mx-3">
                    <li>
                        <Link
                            href="#features"
                            className="h-8 items-center justify-center text-sm font-medium transition-opacity hover:opacity-70 duration-200 px-3 py-2 inline-flex text-[#878787] cursor-pointer"
                        >
                            Features
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="#pricing"
                            className="h-8 items-center justify-center text-sm font-medium px-3 py-2 inline-flex text-[#878787] transition-opacity hover:opacity-70 duration-200"
                        >
                            Pricing
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="#demo"
                            className="h-8 items-center justify-center text-sm font-medium px-3 py-2 inline-flex text-[#878787] transition-opacity hover:opacity-70 duration-200"
                        >
                            Demo
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="#docs"
                            className="h-8 items-center justify-center text-sm font-medium px-3 py-2 inline-flex text-[#878787] transition-opacity hover:opacity-70 duration-200"
                        >
                            Docs
                        </Link>
                    </li>

                </ul>

                {/* Mobile menu button */}
                <button
                    type="button"
                    className="ml-auto md:hidden p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Menu className="w-[18px] h-[13px] text-[#F5F5F3]" />
                </button>

                {/* Sign in - Desktop */}
                <Link
                    href="/signin"
                    className="text-sm font-medium pr-2 border-l-[1px] border-[#2C2C2C] pl-4 hidden md:block text-[#878787] hover:text-[#F5F5F3] transition-colors"
                >
                    Sign in
                </Link>
            </nav>

            {/* Mobile Navigation Overlay */}
            {isMenuOpen && (
                <div className="fixed w-screen h-screen backdrop-blur-md left-0 top-0 z-10 md:hidden">
                    <div className="p-6 mt-20 mx-4 border border-[#2C2C2C] bg-[#0D0C0D]/95">
                        <nav className="flex flex-col space-y-4">
                            <Link href="#features" className="text-[#878787] hover:text-[#F5F5F3] transition-colors text-sm py-2">
                                Features
                            </Link>
                            <Link href="#pricing" className="text-[#878787] hover:text-[#F5F5F3] transition-colors text-sm py-2">
                                Pricing
                            </Link>
                            <Link href="#demo" className="text-[#878787] hover:text-[#F5F5F3] transition-colors text-sm py-2">
                                Demo
                            </Link>
                            <Link href="#docs" className="text-[#878787] hover:text-[#F5F5F3] transition-colors text-sm py-2">
                                Docs
                            </Link>

                            <div className="pt-4 border-t border-[#2C2C2C]">
                                <Link
                                    href="/signin"
                                    className="block text-[#878787] hover:text-[#F5F5F3] transition-colors text-sm py-2"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </nav>
                    </div>
                </div>
            )}
        </header>
    )
}