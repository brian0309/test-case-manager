import React, { useRef, useCallback, useState } from 'react';
import { X, Upload, Image, Loader2 } from 'lucide-react';
import { uploadImage, validateImageFile } from '../utils/imageUpload';
import toast from 'react-hot-toast';

interface ImageItem {
    id: string;
    url: string;
    isUploading: boolean;
}

interface ImagePreviewUploaderProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    maxImages?: number;
    disabled?: boolean;
}

const ImagePreviewUploader: React.FC<ImagePreviewUploaderProps> = ({
    images,
    onImagesChange,
    maxImages = 5,
    disabled = false,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImages, setUploadingImages] = useState<ImageItem[]>([]);

    const handleFileUpload = useCallback(async (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        if (images.length + uploadingImages.length >= maxImages) {
            toast.error(`Maximum ${maxImages} images allowed`);
            return;
        }

        // Create a temporary preview
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const localPreviewUrl = URL.createObjectURL(file);

        setUploadingImages(prev => [...prev, { id: tempId, url: localPreviewUrl, isUploading: true }]);

        try {
            const uploadedUrl = await uploadImage(file);
            
            // Remove from uploading and add to images
            setUploadingImages(prev => prev.filter(img => img.id !== tempId));
            onImagesChange([...images, uploadedUrl]);
            
            // Clean up local URL
            URL.revokeObjectURL(localPreviewUrl);
        } catch (error: unknown) {
            console.error('Upload failed:', error);
            toast.error((error as Error).message || 'Failed to upload image');
            setUploadingImages(prev => prev.filter(img => img.id !== tempId));
            URL.revokeObjectURL(localPreviewUrl);
        }
    }, [images, uploadingImages.length, maxImages, onImagesChange]);

    const handleFilesSelect = useCallback((files: FileList | null) => {
        if (!files) return;
        
        Array.from(files).forEach(file => {
            handleFileUpload(file);
        });
    }, [handleFileUpload]);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    handleFileUpload(file);
                }
                break;
            }
        }
    }, [handleFileUpload]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        handleFilesSelect(files);
    }, [handleFilesSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const removeImage = useCallback((indexToRemove: number) => {
        onImagesChange(images.filter((_, index) => index !== indexToRemove));
    }, [images, onImagesChange]);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const allImages = [
        ...images.map((url, idx) => ({ id: `img-${idx}`, url, isUploading: false, originalIndex: idx })),
        ...uploadingImages.map(img => ({ ...img, originalIndex: -1 }))
    ];

    return (
        <div 
            className="space-y-2"
            onPaste={!disabled ? handlePaste : undefined}
            onDrop={!disabled ? handleDrop : undefined}
            onDragOver={!disabled ? handleDragOver : undefined}
        >
            {/* Image Previews */}
            {allImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {allImages.map((img, index) => (
                        <div 
                            key={img.id}
                            className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                        >
                            <img 
                                src={img.url} 
                                alt={`Preview ${index + 1}`}
                                className={`w-full h-full object-cover ${img.isUploading ? 'opacity-50' : ''}`}
                            />
                            {img.isUploading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => removeImage(img.originalIndex)}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    disabled={disabled}
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    {/* Add More Button */}
                    {allImages.length < maxImages && !disabled && (
                        <button
                            type="button"
                            onClick={handleButtonClick}
                            className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            <Upload className="w-5 h-5" />
                        </button>
                    )}
                </div>
            )}

            {/* Empty State / Upload Area */}
            {allImages.length === 0 && (
                <button
                    type="button"
                    onClick={handleButtonClick}
                    disabled={disabled}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg flex items-center justify-center gap-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Image className="w-4 h-4" />
                    <span className="text-sm">Add images (paste or drag & drop)</span>
                </button>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => handleFilesSelect(e.target.files)}
                className="hidden"
                disabled={disabled}
            />
        </div>
    );
};

export default ImagePreviewUploader;
