'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import { Button } from '../../primitives/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import { MarketplaceConnection, PLATFORM_NAMES, getPlatformIcon } from './marketplace';
import Link from 'next/link';
import {
    RefreshCw,
    Settings,
    FolderTree,
    AlertCircle,
    MoreVertical,
    ChevronRight,
    Unplug,
    Download,
    Upload,
    ArrowRightLeft,
    Truck,
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw,
    BarChart3
} from 'lucide-react';

interface ConnectionCardProps {
    connection: MarketplaceConnection;
    onRefresh?: (id: string) => void;
    onDisconnect?: (id: string) => void;
}

// Simple relative time formatter
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function formatTimeUntil(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;
    return `in ${Math.floor(diffDays / 7)} weeks`;
}

export function ConnectionCard({ connection, onRefresh, onDisconnect }: ConnectionCardProps) {
    const isTokenExpiring = new Date(connection.tokenExpiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const isTokenExpired = new Date(connection.tokenExpiresAt) < new Date();

    // Get status info
    const getStatusInfo = () => {
        if (isTokenExpired) {
            return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', text: 'Token Expired' };
        }
        if (isTokenExpiring) {
            return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50', text: 'Token Expiring' };
        }
        if (connection.isActive) {
            return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', text: 'Active' };
        }
        return { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', text: 'Inactive' };
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    return (
        <Card className={`relative overflow-hidden ${!connection.isActive ? 'opacity-70' : ''}`}>
            {/* Platform Color Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${connection.platform === 'shopee' ? 'bg-orange-500' : 'bg-black'}`} />

            <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`text-4xl p-2 rounded-lg ${connection.platform === 'shopee' ? 'bg-orange-50' : 'bg-gray-100'}`}>
                            {getPlatformIcon(connection.platform)}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">{connection.shopName}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {PLATFORM_NAMES[connection.platform] || connection.platform}
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.bg}`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.color}`} />
                        <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Token Warning */}
                {isTokenExpired ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-700">Token has expired</p>
                            <p className="text-xs text-red-600">Please refresh token to continue sync</p>
                        </div>
                        {onRefresh && (
                            <Button size="sm" variant="destructive" onClick={() => onRefresh(connection.id)}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                Refresh
                            </Button>
                        )}
                    </div>
                ) : isTokenExpiring ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-700">Token expires {formatTimeUntil(connection.tokenExpiresAt)}</p>
                        </div>
                        {onRefresh && (
                            <Button size="sm" variant="outline" onClick={() => onRefresh(connection.id)}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                Refresh
                            </Button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Connected {formatRelativeTime(connection.createdAt)}
                    </p>
                )}

                {/* Main Actions - Big Buttons */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Main Actions</p>

                    {/* Sync Products Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between h-12">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded bg-blue-50">
                                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium">Sync Products</div>
                                        <div className="text-xs text-muted-foreground">Import or push products</div>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Select Sync Type</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={`/marketplace/${connection.id}/import`}>
                                <DropdownMenuItem className="cursor-pointer py-3">
                                    <Download className="h-4 w-4 mr-3 text-green-600" />
                                    <div>
                                        <div className="font-medium">Import & Link</div>
                                        <div className="text-xs text-muted-foreground">
                                            Import existing products from Shopee and link with Admin products
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </Link>
                            <Link href={`/marketplace/${connection.id}/products`}>
                                <DropdownMenuItem className="cursor-pointer py-3">
                                    <Upload className="h-4 w-4 mr-3 text-blue-600" />
                                    <div>
                                        <div className="font-medium">Push New Products</div>
                                        <div className="text-xs text-muted-foreground">
                                            Create new listings on Shopee from Admin products
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </Link>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Orders */}
                    <Link href={`/marketplace/${connection.id}/orders`}>
                        <Button variant="outline" className="w-full justify-between h-12">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-purple-50">
                                    <Truck className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Orders</div>
                                    <div className="text-xs text-muted-foreground">Manage orders & shipping</div>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </Link>

                    {/* Returns */}
                    <Link href={`/marketplace/${connection.id}/returns`}>
                        <Button variant="outline" className="w-full justify-between h-12">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-orange-50">
                                    <RotateCcw className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium">Returns</div>
                                    <div className="text-xs text-muted-foreground">Manage return requests</div>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </Link>
                </div>

                {/* Quick Links */}
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Link href={`/marketplace/${connection.id}/analytics`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                        </Button>
                    </Link>
                    <Link href={`/marketplace/${connection.id}/categories`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                            <FolderTree className="h-4 w-4 mr-2" />
                            Categories
                        </Button>
                    </Link>
                    <Link href={`/marketplace/${connection.id}/settings`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Button>
                    </Link>

                    {/* More Options */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {onRefresh && (
                                <DropdownMenuItem onClick={() => onRefresh(connection.id)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh Token
                                </DropdownMenuItem>
                            )}
                            {onDisconnect && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={() => onDisconnect(connection.id)}
                                    >
                                        <Unplug className="h-4 w-4 mr-2" />
                                        Disconnect
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}
