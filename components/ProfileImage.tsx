
import React, { useState } from 'react';

interface ProfileImageProps {
    src?: string | null;
    displayName?: string | null;
    className?: string;
}

const ProfileImage: React.FC<ProfileImageProps> = ({ src, displayName, className }) => {
    const [error, setError] = useState(false);
    const fallbackUrl = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';

    // Logic for a letter-based avatar if image fails completely
    const initials = displayName ? displayName.charAt(0).toUpperCase() : '?';

    if (error || !src) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-primary/40 to-primary/10 border border-white/10 text-white font-bold select-none ${className}`}>
                {initials}
            </div>
        );
    }

    return (
        <img
            src={src}
            className={`${className} object-cover`}
            alt={displayName || 'Profile'}
            onError={() => setError(true)}
        />
    );
};

export default ProfileImage;
