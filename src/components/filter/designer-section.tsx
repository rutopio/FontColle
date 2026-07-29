import { BuildingsIcon, UserIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { MatchMode } from "@/lib/fonts/filter";
import { vendorLabel } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

export function DesignerSection({
  designers,
  vendors,
  selectedDesigners,
  selectedVendors,
  onToggleDesigner,
  onToggleVendor,
  onResetDesigners,
  onResetVendors,
  designerMode,
  onToggleDesignerMode,
  vendorCasing,
}: {
  designers: [string, number][];
  vendors: [string, number][];
  selectedDesigners: string[];
  selectedVendors: string[];
  onToggleDesigner: (v: string) => void;
  onToggleVendor: (v: string) => void;
  onResetDesigners: () => void;
  onResetVendors: () => void;
  designerMode: MatchMode;
  onToggleDesignerMode: () => void;
  vendorCasing: Map<string, string>;
}) {
  const designerItems = useMemo(
    () => designers.map(([v, c]) => [v, c, v] as const),
    [designers]
  );
  const vendorItems = useMemo(
    () => vendors.map(([v, c]) => [v, c, vendorLabel(v)] as const),
    [vendors]
  );

  return (
    <>
      <FacetSearchSection
        title="Designer"
        icon={UserIcon}
        items={designerItems}
        selected={selectedDesigners}
        onToggle={onToggleDesigner}
        onReset={onResetDesigners}
        searchPlaceholder="Search designers"
        topN={12}
        mode={designerMode}
        onToggleMode={onToggleDesignerMode}
      />
      <FacetSearchSection
        title="Vendor"
        icon={BuildingsIcon}
        items={vendorItems}
        selected={selectedVendors}
        onToggle={onToggleVendor}
        onReset={onResetVendors}
        searchPlaceholder="Search vendors"
        topN={8}
        pillTitle={(code) => vendorCasing.get(code) ?? code}
        info="The vendor is the four-character OS/2 vendor ID embedded in the font. Foundry names come from Microsoft's registered-vendor list (learn.microsoft.com/typography/vendors); unregistered codes show the raw ID."
      />
    </>
  );
}
