import { BuildingsIcon, UserIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { vendorLabel } from "@/lib/fonts/labels";
import { FacetSearchSection } from "./facet-search-section";

// Browse by who made the font. Two searchable facet lists: Designer (real
// names, 700+ of them) and Vendor (folded OS/2 achVendID). Both use the shared
// FacetSearchSection — a live search over the whole list with the top values up
// front and the tail behind a "N more" expander.
//
// Designer labels are the value itself. Vendor labels are the foundry name from
// Microsoft's registry (vendorLabel), so a pill reads "ParaType", not "PYRS";
// the raw 4-char code shows in the pill's hover tooltip and is still searchable
// (FacetSearchSection matches both value and label). Unregistered codes fall
// back to the code as the label.
export function DesignerSection({
  designers,
  vendors,
  selectedDesigners,
  selectedVendors,
  onToggleDesigner,
  onToggleVendor,
  onResetDesigners,
  onResetVendors,
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
  // Folded vendor code -> the code as fonts embed it, for the tooltip.
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
        // 700+ designers: virtualize the pill list so searching doesn't flood
        // the DOM with hundreds of buttons.
        virtualize
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
