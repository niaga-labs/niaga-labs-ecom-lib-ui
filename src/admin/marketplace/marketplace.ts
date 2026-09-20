export interface MarketplaceConnection {
    id: string;
    platform: 'shopee' | 'tiktok';
    shopId: string;
    shopName: string;
    isActive: boolean;
    tokenExpiresAt: string;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export const PLATFORM_NAMES: Record<string, string> = {
    shopee: 'Shopee',
    tiktok: 'TikTok Shop',
};

export function getPlatformIcon(platform: string): string {
    switch (platform) {
        case 'shopee': return '🛒';
        case 'tiktok': return '📱';
        default: return '🏪';
    }
}