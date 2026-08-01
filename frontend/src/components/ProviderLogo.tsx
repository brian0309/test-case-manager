import React from "react";
import { PROVIDER_BRANDS } from "../utils/providerBrands";
import type { AIProvider } from "../utils/providerBrands";

interface ProviderLogoProps {
    provider: AIProvider;
    size?: "sm" | "md";
    className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProviderLogoProps["size"]>, string> = {
    sm: "h-6 w-6 rounded-md text-[10px]",
    md: "h-9 w-9 rounded-lg text-sm",
};

const ProviderLogo: React.FC<ProviderLogoProps> = ({ provider, size = "md", className = "" }) => {
    const brand = PROVIDER_BRANDS[provider];
    return (
        <span
            className={`inline-flex items-center justify-center font-bold text-white shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
            style={{ backgroundColor: brand.color }}
            aria-hidden="true"
        >
            {brand.monogram}
        </span>
    );
};

export default ProviderLogo;
