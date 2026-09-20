'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    PolarisPage,
    PolarisCard,
    PolarisTextField,
    PolarisSelect,
    PolarisButton,
} from '../polaris';
import { FolderOpen, Plus, X, Search, Layers, Upload, Loader2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import type { Collection, CollectionFormData } from './collections';
import type { Category } from '../categories/categories';

export interface CollectionFormProps {
    mode: 'create' | 'edit';
    initialData?: Collection;
    /** Full flat list of categories (drives the category-picker modal). */
    categories: Category[];
    onSubmit: (data: CollectionFormData, opts: { pendingImageFile?: File }) => Promise<void>;
    onCancel: () => void;
    /** Edit mode: upload a new image immediately. */
    onUploadImage?: (file: File) => Promise<{ image_url: string }>;
    /** Edit mode: clear the saved image. */
    onDeleteImage?: () => Promise<void>;
}

interface InternalFormState {
    name: string;
    description: string;
    image_url: string;
    collection_type: 'manual' | 'automated';
    sort_order: string;
    meta_title: string;
    meta_desc: string;
    is_active: boolean;
    category_ids: string[];
}

const sortOrderOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'alpha-asc', label: 'Alphabetically: A-Z' },
    { value: 'alpha-desc', label: 'Alphabetically: Z-A' },
    { value: 'created-asc', label: 'Date: Old to new' },
    { value: 'created-desc', label: 'Date: New to old' },
];

export default function CollectionForm({
    mode,
    initialData,
    categories,
    onSubmit,
    onCancel,
    onUploadImage,
    onDeleteImage,
}: CollectionFormProps) {
    const { showToast, ToastContainer } = useToast();
    const [saving, setSaving] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // initialData is a Collection -- a READ type, camelCase since NIAGA-389.
    // formData is InternalFormState, which feeds CollectionFormData, the
    // REQUEST body -- snake_case, because service-catalog binds snake_case and
    // request bodies are forwarded verbatim (NIAGA-365). The two sides of this
    // assignment differ on purpose.
    const [formData, setFormData] = useState<InternalFormState>({
        name: initialData?.name || '',
        description: initialData?.description || '',
        image_url: initialData?.imageUrl || '',
        collection_type: initialData?.collectionType || 'manual',
        sort_order: initialData?.sortOrder || 'manual',
        meta_title: initialData?.metaTitle || '',
        meta_desc: initialData?.metaDesc || '',
        is_active: initialData?.isActive ?? true,
        category_ids: initialData?.categoryIds || [],
    });

    // Sync selectedCategories whenever the form's category_ids or the source list changes.
    useEffect(() => {
        const selected = categories.filter(c => formData.category_ids.includes(c.id));
        setSelectedCategories(selected);
    }, [categories, formData.category_ids]);

    const filterAvailableCategories = (search: string = '') => {
        let filtered = categories.filter(c => !formData.category_ids.includes(c.id));
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                c => c.name.toLowerCase().includes(searchLower) ||
                     c.slug.toLowerCase().includes(searchLower)
            );
        }
        setAvailableCategories(filtered);
    };

    const handleChange = (field: keyof InternalFormState, value: string | boolean | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddCategory = (category: Category) => {
        setFormData(prev => ({
            ...prev,
            category_ids: [...prev.category_ids, category.id],
        }));
        setAvailableCategories(prev => prev.filter(c => c.id !== category.id));
    };

    const handleRemoveCategory = (categoryId: string) => {
        const removed = selectedCategories.find(c => c.id === categoryId);
        setFormData(prev => ({
            ...prev,
            category_ids: prev.category_ids.filter(id => id !== categoryId),
        }));
        if (removed) {
            setAvailableCategories(prev => [...prev, removed]);
        }
    };

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size must be less than 5MB', 'error');
            return;
        }

        if (mode === 'edit' && initialData?.id && onUploadImage) {
            setUploadingImage(true);
            try {
                const result = await onUploadImage(file);
                handleChange('image_url', result.image_url || '');
                showToast('Image uploaded successfully', 'success');
            } catch (err) {
                console.error('Upload error:', err);
                showToast('Failed to upload image', 'error');
            } finally {
                setUploadingImage(false);
            }
        } else {
            // Create mode — defer upload until after collection is created.
            setPendingImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleRemoveImage = async () => {
        if (mode === 'edit' && initialData?.id && formData.image_url && onDeleteImage) {
            setUploadingImage(true);
            try {
                await onDeleteImage();
                handleChange('image_url', '');
                showToast('Image removed successfully', 'success');
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Failed to remove image', 'error');
            } finally {
                setUploadingImage(false);
            }
        } else {
            handleChange('image_url', '');
            setPendingImageFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            showToast('Collection name is required', 'error');
            return;
        }

        setSaving(true);
        try {
            const data: CollectionFormData = {
                name: formData.name,
                description: formData.description,
                image_url: formData.image_url,
                collection_type: formData.collection_type,
                sort_order: formData.sort_order,
                meta_title: formData.meta_title,
                meta_desc: formData.meta_desc,
                is_active: formData.is_active,
                category_ids: formData.category_ids,
            };

            await onSubmit(data, { pendingImageFile: pendingImageFile || undefined });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--p-surface))]">
            <ToastContainer />

            {/* Category Selection Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Add categories</h3>
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 border-b">
                            <PolarisTextField
                                placeholder="Search categories..."
                                value={categorySearch}
                                onChange={(e) => {
                                    setCategorySearch(e.target.value);
                                    filterAvailableCategories(e.target.value);
                                }}
                                prefix={<Search className="w-4 h-4" />}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {availableCategories.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No categories found</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableCategories.map(category => (
                                        <button
                                            key={category.id}
                                            onClick={() => handleAddCategory(category)}
                                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                                {category.image ? (
                                                    <Image
                                                        src={category.image}
                                                        alt={category.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Layers className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{category.name}</p>
                                                <p className="text-sm text-gray-500">{category.productCount} products</p>
                                            </div>
                                            <Plus className="w-5 h-5 text-blue-600" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t">
                            <PolarisButton
                                fullWidth
                                onClick={() => setShowCategoryModal(false)}
                            >
                                Done
                            </PolarisButton>
                        </div>
                    </div>
                </div>
            )}

            <PolarisPage
                title={mode === 'create' ? 'Create collection' : 'Edit collection'}
                backAction={{
                    content: 'Collections',
                    onAction: onCancel,
                }}
                primaryAction={{
                    content: saving ? 'Saving...' : 'Save',
                    onAction: handleSubmit,
                    disabled: saving,
                }}
                secondaryActions={[
                    {
                        content: 'Discard',
                        onAction: onCancel,
                    },
                ]}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content - Left Side */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Title and Description */}
                        <PolarisCard>
                            <div className="space-y-4">
                                <PolarisTextField
                                    label="Title"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="e.g., Summer Collection"
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Describe this collection..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>
                        </PolarisCard>

                        {/* Categories */}
                        <PolarisCard title="Categories">
                            {selectedCategories.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedCategories.map(category => (
                                        <div
                                            key={category.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50"
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                                                {category.image ? (
                                                    <Image
                                                        src={category.image}
                                                        alt={category.name}
                                                        width={48}
                                                        height={48}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Layers className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{category.name}</p>
                                                <p className="text-sm text-gray-500">{category.productCount} products</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCategory(category.id)}
                                                className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <PolarisButton
                                        variant="secondary"
                                        onClick={() => {
                                            filterAvailableCategories();
                                            setShowCategoryModal(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add more categories
                                    </PolarisButton>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                        <FolderOpen className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 mb-4">No categories in this collection yet</p>
                                    <PolarisButton
                                        onClick={() => {
                                            filterAvailableCategories();
                                            setShowCategoryModal(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add categories
                                    </PolarisButton>
                                </div>
                            )}
                        </PolarisCard>

                        {/* SEO */}
                        <PolarisCard title="Search engine listing">
                            <div className="space-y-4">
                                <PolarisTextField
                                    label="Page title"
                                    value={formData.meta_title}
                                    onChange={(e) => handleChange('meta_title', e.target.value)}
                                    placeholder="Collection title for search engines"
                                    helpText="Recommended: 50-60 characters"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Meta description
                                    </label>
                                    <textarea
                                        value={formData.meta_desc}
                                        onChange={(e) => handleChange('meta_desc', e.target.value)}
                                        placeholder="Description for search engines..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">Recommended: 150-160 characters</p>
                                </div>
                            </div>
                        </PolarisCard>
                    </div>

                    {/* Sidebar - Right Side */}
                    <div className="space-y-6">
                        {/* Status */}
                        <PolarisCard title="Status">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Active</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => handleChange('is_active', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </PolarisCard>

                        {/* Collection Image */}
                        <PolarisCard title="Collection image">
                            <div className="space-y-4">
                                {(formData.image_url || previewUrl) ? (
                                    <div className="relative">
                                        <Image
                                            src={previewUrl || formData.image_url}
                                            alt="Collection"
                                            width={300}
                                            height={200}
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={handleRemoveImage}
                                            disabled={uploadingImage}
                                            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow hover:bg-gray-100 disabled:opacity-50"
                                            title="Remove image"
                                        >
                                            {uploadingImage ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                        </button>
                                        {previewUrl && mode === 'create' && (
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs">
                                                Will be uploaded on save
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                            isDragging
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                        } ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            disabled={uploadingImage}
                                        />
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 className="w-8 h-8 mx-auto text-blue-500 mb-2 animate-spin" />
                                                <p className="text-sm text-gray-600">Uploading...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Click to upload or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="text-center">
                                    <span className="text-xs text-gray-400">or</span>
                                </div>
                                <PolarisTextField
                                    label="Image URL"
                                    value={formData.image_url}
                                    onChange={(e) => handleChange('image_url', e.target.value)}
                                    placeholder="https://..."
                                    helpText="Paste an image URL directly"
                                />
                            </div>
                        </PolarisCard>

                        {/* Sorting */}
                        <PolarisCard title="Sort categories">
                            <PolarisSelect
                                label="Sort order"
                                value={formData.sort_order}
                                onChange={(e) => handleChange('sort_order', e.target.value)}
                                options={sortOrderOptions}
                            />
                        </PolarisCard>
                    </div>
                </div>
            </PolarisPage>
        </div>
    );
}
