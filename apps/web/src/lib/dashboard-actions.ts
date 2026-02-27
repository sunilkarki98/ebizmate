"use server";

import { apiClient } from "@/lib/api-client";

export async function getDashboardOverviewAction() {
    try {
        return await apiClient(`/dashboard/overview`, {
            next: {
                revalidate: 60 // Cache for 60 seconds
            }
        });
    } catch {
        return null;
    }
}
