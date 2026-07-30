"use client";

import type { ComponentType } from "react";

/**
 * Icon shape the registry components accept for their optional `icon` prop.
 * Structural, so any icon library works — this project passes Phosphor.
 * The registry ships a full Lucide-backed provider here; only the type is
 * kept so the tree pulls in no second icon library.
 */
export interface IconComponentProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export type IconComponent = ComponentType<IconComponentProps>;
