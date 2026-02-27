"use client";

import { useEffect, useState, useCallback } from "react";

import { EditDocumentDialog, DeleteDocumentButton } from "./document-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Pencil, BookOpen } from "lucide-react";

type Item = {
    id: string;
    name: string;
    content: string | null;
    category: string | null;
    sourceId: string | null;
    meta: any;
    createdAt: string | null;
    updatedAt: string | null;
};

const categoryConfig: Record<string, { emoji: string; label: string; color: string }> = {
    product: { emoji: "🛍️", label: "Product", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    faq: { emoji: "❓", label: "FAQ", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    policy: { emoji: "📋", label: "Policy", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    promo: { emoji: "🎉", label: "Promo", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" },
    script: { emoji: "💬", label: "Script", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    general: { emoji: "📝", label: "General", color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
};

export default function KnowledgePageClient({
    initialItems,
    workspace
}: {
    initialItems: Item[],
    workspace: any | null
}) {
    const [allItems, setAllItems] = useState(initialItems);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<Item | null>(null);

    // Re-sync when server re-renders
    useEffect(() => {
        setAllItems(initialItems);
    }, [initialItems]);

    const filteredItems = allItems.filter((item) => {
        const matchesSearch = !search ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.content?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !activeCategory || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    // Count per category
    const categoryCounts = allItems.reduce((acc, item) => {
        const cat = item.category || "general";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const handleDeleted = useCallback(() => {
        // Items will be refreshed via revalidatePath on server
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                    <p className="text-muted-foreground">
                        Manage what your AI knows. Edit or delete items here.
                    </p>
                </div>
            </div>

            {/* Core Business Context */}
            {workspace && (
                <Card className="bg-muted/5 border-muted-foreground/20">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-semibold">Core Business Context</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Business Name</p>
                                <p className="text-sm font-medium">{workspace.businessName || workspace.name || "Not set"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Industry</p>
                                <p className="text-sm font-medium">{workspace.industry || "Not set"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tone of Voice</p>
                                <p className="text-sm font-medium">{workspace.toneOfVoice || "Professional"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Audience / About</p>
                                <p className="text-sm font-medium line-clamp-2">{workspace.about || "Not set"}</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 italic">
                            These fundamental settings are used by your AI Coach across all interactions. You can update them by chatting with your Coach.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {allItems.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Your Coach hasn't learned anything yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-6">
                            Go to the Coach page and start training your AI by chatting or uploading files.
                        </p>
                        <Button asChild>
                            <a href="/dashboard/coach">Go to Coach</a>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Search + Category Filter */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search knowledge base..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={!activeCategory ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveCategory(null)}
                                className="h-7 text-xs"
                            >
                                All ({allItems.length})
                            </Button>
                            {Object.entries(categoryConfig).map(([key, config]) => {
                                const cnt = categoryCounts[key] || 0;
                                if (cnt === 0) return null;
                                return (
                                    <Button
                                        key={key}
                                        variant={activeCategory === key ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                                        className="h-7 text-xs gap-1"
                                    >
                                        {config["emoji"]} {config["label"]} ({cnt})
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Items Grid */}
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No matching items found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {filteredItems.map((item) => {
                                const cat = categoryConfig[item.category || "general"] || categoryConfig["general"]!;
                                return (
                                    <Card key={item.id} className="group relative hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            {/* Category + Actions */}
                                            <div className="flex items-start justify-between mb-2">
                                                <Badge variant="secondary" className={`text-[10px] ${cat["color"]}`}>
                                                    {cat["emoji"]} {cat["label"]}
                                                </Badge>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingItem(item)}
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <DeleteDocumentButton itemId={item.id} itemName={item.name} onDeleted={handleDeleted} />
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</h3>

                                            {/* Content Preview */}
                                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                                                {item.content || "No content"}
                                            </p>

                                            {/* Footer */}
                                            {item.sourceId && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <span className="text-[10px] font-mono text-muted-foreground">
                                                        ref: {item.sourceId}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Edit Dialog */}
            {editingItem && (
                <EditDocumentDialog
                    item={editingItem}
                    open={true}
                    onClose={() => setEditingItem(null)}
                />
            )}
        </div>
    );
}
