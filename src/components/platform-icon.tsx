import { FaTiktok, FaInstagram, FaFacebook, FaWhatsapp, FaGlobe } from "react-icons/fa";

interface PlatformIconProps {
    platform: string | null | undefined;
    className?: string;
}

export function PlatformIcon({ platform, className = "h-4 w-4" }: PlatformIconProps) {
    if (!platform) return <FaGlobe className={className} />;

    switch (platform.toLowerCase()) {
        case "tiktok":
            return <FaTiktok className={className} />;
        case "instagram":
            return <FaInstagram className={className} />;
        case "facebook":
            return <FaFacebook className={className} />;
        case "whatsapp":
            return <FaWhatsapp className={className} />;
        default:
            return <FaGlobe className={className} />;
    }
}
