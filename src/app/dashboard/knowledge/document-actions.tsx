"use client";

import { useState, useTransition } from "react";
import { updateItem, deleteItem } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";

const categories = [
    { value: "product", label: "🛍️ Product" },
    { value: "faq", label: "❓ FAQ" },
    { value: "policy", label: "📋 Policy" },
    { value: "promo", label: "🎉 Promotion" },
    { value: "script", label: "💬 Script" },
    { value: "general", label: "📝 General" },
];

type Item = {
    id: string;
    name: string;
    content: string | null;
    category: string | null;
    sourceId: string | null;
    meta: any;
};

export function EditDocumentDialog({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
    const [name, setName] = useState(item.name);
    const [content, setContent] = useState(item.content || "");
    const [category, setCategory] = useState(item.category || "general");
    const [sourceId, setSourceId] = useState(item.sourceId || "");

    // Parse meta if it exists (it's JSON in DB but might be object here if not serialized? Actually item is from client prop)
    // The Item type definition needs to include meta
    const meta = (item as any).meta || {};
    const [price, setPrice] = useState(meta.price || "");
    const [discount, setDiscount] = useState(meta.discount || "");
    const [inStock, setInStock] = useState(meta.inStock !== false); // default true if undefined
    const [isPending, startTransition] = useTransition();

    function handleSave() {
        startTransition(async () => {
            await updateItem({
                id: item.id,
                name,
                content,
                category,
                sourceId: sourceId || null,
                price,
                discount,
                inStock,
            });
            onClose();
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Edit Document</DialogTitle>
                    <DialogDescription>Update this entry. The AI embedding will be regenerated automatically.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Category</Label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${category === cat.value
                                        ? "border-primary bg-primary/10 font-medium"
                                        : "border-border hover:border-primary/50"
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label>Title</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                    </div>
                    {category === "product" && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border mb-4">
                            <div>
                                <Label className="text-xs">Price</Label>
                                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$0.00" className="mt-1 h-8" />
                            </div>
                            <div>
                                <Label className="text-xs">Discount</Label>
                                <Input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 10%" className="mt-1 h-8" />
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit-instock"
                                    checked={inStock}
                                    onChange={(e) => setInStock(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary"
                                />
                                <Label htmlFor="edit-instock" className="text-sm cursor-pointer">In Stock</Label>
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>Content</Label>
                        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="mt-1 min-h-[120px]" />
                    </div>
                    <div>
                        <Label>Reference ID</Label>
                        <Input value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="mt-1" placeholder="Optional" />
                    </div>
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isPending} className="gap-2">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteDocumentButton({ itemId, itemName, onDeleted }: { itemId: string; itemName: string; onDeleted: () => void }) {
    const [confirming, setConfirming] = useState(false);
    const [isPending, startTransition] = useTransition();

    if (confirming) {
        return (
            <div className="flex items-center gap-1">
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                        startTransition(async () => {
                            await deleteItem(itemId);
                            onDeleted();
                            setConfirming(false);
                        });
                    }}
                    className="gap-1 text-xs"
                >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} className="text-xs">
                    Cancel
                </Button>
            </div>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="text-muted-foreground hover:text-destructive"
            title={`Delete "${itemName}"`}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );
}
