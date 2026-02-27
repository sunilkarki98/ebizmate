import { getWebhooksAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Webhook, CheckCircle, XCircle } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getWebhookSecretsAction } from "@/lib/admin-actions";
import { CopyInput, SecretDisplay, TestPayloadButton } from "@/components/admin/webhook-utils";

export default async function WebhooksPage() {
    const connections = await getWebhooksAction();
    const secrets = await getWebhookSecretsAction();

    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] || process.env["VERCEL_URL"] || "https://your-domain.com";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Webhooks & Connections</h1>
                    <p className="text-muted-foreground">Platform integrations and webhook endpoints.</p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                    <Webhook className="h-4 w-4" />
                    <span className="text-sm font-medium">{connections.length} Connections</span>
                </div>
            </div>

            {/* Webhook URL Reference */}
            <Card>
                <CardHeader>
                    <CardTitle>Webhook Endpoints</CardTitle>
                    <CardDescription>Use these URLs when configuring platform integrations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-4">
                        <div className="grid gap-1 flex-1">
                            <div className="text-sm font-medium">TikTok Webhook</div>
                            <CopyInput value={`${baseUrl}/api/webhook/tiktok`} />
                        </div>
                        <Badge variant="outline" className="shrink-0">POST</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-4">
                        <div className="grid gap-1 flex-1">
                            <div className="text-sm font-medium">Instagram Webhook</div>
                            <CopyInput value={`${baseUrl}/api/webhook/instagram`} />
                        </div>
                        <Badge variant="outline" className="shrink-0">POST</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-4">
                        <div className="grid gap-1 flex-1">
                            <div className="text-sm font-medium">Generic Webhook</div>
                            <CopyInput value={`${baseUrl}/api/webhook/generic`} />
                        </div>
                        <Badge variant="outline" className="shrink-0">POST</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Configuration & Secrets */}
            <Card>
                <CardHeader>
                    <CardTitle>Configuration & Secrets</CardTitle>
                    <CardDescription>Secure credentials for verifying incoming webhook signatures.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Webhook Secret (Signature)</span>
                            <SecretDisplay value={secrets.secret} />
                            <p className="text-xs text-muted-foreground">Used to verify <code>x-signature</code> header.</p>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Verify Token (Challenge)</span>
                            <SecretDisplay value={secrets.verifyToken} />
                            <p className="text-xs text-muted-foreground">Used for initial handshake (GET request).</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium">Test Payload Generator</div>
                                <p className="text-xs text-muted-foreground">Copy a sample JSON payload to test your endpoint locally or via Postman.</p>
                            </div>
                            <TestPayloadButton />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Connected Workspaces */}
            <Card>
                <CardHeader>
                    <CardTitle>Connected Workspaces</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Workspace</TableHead>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Handle</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Connected</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {connections.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">No connections configured.</TableCell>
                                    </TableRow>
                                ) : (
                                    connections.map((conn: any) => (
                                        <TableRow key={conn.id}>
                                            <TableCell className="font-medium">{conn.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{conn.platform || "generic"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {conn.platformHandle || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {conn.ownerEmail || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {conn.hasAccessToken ? (
                                                    <div className="flex items-center gap-1 text-emerald-600">
                                                        <CheckCircle className="h-3 w-3" />
                                                        <span className="text-xs">Connected</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <XCircle className="h-3 w-3" />
                                                        <span className="text-xs">No token</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {conn.createdAt ? new Date(conn.createdAt).toLocaleDateString() : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
