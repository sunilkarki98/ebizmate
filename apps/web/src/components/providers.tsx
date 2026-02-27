"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(
    () => import("sonner").then((mod) => mod.Toaster),
    { ssr: false }
);

/**
 * Client-side providers wrapper.
 * Uses dynamic import with ssr:false to prevent useContext crashes
 * during static page generation (SSG) of internal Next.js pages.
 */
export function Providers() {
    return <Toaster />;
}
