
"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/profile-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save, Loader2, Target, MessageCircle, Info } from "lucide-react";


export function ProfileForm({ initialData }: { initialData: any }) {
    const [isPending, startTransition] = useTransition();

    // If no initial data, default to empty strings to avoid uncontrolled inputs
    const [formData, setFormData] = useState({
        businessName: initialData?.businessName || "",
        industry: initialData?.industry || "",
        about: initialData?.about || "",
        targetAudience: initialData?.targetAudience || "",
        toneOfVoice: initialData?.toneOfVoice || "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                await updateProfile(formData);
                // Simple toast/alert simulation if no toast lib
                const event = new CustomEvent("toast", { detail: "Profile updated successfully!" });
                window.dispatchEvent(event);
            } catch (error) {
                console.error(error);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">

                {/* Identity Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" /> Business Identity
                        </CardTitle>
                        <CardDescription>
                            The core details of your business. The AI uses this to understand who it represents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Business Name</Label>
                            <Input
                                placeholder="e.g. Luxe Salon & Spa"
                                value={formData.businessName}
                                onChange={(e) => handleChange("businessName", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Industry / Niche</Label>
                            <Input
                                placeholder="e.g. Beauty & Wellness"
                                value={formData.industry}
                                onChange={(e) => handleChange("industry", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Brand Voice Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" /> Brand Voice
                        </CardTitle>
                        <CardDescription>
                            How should the AI sound when talking to customers?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tone of Voice</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.toneOfVoice}
                                onChange={(e) => handleChange("toneOfVoice", e.target.value)}
                            >
                                <option value="">Select a tone...</option>
                                <option value="Professional & Formal">Professional & Formal</option>
                                <option value="Friendly & Casual">Friendly & Casual</option>
                                <option value="Enthusiastic & Energetic">Enthusiastic & Energetic</option>
                                <option value="Empathetic & Supportive">Empathetic & Supportive</option>
                                <option value="Witty & Humorous">Witty & Humorous</option>
                                <option value="Luxury & Sophisticated">Luxury & Sophisticated</option>
                            </select>
                            <Input
                                className="mt-2"
                                placeholder="Or type a custom tone..."
                                value={formData.toneOfVoice}
                                onChange={(e) => handleChange("toneOfVoice", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Context Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" /> Context & Details
                        </CardTitle>
                        <CardDescription>
                            Give the AI background context.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>About Us (The "Who")</Label>
                                <Textarea
                                    rows={5}
                                    placeholder="We are a family-owned salon established in 2010. We specialize in organic hair treatments..."
                                    value={formData.about}
                                    onChange={(e) => handleChange("about", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Include your history, mission, or unique selling points.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Audience (The "Who for")</Label>
                                <Textarea
                                    rows={5}
                                    placeholder="Busy professionals in downtown, looking for quick but high-quality service..."
                                    value={formData.targetAudience}
                                    onChange={(e) => handleChange("targetAudience", e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Helps the AI tailor its language to your customers.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isPending} size="lg">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                </Button>
            </div>

            {/* Simple Success Message (Ephemeral) */}
            <div id="success-msg" className="hidden fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg">
                Saved!
            </div>
            <script dangerouslySetInnerHTML={{
                __html: `
                window.addEventListener('toast', () => {
                    const el = document.getElementById('success-msg');
                    el.classList.remove('hidden');
                    setTimeout(() => el.classList.add('hidden'), 3000);
                });
            `}} />
        </form>
    );
}
