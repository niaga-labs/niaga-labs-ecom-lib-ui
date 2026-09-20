export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductType = 'simple' | 'variable' | 'bundle' | 'digital';
export type FabricType = 'cotton' | 'silk' | 'polyester' | 'blend' | 'linen' | 'rayon';
// Production technique values are vertical-neutral.
export type ProductionTechnique = 'hand_drawn' | 'stamped' | 'printed' | 'combined';

// Defect types for clearance/sale products
export type DefectType = 'minor' | 'color' | 'stitch' | 'sample' | 'other';

// Tenants can supply their own label map by passing `defectTypeLabels` to
// ProductForm; the form falls back to this English default.
export const DEFECT_TYPE_LABELS: Record<DefectType, string> = {
    minor: 'Minor Defect',
    color: 'Color Variation',
    stitch: 'Imperfect Stitching',
    sample: 'Sample',
    other: 'Other',
};

// Per-section labels for ProductForm clearance/preorder/tailoring sections.
// Tenants override by passing `productFormLabels` to the form; the component
// falls back to the English defaults below.
export interface ProductFormLabels {
    clearance: {
        sectionTitle: string;
        toggleLabel: string;
        toggleHint: string;
        defectTypeLabel: string;
        defectTypePlaceholder: string;
        defectDescriptionLabel: string;
        defectDescriptionPlaceholder: string;
        defectDescriptionHint: string;
    };
    preorder: {
        toggleLabel: string;
        toggleHint: string;
        leadDaysLabel: string;
        leadDaysHint: string;
        messageLabel: string;
        messagePlaceholder: string;
        messageHint: string;
    };
    tailoring: {
        sectionTitle: string;
        toggleLabel: string;
        activeButtonHint: string;
        manageLinkPrefix: string;
        manageLinkText: string;
    };
}

export const DEFAULT_PRODUCT_FORM_LABELS: ProductFormLabels = {
    clearance: {
        sectionTitle: 'Clearance Sale',
        toggleLabel: 'Defect/Clearance Product',
        toggleHint: 'Mark this if the product has a defect to sell at a discount',
        defectTypeLabel: 'Defect Type *',
        defectTypePlaceholder: 'Select defect type',
        defectDescriptionLabel: 'Defect Description',
        defectDescriptionPlaceholder: 'Describe the defect for customers...',
        defectDescriptionHint: 'This description will appear on the clearance page',
    },
    preorder: {
        toggleLabel: 'Allow Pre-order',
        toggleHint: 'Customers can buy even when out of stock (processed within a set lead time)',
        leadDaysLabel: 'Lead Time (days)',
        leadDaysHint: 'How many days are needed to prepare this product',
        messageLabel: 'Pre-order Message (optional)',
        messagePlaceholder: 'Example: Product will be ready in 2 weeks after the order is confirmed',
        messageHint: 'This message will be shown to customers at checkout',
    },
    tailoring: {
        sectionTitle: 'Tailoring',
        toggleLabel: 'Tailorable',
        activeButtonHint: '✓ An "Add Tailoring" button will appear on this product page.',
        manageLinkPrefix: 'Manage tailoring services in ',
        manageLinkText: 'Tailoring Settings',
    },
};

export interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    lowStockThreshold: number;
    weight?: number;
    options: { name: string; value: string }[];
    image?: string;
    isDefault: boolean;
    isActive: boolean;
}

export interface ProductMedia {
    id: string;
    productId: string;
    type: 'image' | 'video' | '3d';
    url: string;
    thumbnailUrl?: string;
    alt?: string;
    position: number;
    isFeatured: boolean;
}

export interface ProductOption {
    id: string;
    name: string;
    values: string[];
    position: number;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;

    type: ProductType;
    status: ProductStatus;

    price: number;
    compareAtPrice?: number;
    costPrice?: number;

    sku: string;
    barcode?: string;
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    allowBackorder: boolean;

    categoryId?: string;
    categoryName?: string;
    category?: string;
    tags: string[];
    collections: string[];

    fabricType?: FabricType;
    productionTechnique?: ProductionTechnique;
    pattern?: string;
    color?: string;
    motifOrigin?: string;
    artisan?: string;
    dimensions?: { length: number; width: number; height: number };
    weight?: number;
    careInstructions?: string;

    images: string[];
    image?: string;
    featuredImage?: string;
    media?: ProductMedia[];

    hasVariants: boolean;
    options?: ProductOption[];
    variants?: ProductVariant[];

    seoTitle?: string;
    seoDescription?: string;

    channels?: string[];

    isFeatured?: boolean;
    isNewArrival?: boolean;

    totalSold?: number;
    viewCount?: number;

    isDefect?: boolean;
    defectType?: DefectType;
    defectDescription?: string;

    allowPreorder?: boolean;
    preorderLeadDays?: number;
    preorderMessage?: string;

    sizeChartId?: string;
    isTailorable?: boolean;
    supplierId?: string;

    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface CreateProductInput {
    name: string;
    description: string;
    shortDescription?: string;
    type?: ProductType;
    status?: ProductStatus;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    sku: string;
    barcode?: string;
    stock?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    categoryId?: string;
    tags?: string[];
    fabricType?: FabricType;
    productionTechnique?: ProductionTechnique;
    pattern?: string;
    color?: string;
    motifOrigin?: string;
    artisan?: string;
    dimensions?: { length: number; width: number; height: number };
    weight?: number;
    careInstructions?: string;
    images?: string[];
    seoTitle?: string;
    seoDescription?: string;
    isDefect?: boolean;
    defectType?: DefectType;
    defectDescription?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> { }

// Backward-compatible ProductInput interface (carries some fields the
// original admin form fed back into the API client even though they're
// not strict CreateProductInput shape).
export interface ProductInput extends CreateProductInput {
    productType?: string;
    basePrice?: number;
    salePrice?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    motifName?: string;
    motifMeaning?: string;
    materialComposition?: string;
    fabricWidth?: number;
    origin?: string;
    craftsman?: string;
    metaTitle?: string;
    metaDesc?: string;
    sizeVariants?: Array<{ size: string; stock: number; sku: string }>;
    colorVariants?: Array<{ name: string; hexCode: string; images: string[]; stock: number }>;
    availableLengths?: string[];
    pricePerMeter?: number;
    minimumOrder?: number;
    stockQuantity?: number;
    manageStock?: boolean;
}

export interface RemoveBackgroundResponse {
    product_id: string;
    image_id: string;
    old_url: string;
    new_url: string;
}

export interface ProductColor {
    id: string;
    name: string;
    nameMalay?: string;
    hexCode: string;
    colorFamily?: string;
    sortOrder?: number;
    isActive: boolean;
}

export interface CreateColorInput {
    name: string;
    nameMalay?: string;
    hexCode: string;
    colorFamily?: string;
}

// Lightweight category shape used by the form's category dropdown — the
// products API client typically returns more fields, but the form only
// needs `id` + `name`.
export interface ProductCategoryOption {
    id: string;
    name: string;
}

// Lightweight size-chart shape used by the form's size-chart dropdown.
export interface SizeChartOption {
    id: string;
    name: string;
    gender: string;
}

// NIAGA-276: who ships a product. Only the fields the picker renders — the
// full supplier record (contacts, dispatch days, notes) belongs to the
// suppliers admin page, not to the product form.
export interface SupplierOption {
    id: string;
    name: string;
    isActive: boolean;
}

// Lightweight marketplace-connection shape used by the form's Shopee
// publish flow. Mirrors the runtime shape getConnections returns.
export interface ProductFormMarketplaceConnection {
    id: string;
    platform: string;
    is_active: boolean;
}

// Single API surface the form depends on. Caller wraps its own products
// API client + marketplace API client into this object and hands it in.
export interface ProductFormApi {
    getCategories: () => Promise<ProductCategoryOption[]>;
    getSizeCharts: () => Promise<SizeChartOption[]>;
    getSuppliers: () => Promise<SupplierOption[]>;
    getProduct: (id: string) => Promise<Product>;
    createProduct: (input: ProductInput) => Promise<Product>;
    updateProduct: (id: string, input: ProductInput) => Promise<Product>;
    getProductVariants: (productId: string) => Promise<ProductVariant[]>;
    createProductVariant: (productId: string, data: any) => Promise<ProductVariant>;
    updateProductVariant: (productId: string, variantId: string, data: any) => Promise<ProductVariant>;
    deleteProductVariant: (productId: string, variantId: string) => Promise<void>;
    uploadProductMedia: (productId: string, file: File) => Promise<ProductMedia>;
    updateProductMedia: (productId: string, mediaId: string, data: any) => Promise<ProductMedia>;
    deleteProductMedia: (productId: string, mediaId: string) => Promise<void>;
    removeImageBackground: (productId: string, imageId: string) => Promise<RemoveBackgroundResponse>;
    reorderProductMedia: (productId: string, mediaIds: string[]) => Promise<ProductMedia[]>;
    setProductColors: (productId: string, colorIds: string[]) => Promise<void>;
    getMarketplaceConnections: () => Promise<ProductFormMarketplaceConnection[] | { connections: ProductFormMarketplaceConnection[] }>;
    pushProductsToMarketplace: (connectionId: string, productIds: string[]) => Promise<void>;
}

// API surface for the lift-time ProductColorSelector sibling.
export interface ProductColorApi {
    getColors: () => Promise<ProductColor[]>;
    getProductColors: (productId: string) => Promise<ProductColor[]>;
    createColor: (input: CreateColorInput) => Promise<ProductColor>;
}
