'use client';

import { useState, useEffect, useRef } from 'react';
import VariantMatrixEditor, { type VariantOption as MatrixVariantOption, type VariantData } from './VariantMatrixEditor';
import ProductColorSelector from './ProductColorSelector';
import { useToast } from '../common/Toast';
import {
    DEFECT_TYPE_LABELS,
    DEFAULT_PRODUCT_FORM_LABELS,
    type DefectType,
    type Product,
    type ProductVariant,
    type ProductMedia,
    type ProductFormApi,
    type ProductColorApi,
    type ProductFormLabels,
} from './products';

// Simple inline icon components (no external dependency)
const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const InformationCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

export interface ProductFormProps {
    mode: 'create' | 'edit';
    initialData?: Product;
    api: ProductFormApi;
    colorApi: ProductColorApi;
    /** Called when the user cancels (back arrow / Discard buttons). */
    onCancel: () => void;
    /** Called after a successful save with the saved product id. */
    onAfterSave: (productId: string) => void;
    /** Called when the user clicks Duplicate (edit mode only). */
    onDuplicate?: (productId: string) => void;
    /** Optional override of the defect-type select labels. Defaults to English. */
    defectTypeLabels?: Record<DefectType, string>;
    /** Optional override of the clearance / pre-order / tailoring section labels. Defaults to English. */
    productFormLabels?: ProductFormLabels;
}

interface FormData {
    title: string;
    description: string;
    images: string[];
    category: string;
    categoryId: string;
    price: number;
    compareAtPrice: number;
    chargeTax: boolean;
    costPerItem: number;
    trackInventory: boolean;
    quantity: number;
    sku: string;
    barcode: string;
    lowStockThreshold: number;
    continueSellingOutOfStock: boolean;
    isPhysicalProduct: boolean;
    weight: number;
    weightUnit: 'kg' | 'g' | 'lb' | 'oz';
    dimensionLength: number;
    dimensionWidth: number;
    dimensionHeight: number;
    countryOfOrigin: string;
    hsCode: string;
    hasVariants: boolean;
    status: 'active' | 'draft';
    vendor: string;
    productType: string;
    collections: string[];
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    urlHandle: string;
    isDefect: boolean;
    defectType: string;
    defectDescription: string;
    allowPreorder: boolean;
    preorderLeadDays: number;
    preorderMessage: string;
    sizeChartId: string;
    supplierId: string;
    isTailorable: boolean;
    isFeatured: boolean;
    isNewArrival: boolean;
}

export default function ProductForm({
    mode,
    initialData,
    api,
    colorApi,
    onCancel,
    onAfterSave,
    onDuplicate,
    defectTypeLabels = DEFECT_TYPE_LABELS,
    productFormLabels = DEFAULT_PRODUCT_FORM_LABELS,
}: ProductFormProps) {
    const { showToast, ToastContainer } = useToast();
    const [loading, setLoading] = useState(false);
    const [shopeePublishing, setShopeePublishing] = useState(false);
    const [shopeeStatus, setShopeeStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [apiCategories, setApiCategories] = useState<{ id: string; name: string }[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [sizeCharts, setSizeCharts] = useState<{ id: string; name: string; gender: string }[]>([]);
    const [loadingSizeCharts, setLoadingSizeCharts] = useState(true);
    const [suppliers, setSuppliers] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tagInput, setTagInput] = useState('');
    const [showSeoSection, setShowSeoSection] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [deletedMediaIds, setDeletedMediaIds] = useState<string[]>([]);
    const [variantOptions, setVariantOptions] = useState<MatrixVariantOption[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([]);
    const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [removingBgIndex, setRemovingBgIndex] = useState<number | null>(null);
    const [pendingBgRemovals, setPendingBgRemovals] = useState<{ imageId: string; newUrl: string }[]>([]);
    const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
    const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
    const [skuManuallyEdited, setSkuManuallyEdited] = useState(mode === 'edit' && !!initialData?.sku);

    const [formData, setFormData] = useState<FormData>({
        title: initialData?.name || '',
        description: initialData?.description || '',
        images: initialData?.images?.length ? initialData.images : (initialData?.image ? [initialData.image] : []),
        category: '',
        categoryId: initialData?.categoryId || '',
        price: initialData?.price || 0,
        compareAtPrice: initialData?.compareAtPrice || 0,
        chargeTax: true,
        costPerItem: initialData?.costPrice || 0,
        trackInventory: initialData?.trackInventory ?? true,
        quantity: initialData?.stock || 0,
        sku: initialData?.sku || '',
        barcode: initialData?.barcode || '',
        lowStockThreshold: initialData?.lowStockThreshold || 0,
        continueSellingOutOfStock: false,
        isPhysicalProduct: true,
        weight: initialData?.weight || 0,
        weightUnit: 'kg',
        dimensionLength: initialData?.dimensions?.length || 0,
        dimensionWidth: initialData?.dimensions?.width || 0,
        dimensionHeight: (initialData?.dimensions as any)?.height || 0,
        countryOfOrigin: 'Malaysia',
        hsCode: '',
        hasVariants: initialData?.hasVariants || (initialData?.variants && initialData.variants.length > 0) || false,
        status: (initialData?.status === 'active' ? 'active' : 'draft') as 'active' | 'draft',
        vendor: '',
        productType: '',
        collections: initialData?.collections || [],
        tags: initialData?.tags || [],
        seoTitle: '',
        seoDescription: '',
        urlHandle: '',
        isDefect: initialData?.isDefect || false,
        defectType: initialData?.defectType || '',
        defectDescription: initialData?.defectDescription || '',
        allowPreorder: initialData?.allowPreorder || false,
        preorderLeadDays: initialData?.preorderLeadDays || 14,
        preorderMessage: initialData?.preorderMessage || '',
        sizeChartId: initialData?.sizeChartId || '',
        supplierId: initialData?.supplierId || '',
        isTailorable: initialData?.isTailorable ?? true,
        isFeatured: initialData?.isFeatured || false,
        isNewArrival: initialData?.isNewArrival || false,
    });

    useEffect(() => {
        async function fetchCategories() {
            try {
                const cats = await api.getCategories();
                setApiCategories(cats);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoadingCategories(false);
            }
        }
        fetchCategories();
    }, [api]);

    useEffect(() => {
        async function fetchSizeCharts() {
            try {
                const charts = await api.getSizeCharts();
                setSizeCharts(charts);
            } catch (error) {
                console.error('Failed to fetch size charts:', error);
            } finally {
                setLoadingSizeCharts(false);
            }
        }
        fetchSizeCharts();
    }, [api]);

    // NIAGA-276. Inactive suppliers are fetched too, not filtered out: a product
    // already assigned to a supplier that has since stopped trading must still
    // show who ships it. The option is marked instead, and only the picker's
    // NEW choices are steered towards active ones.
    useEffect(() => {
        async function fetchSuppliers() {
            try {
                setSuppliers(await api.getSuppliers());
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
            } finally {
                setLoadingSuppliers(false);
            }
        }
        fetchSuppliers();
    }, [api]);

    useEffect(() => {
        async function loadVariants() {
            if (mode === 'edit' && initialData?.id) {
                try {
                    const existingVariants = await api.getProductVariants(initialData.id);
                    if (existingVariants && existingVariants.length > 0) {
                        const optionMap = new Map<string, Set<string>>();

                        existingVariants.forEach((v: ProductVariant) => {
                            if (v.options) {
                                v.options.forEach(opt => {
                                    if (!optionMap.has(opt.name)) {
                                        optionMap.set(opt.name, new Set());
                                    }
                                    optionMap.get(opt.name)!.add(opt.value);
                                });
                            }
                        });

                        const extractedOptions: MatrixVariantOption[] = [];
                        optionMap.forEach((values, name) => {
                            extractedOptions.push({
                                id: Math.random().toString(36).substring(2, 11),
                                name,
                                values: Array.from(values),
                            });
                        });

                        const variantData: VariantData[] = existingVariants.map((v: ProductVariant) => {
                            const attributes: Record<string, string> = {};
                            if (v.options) {
                                v.options.forEach(opt => {
                                    attributes[opt.name] = opt.value;
                                });
                            }
                            return {
                                id: v.id,
                                sku: v.sku,
                                name: v.name,
                                price: v.price ?? null,
                                stockQuantity: v.stock ?? 0,
                                weight: null,
                                image: v.image || '',
                                isActive: v.isActive ?? true,
                                attributes,
                            };
                        });

                        setVariantOptions(extractedOptions);
                        setVariants(variantData);
                        setFormData(prev => ({ ...prev, hasVariants: true }));
                    }
                } catch (error) {
                    console.error('Failed to load variants:', error);
                }
            }
        }
        loadVariants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, initialData?.id]);

    useEffect(() => {
        if (formData.title && !formData.urlHandle) {
            const handle = formData.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, urlHandle: handle }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.title]);

    const generateSKU = (title: string): string => {
        if (!title.trim()) return '';
        const words = title.trim().split(/\s+/).slice(0, 3);
        const prefix = words
            .map(word => word.substring(0, 3).toUpperCase())
            .join('-');
        const suffix = Date.now().toString().slice(-6);
        return `${prefix}-${suffix}`;
    };

    useEffect(() => {
        if (formData.title && !skuManuallyEdited && !formData.sku) {
            const generatedSku = generateSKU(formData.title);
            setFormData(prev => ({ ...prev, sku: generatedSku }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.title, skuManuallyEdited]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files);
            const newImages = newFiles.map(file => URL.createObjectURL(file));
            setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
            setImageFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeImage = (index: number) => {
        const imageToRemove = formData.images[index];
        const existingImages = initialData?.images || [];
        const existingMedia = initialData?.media || [];

        const isExistingImage = existingImages.includes(imageToRemove);

        if (isExistingImage) {
            const mediaToDelete = existingMedia.find((m: ProductMedia) => m.url === imageToRemove);
            if (mediaToDelete?.id) {
                setDeletedMediaIds(prev => [...prev, mediaToDelete.id]);
            }
        } else {
            let fileIndex = 0;
            for (let i = 0; i < index; i++) {
                if (!existingImages.includes(formData.images[i])) {
                    fileIndex++;
                }
            }
            setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
        }

        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleRemoveBackground = async (index: number) => {
        if (!initialData?.id) {
            showToast('Please save the product first before removing background', 'error');
            return;
        }

        const imageUrl = formData.images[index];
        const existingMedia = initialData?.media || [];
        const mediaItem = existingMedia.find((m: ProductMedia) => m.url === imageUrl);

        if (!mediaItem?.id) {
            showToast('Cannot remove background from unsaved images. Save the product first.', 'error');
            return;
        }

        setRemovingBgIndex(index);
        try {
            const result = await api.removeImageBackground(initialData.id, mediaItem.id);
            setFormData(prev => ({
                ...prev,
                images: prev.images.map((img, i) => i === index ? result.new_url : img)
            }));
            setPendingBgRemovals(prev => [...prev, { imageId: mediaItem.id, newUrl: result.new_url }]);
            showToast('Background removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing background:', error);
            showToast('Failed to remove background. Please try again.', 'error');
        } finally {
            setRemovingBgIndex(null);
        }
    };

    const isExistingImage = (index: number): boolean => {
        const imageUrl = formData.images[index];
        const existingImages = initialData?.images || [];
        const bgRemovedUrls = pendingBgRemovals.map(r => r.newUrl);
        return existingImages.includes(imageUrl) || bgRemovedUrls.includes(imageUrl);
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleImageReorder = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newImages = [...formData.images];
        const [movedImage] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedImage);

        const existingImages = initialData?.images || [];
        const newImageFiles = [...imageFiles];

        let fromFileIndex = 0;
        let toFileIndex = 0;

        for (let i = 0; i < fromIndex; i++) {
            if (!existingImages.includes(formData.images[i])) fromFileIndex++;
        }
        for (let i = 0; i < toIndex; i++) {
            if (!existingImages.includes(formData.images[i])) toFileIndex++;
        }

        if (!existingImages.includes(formData.images[fromIndex]) && newImageFiles.length > 0) {
            const [movedFile] = newImageFiles.splice(fromFileIndex, 1);
            newImageFiles.splice(toFileIndex, 0, movedFile);
            setImageFiles(newImageFiles);
        }

        setFormData(prev => ({ ...prev, images: newImages }));
    };

    const handlePublishToShopee = async () => {
        if (!initialData?.id) return;
        setShopeePublishing(true);
        setShopeeStatus('idle');
        try {
            const data = await api.getMarketplaceConnections();
            const connections = (data as any).connections || data || [];
            const shopee = (Array.isArray(connections) ? connections : []).find(
                (c: any) => c.platform === 'shopee' && c.is_active
            );
            if (!shopee) {
                throw new Error('No active Shopee connection. Please connect Shopee first in Marketplace settings.');
            }
            await api.pushProductsToMarketplace(shopee.id, [initialData.id]);
            setShopeeStatus('success');
            showToast('Product pushed to Shopee successfully', 'success');
        } catch (err: any) {
            setShopeeStatus('error');
            showToast(err.message || 'Failed to push to Shopee', 'error');
        } finally {
            setShopeePublishing(false);
        }
    };

    const handleSubmit = async (status: 'active' | 'draft' = 'draft') => {
        if (!formData.title.trim()) {
            showToast('Title is required', 'error');
            return;
        }

        setLoading(true);
        try {
            const isValidUUID = formData.categoryId &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.categoryId);

            const hasVariantsToSave = formData.hasVariants && variants.length > 0;

            const apiData = {
                name: formData.title,
                sku: formData.sku || `SKU-${Date.now()}`,
                category_id: isValidUUID ? formData.categoryId : undefined,
                description: formData.description,
                base_price: formData.compareAtPrice > 0 ? formData.compareAtPrice : formData.price,
                sale_price: formData.compareAtPrice > 0 ? formData.price : undefined,
                cost: formData.costPerItem > 0 ? formData.costPerItem : undefined,
                stock_quantity: hasVariantsToSave ? undefined : formData.quantity,
                // NIAGA-404: the JSON name is low_stock_threshold, NOT the column
                // name. service-catalog's request binds `json:"low_stock_threshold"`
                // onto a field whose gorm column is `low_stock_thresh` -- the two
                // differ by one word, and this form was sending the column name. The
                // key was therefore absent from the body: 0 on create, untouched on
                // update, so the threshold set here was never saved.
                low_stock_threshold: formData.lowStockThreshold,
                manage_stock: formData.trackInventory,
                is_active: status === 'active',
                tags: formData.tags.length > 0 ? formData.tags : undefined,
                meta_title: formData.seoTitle || '',
                meta_desc: formData.seoDescription || '',
                weight: formData.weight > 0 ? formData.weight : undefined,
                dimensions: (formData.dimensionLength > 0 || formData.dimensionWidth > 0 || formData.dimensionHeight > 0) ? {
                    length: formData.dimensionLength || 0,
                    width: formData.dimensionWidth || 0,
                    height: formData.dimensionHeight || 0,
                } : undefined,
                is_defect: formData.isDefect,
                defect_type: formData.isDefect ? formData.defectType : undefined,
                defect_description: formData.isDefect ? formData.defectDescription : undefined,
                allow_preorder: formData.allowPreorder,
                preorder_lead_days: formData.allowPreorder ? formData.preorderLeadDays : undefined,
                preorder_message: formData.allowPreorder && formData.preorderMessage ? formData.preorderMessage : undefined,
                size_chart_id: formData.sizeChartId || undefined,
                // NIAGA-276: '' means "no supplier", which the API stores as NULL.
                supplier_id: formData.supplierId || undefined,
                is_tailorable: formData.isTailorable,
                is_featured: formData.isFeatured,
                is_new_arrival: formData.isNewArrival,
            };

            let productId: string;

            if (mode === 'create') {
                const newProduct = await api.createProduct(apiData as any);
                productId = newProduct.id;
                showToast(`Product "${formData.title}" created successfully!`, 'success');
            } else {
                await api.updateProduct(initialData!.id, apiData as any);
                productId = initialData!.id;
                showToast(`Product "${formData.title}" updated successfully!`, 'success');
            }

            if (deletedMediaIds.length > 0) {
                showToast('Removing deleted images...', 'info');
                for (const mediaId of deletedMediaIds) {
                    try {
                        await api.deleteProductMedia(productId, mediaId);
                    } catch (error) {
                        console.error('Error deleting image:', error);
                    }
                }
            }

            if (imageFiles.length > 0) {
                showToast('Uploading images...', 'info');
                for (const file of imageFiles) {
                    try {
                        await api.uploadProductMedia(productId, file);
                    } catch (error) {
                        console.error('Error uploading image:', error);
                        showToast(`Failed to upload image: ${file.name}`, 'error');
                    }
                }
                showToast('Images uploaded successfully!', 'success');
            }

            if (pendingBgRemovals.length > 0) {
                for (const removal of pendingBgRemovals) {
                    try {
                        await api.updateProductMedia(productId, removal.imageId, { url: removal.newUrl });
                    } catch (error) {
                        console.error('Error applying bg removal:', error);
                    }
                }
                setPendingBgRemovals([]);
            }

            if (formData.images.length > 1) {
                try {
                    const freshProduct = await api.getProduct(productId);
                    const mediaList = freshProduct.media || [];

                    const urlToId = new Map<string, string>();
                    for (const m of mediaList) {
                        if (m.id && m.url) {
                            urlToId.set(m.url, m.id);
                        }
                    }

                    const orderedIds = formData.images
                        .map(url => urlToId.get(url))
                        .filter((id): id is string => !!id);

                    if (orderedIds.length > 0) {
                        await api.reorderProductMedia(productId, orderedIds);
                    }
                } catch (error) {
                    console.error('Error reordering images:', error);
                }
            }

            if (deletedVariantIds.length > 0) {
                showToast('Removing deleted variants...', 'info');
                for (const variantId of deletedVariantIds) {
                    try {
                        await api.deleteProductVariant(productId, variantId);
                    } catch (error) {
                        console.error('Error deleting variant:', error);
                    }
                }
            }

            if (formData.hasVariants && variants.length > 0) {
                showToast('Saving variants...', 'info');
                let savedCount = 0;
                let failedCount = 0;
                const failedVariants: string[] = [];

                for (const variant of variants) {
                    const variantData = {
                        sku: variant.sku,
                        name: variant.name,
                        price: variant.price ?? formData.price,
                        stock_quantity: variant.stockQuantity,
                        is_active: variant.isActive,
                        attributes: variant.attributes,
                    };

                    try {
                        const isExistingVariant = variant.id && variant.id.length === 36 && variant.id.includes('-');

                        if (isExistingVariant) {
                            await api.updateProductVariant(productId, variant.id!, variantData as any);
                        } else {
                            await api.createProductVariant(productId, variantData as any);
                        }
                        savedCount++;
                    } catch (error: any) {
                        console.error('Error saving variant:', variant.name, error);
                        failedCount++;
                        failedVariants.push(variant.name);
                    }
                }

                if (failedCount > 0) {
                    showToast(`Failed to save ${failedCount} variant(s): ${failedVariants.join(', ')}. Check if SKUs are unique.`, 'error');
                } else {
                    showToast(`All ${savedCount} variants saved successfully!`, 'success');
                }
            }

            if (selectedColorIds.length > 0) {
                try {
                    await api.setProductColors(productId, selectedColorIds);
                    showToast('Colors saved successfully!', 'success');
                } catch (error) {
                    console.error('Error saving colors:', error);
                    showToast('Failed to save colors', 'error');
                }
            }

            setTimeout(() => onAfterSave(productId), 1000);
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Failed to save product. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    {mode === 'create' ? 'Add product' : 'Edit product'}
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Discard
                                </button>
                                {mode === 'edit' && initialData?.id && onDuplicate && (
                                    <button
                                        type="button"
                                        onClick={() => onDuplicate(initialData.id)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                    >
                                        Duplicate
                                    </button>
                                )}
                                <button
                                    onClick={() => handleSubmit('draft')}
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                                >
                                    Save as draft
                                </button>
                                <button
                                    onClick={() => handleSubmit('active')}
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Title & Description */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Short sleeve t-shirt"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                                            <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 bg-gray-50">
                                                <select className="text-sm border-0 bg-transparent">
                                                    <option>Paragraph</option>
                                                </select>
                                                <div className="w-px h-4 bg-gray-300 mx-1" />
                                                <button className="p-1 hover:bg-gray-200 rounded font-bold text-sm">B</button>
                                                <button className="p-1 hover:bg-gray-200 rounded italic text-sm">I</button>
                                                <button className="p-1 hover:bg-gray-200 rounded underline text-sm">U</button>
                                            </div>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={6}
                                                className="w-full px-3 py-2 border-0 focus:ring-0 resize-none"
                                                placeholder="Add a description..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Media */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Media</h3>

                                {formData.images.length > 0 && (
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        {formData.images.map((img, idx) => (
                                            <div
                                                key={idx}
                                                className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden group border-2 transition-all cursor-move ${
                                                    draggedImageIndex === idx
                                                        ? 'border-blue-500 opacity-50 scale-95'
                                                        : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                                draggable
                                                onDragStart={(e) => {
                                                    setDraggedImageIndex(idx);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => setDraggedImageIndex(null)}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    if (draggedImageIndex !== null && draggedImageIndex !== idx) {
                                                        handleImageReorder(draggedImageIndex, idx);
                                                    }
                                                    setDraggedImageIndex(null);
                                                }}
                                            >
                                                <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zM8 12a2 2 0 11-4 0 2 2 0 014 0zM8 18a2 2 0 11-4 0 2 2 0 014 0zM14 6a2 2 0 11-4 0 2 2 0 014 0zM14 12a2 2 0 11-4 0 2 2 0 014 0zM14 18a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={img}
                                                    alt={`Product image ${idx + 1}`}
                                                    className="w-full h-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    onClick={() => {
                                                        setLightboxImage(img);
                                                        setLightboxIndex(idx);
                                                    }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">No image</text></svg>';
                                                    }}
                                                />
                                                {removingBgIndex === idx && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <div className="text-center text-white">
                                                            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span className="text-xs">Removing BG...</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {mode === 'edit' && isExistingImage(idx) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveBackground(idx);
                                                            }}
                                                            disabled={removingBgIndex !== null}
                                                            className="p-1.5 bg-purple-600 rounded-full shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Remove Background"
                                                        >
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeImage(idx);
                                                        }}
                                                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-red-50"
                                                    >
                                                        <XMarkIcon className="w-4 h-4 text-gray-600 hover:text-red-600" />
                                                    </button>
                                                </div>
                                                {idx === 0 && (
                                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                                                        Main
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50'); }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                                        const files = e.dataTransfer.files;
                                        if (files.length > 0) {
                                            const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
                                            const newImages = newFiles.map(file => URL.createObjectURL(file));
                                            setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
                                            setImageFiles(prev => [...prev, ...newFiles]);
                                        }
                                    }}
                                >
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex gap-2 text-sm">
                                            <span className="text-blue-600 font-medium hover:underline">Upload images</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            or drag and drop • PNG, JPG up to 10MB
                                        </p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </div>

                                {formData.images.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-3">
                                        {formData.images.length} image{formData.images.length > 1 ? 's' : ''} added. Drag images to reorder. First image will be the main product image.
                                    </p>
                                )}
                            </div>

                            {/* Category */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Category</h3>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    disabled={loadingCategories}
                                >
                                    <option value="">{loadingCategories ? 'Loading...' : 'Choose a product category'}</option>
                                    {apiCategories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Determines tax rates and adds metafields to improve search, filters, and cross-channel sales.
                                </p>
                            </div>

                            {/* Colors */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Colors</h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Select the colors available for this product. These will appear in the storefront filter.
                                </p>
                                <ProductColorSelector
                                    api={colorApi}
                                    productId={initialData?.id}
                                    selectedColorIds={selectedColorIds}
                                    onChange={setSelectedColorIds}
                                />
                            </div>

                            {/* Pricing */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Pricing</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">RM</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.price || ''}
                                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Compare-at price</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">RM</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.compareAtPrice || ''}
                                                    onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Original price before discount</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cost per item</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">RM</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.costPerItem || ''}
                                                    onChange={(e) => setFormData({ ...formData, costPerItem: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">For profit calculation (not shown to customers)</p>
                                        </div>
                                        <div className="flex items-center pt-6">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.chargeTax}
                                                    onChange={(e) => setFormData({ ...formData, chargeTax: e.target.checked })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-700">Charge tax on this product</span>
                                            </label>
                                        </div>
                                    </div>

                                    {formData.price > 0 && formData.costPerItem > 0 && (
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Profit margin:</span>
                                                <span className="font-medium text-green-600">
                                                    {(((formData.price - formData.costPerItem) / formData.price) * 100).toFixed(1)}%
                                                    {' '}(RM {(formData.price - formData.costPerItem).toFixed(2)} profit)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inventory */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Inventory</h3>
                                    <label className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600">Track inventory</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.trackInventory}
                                            onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Stock Keeping Unit)</label>
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => {
                                                    setSkuManuallyEdited(true);
                                                    setFormData({ ...formData, sku: e.target.value });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Auto-generated from title"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Auto-generated from product name</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (ISBN, UPC, etc.)</label>
                                            <input
                                                type="text"
                                                value={formData.barcode}
                                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>

                                    {formData.trackInventory && !formData.hasVariants && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity in stock</label>
                                                <input
                                                    type="number"
                                                    value={formData.quantity}
                                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Low stock alert at</label>
                                                <input
                                                    type="number"
                                                    value={formData.lowStockThreshold}
                                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                    placeholder="5"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Get alerted when stock drops below this</p>
                                            </div>
                                        </div>
                                    )}

                                    {formData.trackInventory && formData.hasVariants && (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <strong>Stock is managed per variant.</strong> Set stock quantities for each variant in the Variants section below.
                                            </p>
                                            {variants.length > 0 && (
                                                <p className="text-sm text-blue-600 mt-2">
                                                    Total stock across all variants: <strong>{variants.reduce((sum, v) => sum + v.stockQuantity, 0)} units</strong>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={formData.continueSellingOutOfStock}
                                                onChange={(e) => setFormData({ ...formData, continueSellingOutOfStock: e.target.checked })}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-gray-700">Continue selling when out of stock</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Shipping */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Shipping</h3>
                                    <label className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600">Physical product</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.isPhysicalProduct}
                                            onChange={(e) => setFormData({ ...formData, isPhysicalProduct: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                {formData.isPhysicalProduct && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Product weight</label>
                                                <div className="flex">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.weight || ''}
                                                        onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg"
                                                        placeholder="0.0"
                                                    />
                                                    <select
                                                        value={formData.weightUnit}
                                                        onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value as any })}
                                                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50"
                                                    >
                                                        <option value="kg">kg</option>
                                                        <option value="g">g</option>
                                                    </select>
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">Used for shipping calculation (Shopee/TikTok)</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-gray-600 mb-2">Package Dimensions (cm)</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={formData.dimensionLength || ''}
                                                        onChange={(e) => setFormData({ ...formData, dimensionLength: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Length"
                                                    />
                                                    <span className="text-xs text-gray-500 mt-1 block">Length</span>
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={formData.dimensionWidth || ''}
                                                        onChange={(e) => setFormData({ ...formData, dimensionWidth: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Width"
                                                    />
                                                    <span className="text-xs text-gray-500 mt-1 block">Width</span>
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={formData.dimensionHeight || ''}
                                                        onChange={(e) => setFormData({ ...formData, dimensionHeight: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        placeholder="Height"
                                                    />
                                                    <span className="text-xs text-gray-500 mt-1 block">Height</span>
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">Required for Shopee/TikTok shipping. Leave empty to use default 10×10×5 cm.</p>
                                        </div>

                                        <div className="flex gap-4 text-sm">
                                            <button type="button" className="text-gray-600 hover:text-gray-900">Country of origin</button>
                                            <button type="button" className="text-gray-600 hover:text-gray-900">HS Code</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Variants */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Variants</h3>
                                    <label className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-600">This product has variants</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.hasVariants}
                                            onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </label>
                                </div>

                                {formData.hasVariants ? (
                                    <VariantMatrixEditor
                                        productId={initialData?.id}
                                        productName={formData.title || 'Product'}
                                        productImage={formData.images[0]}
                                        basePrice={formData.price || 0}
                                        baseSku={formData.sku || 'SKU'}
                                        initialOptions={variantOptions}
                                        initialVariants={variants}
                                        onChange={(options, vars, deletedIds) => {
                                            setVariantOptions(options);
                                            setVariants(vars);
                                            if (deletedIds) {
                                                setDeletedVariantIds(prev => {
                                                    const newIds = deletedIds.filter(id => !prev.includes(id));
                                                    return [...prev, ...newIds];
                                                });
                                            }
                                        }}
                                    />
                                ) : (
                                    <button
                                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                        onClick={() => setFormData({ ...formData, hasVariants: true })}
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add options like size or color
                                    </button>
                                )}
                            </div>

                            {/* Purchase Options */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Purchase options</h3>
                                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                    <PlusIcon className="w-4 h-4" />
                                    Preorders, try before you buy, and more
                                </button>
                            </div>

                            {/* Metafields */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Metafields</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Size Chart</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder=""
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Search Engine Listing */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Search engine listing</h3>
                                    <button
                                        className="text-sm text-gray-600 hover:text-gray-900"
                                        onClick={() => setShowSeoSection(!showSeoSection)}
                                    >
                                        ✏️
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Add a title and description to see how this product might appear in a search engine listing
                                </p>

                                {showSeoSection && (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Page title</label>
                                            <input
                                                type="text"
                                                value={formData.seoTitle}
                                                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Meta description</label>
                                            <textarea
                                                value={formData.seoDescription}
                                                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">URL handle</label>
                                            <input
                                                type="text"
                                                value={formData.urlHandle}
                                                onChange={(e) => setFormData({ ...formData, urlHandle: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="space-y-6">

                            {/* Status */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Status</h3>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            {/* Publishing */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Publishing</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span className="text-sm">Online Store</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${shopeeStatus === 'success' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                            <span className="text-sm">Shopee</span>
                                        </div>
                                        {mode === 'edit' && initialData?.id && (
                                            <button
                                                type="button"
                                                onClick={handlePublishToShopee}
                                                disabled={shopeePublishing}
                                                className="px-3 py-1 text-xs font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {shopeePublishing ? (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Pushing...
                                                    </span>
                                                ) : shopeeStatus === 'success' ? 'Published' : 'Publish'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Catalogs */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Catalogs</h3>
                                <p className="text-sm text-gray-600">Malaysia</p>
                            </div>

                            {/* Product Highlights Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Product Highlights</h3>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Visibility</span>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm text-gray-700">New Arrival</span>
                                        <p className="text-xs text-gray-500">Paparkan produk ini di bahagian New Arrivals</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isNewArrival}
                                            onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm text-gray-700">Newest</span>
                                        <p className="text-xs text-gray-500">Paparkan produk ini sebagai produk terbaru</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Defect/Clearance Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">{productFormLabels.clearance.sectionTitle}</h3>
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">Sale</span>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm text-gray-700">{productFormLabels.clearance.toggleLabel}</span>
                                        <p className="text-xs text-gray-500">{productFormLabels.clearance.toggleHint}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isDefect}
                                            onChange={(e) => setFormData({ ...formData, isDefect: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                {formData.isDefect && (
                                    <div className="space-y-4 pt-4 border-t border-gray-200">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">{productFormLabels.clearance.defectTypeLabel}</label>
                                            <select
                                                value={formData.defectType}
                                                onChange={(e) => setFormData({ ...formData, defectType: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                                            >
                                                <option value="">{productFormLabels.clearance.defectTypePlaceholder}</option>
                                                {Object.entries(defectTypeLabels).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">{productFormLabels.clearance.defectDescriptionLabel}</label>
                                            <textarea
                                                value={formData.defectDescription}
                                                onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })}
                                                placeholder={productFormLabels.clearance.defectDescriptionPlaceholder}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{productFormLabels.clearance.defectDescriptionHint}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pre-Order Settings Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Pre-Order Settings</h3>
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Pre-order</span>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-sm text-gray-700">{productFormLabels.preorder.toggleLabel}</span>
                                        <p className="text-xs text-gray-500">{productFormLabels.preorder.toggleHint}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.allowPreorder}
                                            onChange={(e) => setFormData({ ...formData, allowPreorder: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                    </label>
                                </div>

                                {formData.allowPreorder && (
                                    <div className="space-y-4 pt-4 border-t border-gray-200">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">{productFormLabels.preorder.leadDaysLabel}</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="90"
                                                value={formData.preorderLeadDays}
                                                onChange={(e) => setFormData({ ...formData, preorderLeadDays: parseInt(e.target.value) || 14 })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{productFormLabels.preorder.leadDaysHint}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">{productFormLabels.preorder.messageLabel}</label>
                                            <textarea
                                                value={formData.preorderMessage}
                                                onChange={(e) => setFormData({ ...formData, preorderMessage: e.target.value })}
                                                placeholder={productFormLabels.preorder.messagePlaceholder}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 resize-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{productFormLabels.preorder.messageHint}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tailoring Settings Section */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">{productFormLabels.tailoring.sectionTitle}</h3>
                                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">Fabric</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm text-gray-700">{productFormLabels.tailoring.toggleLabel}</span>
                                        <p className="text-xs text-gray-500">Customers can add customization options while buying this product</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isTailorable}
                                            onChange={(e) => setFormData({ ...formData, isTailorable: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                                    </label>
                                </div>

                                {formData.isTailorable && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs text-gray-600">
                                            {productFormLabels.tailoring.activeButtonHint}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {productFormLabels.tailoring.manageLinkPrefix}<a href="/tailoring" className="text-teal-600 hover:underline">{productFormLabels.tailoring.manageLinkText}</a>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Product Organization */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center gap-1 mb-4">
                                    <h3 className="text-sm font-medium text-gray-900">Product organization</h3>
                                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Type</label>
                                        <input
                                            type="text"
                                            value={formData.productType}
                                            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Vendor</label>
                                        <input
                                            type="text"
                                            value={formData.vendor}
                                            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Size Chart</label>
                                        <select
                                            value={formData.sizeChartId}
                                            onChange={(e) => setFormData({ ...formData, sizeChartId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            disabled={loadingSizeCharts}
                                        >
                                            <option value="">{loadingSizeCharts ? 'Loading...' : 'No size chart'}</option>
                                            {sizeCharts.map((chart) => (
                                                <option key={chart.id} value={chart.id}>
                                                    {chart.name} ({chart.gender === 'women' ? 'Wanita' : chart.gender === 'men' ? 'Lelaki' : chart.gender})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Optional - helps customers find their size</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Supplier</label>
                                        <select
                                            value={formData.supplierId}
                                            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            disabled={loadingSuppliers}
                                        >
                                            <option value="">{loadingSuppliers ? 'Loading...' : 'We ship this ourselves'}</option>
                                            {suppliers.map((supplier) => (
                                                <option key={supplier.id} value={supplier.id}>
                                                    {supplier.name}{supplier.isActive ? '' : ' (inactive)'}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Who dispatches this product. Leave unset for factory-direct lines we ship ourselves.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">Tags</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {formData.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-2 py-1 bg-gray-100 text-sm rounded flex items-center gap-1"
                                                >
                                                    {tag}
                                                    <button onClick={() => removeTag(tag)}>
                                                        <XMarkIcon className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="Add tags"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                    >
                        <XMarkIcon className="w-8 h-8" />
                    </button>
                    <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={lightboxImage}
                            alt="Full size preview"
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                    </div>
                    {formData.images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = lightboxIndex === 0 ? formData.images.length - 1 : lightboxIndex - 1;
                                    setLightboxIndex(newIndex);
                                    setLightboxImage(formData.images[newIndex]);
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 bg-black/50 rounded-full"
                            >
                                <ChevronLeftIcon className="w-8 h-8" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newIndex = lightboxIndex === formData.images.length - 1 ? 0 : lightboxIndex + 1;
                                    setLightboxIndex(newIndex);
                                    setLightboxImage(formData.images[newIndex]);
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 bg-black/50 rounded-full"
                            >
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                                {lightboxIndex + 1} / {formData.images.length}
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
