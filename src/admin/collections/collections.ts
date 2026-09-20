export interface CategoryInCollection {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    productCount: number;
    position: number;
}

export interface Collection {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    collectionType: 'manual' | 'automated';
    automationRules?: string;
    sortOrder: string;
    metaTitle?: string;
    metaDesc?: string;
    isActive: boolean;
    publishedAt?: string;
    categoryIds?: string[];
    categories?: CategoryInCollection[];
    categoryCount?: number;
    createdAt: string;
    updatedAt?: string;
}

export interface CollectionSummary {
    id: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    categoryCount: number;
    isActive: boolean;
    createdAt: string;
}

// NIAGA-389 flipped the READ types above to camelCase, which is the house
// direction: the backend serialises snake_case and the frontend consumes
// camelCase, with the BFF proxy converting responses.
//
// CollectionFormData is deliberately NOT flipped. It is the REQUEST body for
// create/update collection, and request bodies are forwarded verbatim --
// service-catalog binds snake_case, so a camelCase key here would be silently
// dropped under a 200 (NIAGA-365). Read types and write types travel in
// opposite directions across the same boundary; this file holds one of each on
// purpose.
export interface CollectionFormData {
    name: string;
    description?: string;
    image_url?: string;
    collection_type?: 'manual' | 'automated';
    automation_rules?: string;
    sort_order?: string;
    meta_title?: string;
    meta_desc?: string;
    is_active: boolean;
    category_ids?: string[];
}
