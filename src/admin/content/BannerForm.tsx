'use client';

import { useState } from 'react';
import { useForm, type UseFormRegister, type UseFormWatch, type UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { Button } from '../../primitives/button';
import { Switch } from '../../primitives/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../primitives/select';
import { ImageUpload, type ImageUploadResponse } from '../../primitives/image-upload';
import { Loader2, Upload, MapPin } from 'lucide-react';
import type { Banner, BannerLocationOption } from './banners';

const bannerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    image_desktop: z.string().min(1, 'Banner image is required'),
    cta_url: z.string().optional().or(z.literal('')),
    is_active: z.boolean(),
    sort_order: z.number(),
    banner_type: z.string().optional(),
    location: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    image_mobile: z.string().optional(),
    video_url: z.string().optional(),
    cta_text: z.string().optional(),
    text_position: z.string().optional(),
    text_color: z.string().optional(),
    overlay_color: z.string().optional(),
    overlay_opacity: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
});

export type BannerFormData = z.infer<typeof bannerSchema>;

export interface BannerFormHelpers {
    register: UseFormRegister<BannerFormData>;
    setValue: UseFormSetValue<BannerFormData>;
    watch: UseFormWatch<BannerFormData>;
}

export interface BannerFormProps {
    bannerLocations: BannerLocationOption[];
    initialData?: Banner;
    onSubmit: (data: BannerFormData) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    /** Image upload backend (forwarded to lib-ui ImageUpload primitive). */
    uploadImage: (formData: FormData) => Promise<ImageUploadResponse>;
    /** Optional broken-preview fallback path (forwarded to ImageUpload). */
    fallbackImageSrc?: string;
    /** Optional tenant-specific UI rendered below the location selector when
     *  certain location values are picked (e.g. a tenant's brand-story block). */
    renderLocationExtras?: (selectedLocation: string, helpers: BannerFormHelpers) => React.ReactNode;
}

export default function BannerForm({
    bannerLocations,
    initialData,
    onSubmit,
    onCancel,
    isLoading,
    uploadImage,
    fallbackImageSrc,
    renderLocationExtras,
}: BannerFormProps) {
    const [previewImage, setPreviewImage] = useState(initialData?.imageDesktop || '');
    const [previewMobileImage, setPreviewMobileImage] = useState(initialData?.imageMobile || '');

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BannerFormData>({
        resolver: zodResolver(bannerSchema),
        defaultValues: initialData || {
            name: '',
            image_desktop: '',
            cta_url: '',
            is_active: true,
            sort_order: 0,
            banner_type: 'hero',
            location: bannerLocations[0]?.value || '',
            title: '',
            subtitle: '',
            description: '',
            image_mobile: '',
            cta_text: '',
            text_position: 'center',
            text_color: '#ffffff',
            overlay_color: '#000000',
            overlay_opacity: 0,
        },
    });

    const isActive = watch('is_active');
    const selectedLocation = watch('location') || bannerLocations[0]?.value || '';

    const handleCancel = onCancel || (() => window.history.back());

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Banner Image - Desktop */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Desktop Banner</CardTitle>
                            <CardDescription>For laptops and desktops (recommended: 1920x600px, 16:5 ratio)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageUpload
                                value={watch('image_desktop')}
                                onChange={(url) => {
                                    setValue('image_desktop', url);
                                    setPreviewImage(url);
                                }}
                                uploadFn={uploadImage}
                                fallbackImageSrc={fallbackImageSrc}
                                folder="cms/banners"
                                aspectRatio="banner"
                                placeholder="Click to upload desktop banner"
                            />
                            {errors.image_desktop && (
                                <p className="text-sm text-destructive mt-2">{errors.image_desktop.message}</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Banner Image - Mobile */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Mobile Banner (Optional)</CardTitle>
                            <CardDescription>For phones (recommended: 750x1000px, 3:4 ratio). If not set, desktop image will be used.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ImageUpload
                                value={watch('image_mobile') || ''}
                                onChange={(url) => {
                                    setValue('image_mobile', url);
                                    setPreviewMobileImage(url);
                                }}
                                uploadFn={uploadImage}
                                fallbackImageSrc={fallbackImageSrc}
                                folder="cms/banners/mobile"
                                aspectRatio="portrait"
                                placeholder="Click to upload mobile banner"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                                Tip: Use a taller image (portrait) for mobile to maximize screen space
                            </p>
                        </CardContent>
                    </Card>

                    {/* Banner Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Banner Details</CardTitle>
                            <CardDescription>Choose where to display and configure the banner</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Location Selector */}
                            <div>
                                <Label htmlFor="location" className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Display Location *
                                </Label>
                                <Select
                                    value={selectedLocation}
                                    onValueChange={(value) => {
                                        setValue('location', value);
                                        const loc = bannerLocations.find(l => l.value === value);
                                        setValue('banner_type', loc?.bannerType || 'hero');
                                    }}
                                >
                                    <SelectTrigger className="w-full mt-1">
                                        <SelectValue placeholder="Select where to show this banner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bannerLocations.map((loc) => (
                                            <SelectItem key={loc.value} value={loc.value}>
                                                <div className="flex flex-col">
                                                    <span>{loc.label}</span>
                                                    <span className="text-xs text-muted-foreground">{loc.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Choose which page this banner will appear on
                                </p>
                            </div>

                            {/* Tenant-specific extra fields (e.g. a brand-story block) */}
                            {renderLocationExtras?.(selectedLocation, { register, setValue, watch })}

                            <div>
                                <Label htmlFor="name">Banner Name *</Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="e.g., Promosi Raya 2024"
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    For your reference only, not shown on storefront
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="cta_url">Link URL (Optional)</Label>
                                <Input
                                    id="cta_url"
                                    {...register('cta_url')}
                                    placeholder="e.g., /categories/apparel or /products/abc123"
                                />
                                {errors.cta_url && (
                                    <p className="text-sm text-destructive mt-1">{errors.cta_url.message}</p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                    Where to go when customer clicks the banner
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="sort_order">Display Order</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    {...register('sort_order', { valueAsNumber: true })}
                                    placeholder="0"
                                    className="w-32"
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    Lower number = shows first
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview & Status Panel */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Desktop Preview */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Desktop</p>
                                {previewImage ? (
                                    <div className="relative w-full aspect-[16/6] rounded-lg overflow-hidden bg-muted">
                                        <Image
                                            src={previewImage}
                                            alt="Desktop Banner"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full aspect-[16/6] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                                        <div className="text-center text-muted-foreground">
                                            <Upload className="w-6 h-6 mx-auto mb-1" />
                                            <p className="text-xs">No desktop image</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Preview */}
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Mobile</p>
                                <div className="flex justify-center">
                                    {previewMobileImage ? (
                                        <div className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                                            <Image
                                                src={previewMobileImage}
                                                alt="Mobile Banner"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : previewImage ? (
                                        <div className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
                                            <Image
                                                src={previewImage}
                                                alt="Mobile uses desktop"
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <p className="text-[8px] text-white text-center px-1">Uses desktop</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-20 aspect-[3/4] rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
                                            <p className="text-[8px] text-muted-foreground text-center px-1">No image</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location Badge */}
                            <div className="pt-4 border-t">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Display On</p>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        {bannerLocations.find(l => l.value === selectedLocation)?.label || selectedLocation}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="is_active" className="text-base font-medium">Active</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Show on storefront
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_active"
                                        checked={isActive}
                                        onCheckedChange={(checked) => setValue('is_active', checked)}
                                    />
                                </div>
                            </div>

                            {watch('cta_url') && (
                                <div className="pt-4 border-t">
                                    <p className="text-sm">
                                        <span className="font-medium">Links to:</span>{' '}
                                        <span className="text-muted-foreground">{watch('cta_url')}</span>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {initialData ? 'Update Banner' : 'Create Banner'}
                </Button>
            </div>
        </form>
    );
}
