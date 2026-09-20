export interface Banner {
    id: string;
    name: string;
    bannerType: string;
    location: string;
    title?: string;
    subtitle?: string;
    description?: string;
    imageDesktop: string;
    imageMobile?: string;
    videoUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    textPosition?: string;
    textColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    sortOrder: number;
    clickCount?: number;
    viewCount?: number;
    createdAt: string;
    updatedAt: string;
}

// Where a banner can appear. Values are tenant-specific (they map to the
// host's `cms.banner_location` enum); admin keeps its own list of options
// and passes it via the BannerForm `bannerLocations` prop.
export interface BannerLocationOption {
    value: string;
    label: string;
    description: string;
    /** Optional override — when this option is selected, the form sets
     *  bannerType to this value instead of the default 'hero'. */
    bannerType?: string;
}
