import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Strikethrough, Heading1, Heading2, Quote, ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage, validateImageFile } from '../../utils/imageUpload';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    editable?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, onBlur, placeholder = 'Write something...', editable = true }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<any>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: false,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-[400px] max-h-[400px] w-auto h-auto cursor-pointer hover:opacity-90 transition-opacity',
                },
            }),
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        onBlur: () => {
            onBlur?.();
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[200px] text-gray-700 dark:text-gray-300 leading-relaxed max-w-none dark:prose-invert [&_img[src^="blob:"]]:opacity-50 [&_img[src^="blob:"]]:grayscale [&_img[src^="blob:"]]:blur-[1px] transition-all dark:[&_p]:text-gray-300 dark:[&_ul]:text-gray-300 dark:[&_ol]:text-gray-300 dark:[&_blockquote]:text-gray-300 dark:[&_h1]:text-gray-100 dark:[&_h2]:text-gray-100 dark:[&_h3]:text-gray-100 dark:[&_strong]:text-gray-100 dark:[&_em]:text-gray-300 dark:[&_strike]:text-gray-300 dark:[&_code]:text-gray-300 dark:prose-headings:text-gray-100 dark:prose-strong:text-gray-100 dark:prose-code:text-gray-300 dark:prose-blockquote:text-gray-300',
            },
            handleDrop: (_view: any, event: any, _slice: any, moved: any) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        event.preventDefault();
                        handleImageUpload(file);
                        return true;
                    }
                }
                return false;
            },
            handlePaste: (_view: any, event: any) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.startsWith('image/')) {
                            const file = items[i].getAsFile();
                            if (file) {
                                event.preventDefault();
                                handleImageUpload(file);
                                return true;
                            }
                        }
                    }
                }
                return false;
            },
        },
    });

    // Keep editor ref in sync
    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    // Update editor content if prop changes externally (e.g. from AI)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Handle image upload
    const handleImageUpload = async (file: File) => {
        const currentEditor = editorRef.current;
        if (!currentEditor) return;

        // Validate file
        const validationError = validateImageFile(file);
        if (validationError) {
            toast.error(validationError);
            return;
        }

        // Create blob URL for immediate preview
        const blobUrl = URL.createObjectURL(file);

        // Insert image immediately with loading state
        currentEditor.chain().focus().setImage({ src: blobUrl }).run();

        setIsUploading(true);
        try {
            const url = await uploadImage(file);

            // Find the image with the blobUrl and replace it with the real URL
            currentEditor.view.state.doc.descendants((node: any, pos: number) => {
                if (node.type.name === 'image' && node.attrs.src === blobUrl) {
                    const transaction = currentEditor.state.tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        src: url
                    });
                    currentEditor.view.dispatch(transaction);
                    return false; // Stop traversal
                }
                return true;
            });

            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Image upload failed:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload image');

            // Remove the temporary image on failure
            currentEditor.view.state.doc.descendants((node: any, pos: number) => {
                if (node.type.name === 'image' && node.attrs.src === blobUrl) {
                    const transaction = currentEditor.state.tr.delete(pos, pos + node.nodeSize);
                    currentEditor.view.dispatch(transaction);
                    return false;
                }
                return true;
            });
        } finally {
            setIsUploading(false);
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
        }
    };

    // Handle file selection from input
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
        // Reset input value so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!editor) return null;

    const MenuButton = ({
        isActive,
        onClick,
        icon: Icon
    }: {
        isActive: boolean;
        onClick: () => void;
        icon: React.ElementType
    }) => (
        <button
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()}
            className={`p-1.5 rounded-md transition-colors ${isActive
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
        >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
        </button>
    );

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/50 focus-within:border-blue-300 dark:focus-within:border-blue-600 transition-all">
            {editable && (
                <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        icon={Bold}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        icon={Italic}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        icon={Strikethrough}
                    />
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive('heading', { level: 1 })}
                        icon={Heading1}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                        icon={Heading2}
                    />
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        icon={List}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        icon={ListOrdered}
                    />
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                        icon={Quote}
                    />
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`p-1.5 rounded-md transition-colors ${isUploading
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        title="Insert image"
                    >
                        {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                        ) : (
                            <ImagePlus className="h-4 w-4" strokeWidth={2.5} />
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            )}
            <div
                className="p-4 bg-white dark:bg-gray-800 cursor-text"
                onClick={(e) => {
                    // If not editable, check if an image was clicked to zoom
                    if (!editable) {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG' && target.getAttribute('src')) {
                            setZoomedImage(target.getAttribute('src'));
                            return;
                        }
                    }
                    // Otherwise focus editor
                    if (editable) {
                        editor.chain().focus().run();
                    }
                }}
            >
                <EditorContent editor={editor} />
            </div>

            {/* Image Lightbox */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                >
                    <button
                        onClick={() => setZoomedImage(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={zoomedImage}
                        alt="Zoomed content"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
