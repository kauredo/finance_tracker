"use client";

import { HTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "circle" | "rounded";
  fallbackColor?: string;
  showBorder?: boolean;
  status?: "online" | "offline" | "away" | "busy";
}

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = "",
      name,
      size = "md",
      variant = "circle",
      fallbackColor,
      showBorder = false,
      status,
      ...props
    },
    ref,
  ) => {
    const [imageError, setImageError] = useState(false);
    const dimension = sizeMap[size];

    // Generate initials from name
    const getInitials = (name?: string) => {
      if (!name) return "?";
      const parts = name.trim().split(" ");
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    };

    // Generate a consistent color from name
    const getColorFromName = (name?: string) => {
      if (fallbackColor) return fallbackColor;
      if (!name) return "var(--primary)";

      const colors = [
        "var(--primary)",
        "var(--growth)",
        "var(--warning)",
        "var(--info)",
        "#ba68c8", // purple
        "#ff8a65", // orange
      ];

      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    };

    const sizeStyles = {
      xs: "text-[10px]",
      sm: "text-xs",
      md: "text-sm",
      lg: "text-lg",
      xl: "text-2xl",
    };

    const statusSizes = {
      xs: "w-2 h-2 border",
      sm: "w-2.5 h-2.5 border",
      md: "w-3 h-3 border-2",
      lg: "w-4 h-4 border-2",
      xl: "w-5 h-5 border-2",
    };

    const statusColors = {
      online: "bg-growth",
      offline: "bg-muted",
      away: "bg-warning",
      busy: "bg-danger",
    };

    const showFallback = !src || imageError;

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center flex-shrink-0 overflow-hidden",
          variant === "circle" ? "rounded-full" : "rounded-xl",
          showBorder && "ring-2 ring-surface ring-offset-2 ring-offset-background",
          className,
        )}
        style={{
          width: dimension,
          height: dimension,
          backgroundColor: showFallback ? getColorFromName(name) : undefined,
        }}
        {...props}
      >
        {!showFallback ? (
          <Image
            src={src!}
            alt={alt || name || "Avatar"}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            className={cn(
              "font-display font-bold text-white select-none",
              sizeStyles[size],
            )}
          >
            {getInitials(name)}
          </span>
        )}

        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-surface",
              statusSizes[size],
              statusColors[status],
            )}
          />
        )}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

// Avatar Group for showing multiple avatars
interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  avatars: Array<{
    src?: string | null;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
}

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, avatars, max = 4, size = "md", ...props }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;

    const overlapMap = {
      xs: "-ml-2",
      sm: "-ml-2.5",
      md: "-ml-3",
      lg: "-ml-4",
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center", className)}
        {...props}
      >
        {visibleAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt}
            size={size}
            showBorder
            className={cn(index > 0 && overlapMap[size])}
            style={{ zIndex: visibleAvatars.length - index }}
          />
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-sand text-bark font-medium ring-2 ring-surface",
              overlapMap[size],
              size === "xs" && "w-6 h-6 text-[10px]",
              size === "sm" && "w-8 h-8 text-xs",
              size === "md" && "w-10 h-10 text-sm",
              size === "lg" && "w-14 h-14 text-base",
            )}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  },
);

AvatarGroup.displayName = "AvatarGroup";

// Avatar with name and optional description
interface AvatarWithTextProps extends AvatarProps {
  title?: string;
  subtitle?: string;
}

const AvatarWithText = forwardRef<HTMLDivElement, AvatarWithTextProps>(
  ({ title, subtitle, className, ...avatarProps }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center gap-3", className)}>
        <Avatar {...avatarProps} />
        <div className="min-w-0 flex-1">
          {title && (
            <p className="text-sm font-medium text-foreground truncate">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-text-secondary truncate">{subtitle}</p>
          )}
        </div>
      </div>
    );
  },
);

AvatarWithText.displayName = "AvatarWithText";

export { Avatar, AvatarGroup, AvatarWithText };
