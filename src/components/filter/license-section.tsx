import { ScrollIcon } from "@phosphor-icons/react";
import { LICENSE_LABELS } from "@/lib/fonts/filter";
import { PillButton } from "./pill-button";
import { SectionHeader } from "./section-header";

// License filter: OFL / Apache 2.0 / UFL, two per row. Multi-select with OR
// semantics — a family's single license matches when it's one of the selected
// ids. Families with a null license carry no pill and never match.
export function LicenseSection({
    items,
    selected,
    onToggle,
    onReset,
}: {
    // [licenseId, count], e.g. ["OFL", 1973]. Fixed order.
    items: [string, number][];
    selected: string[];
    onToggle: (v: string) => void;
    onReset: () => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            <SectionHeader
                title="License"
                icon={ScrollIcon}
                hasSelection={selected.length > 0}
                onReset={onReset}
                canSort={false}
                sort="count"
                onToggleSort={() => { }}
            />
            <div className="grid grid-cols-2 gap-1.5">
                {items.map(([value, count]) => (
                    <PillButton
                        key={value}
                        value={value}
                        count={count}
                        label={LICENSE_LABELS[value] ?? value}
                        selected={selected.includes(value)}
                        onToggle={onToggle}
                        className="min-w-0"
                    />
                ))}
            </div>
        </div>
    );
}
