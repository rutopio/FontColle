import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import type { FacetIndex } from "@/lib/fonts/data";
import type { FilterState } from "@/lib/fonts/filter";
import { cn } from "@/lib/utils";

// sidebar-09 shell for the list and detail pages: a two-level sidebar (icon
// rail + filters) on the left, page content in the inset on the right. The
// preview dock is mounted once in __root, so both pages share it.
export function FilterLayout({
    index,
    filter,
    onFilterChange,
    children,
}: {
    index: FacetIndex;
    filter: FilterState;
    onFilterChange: (next: FilterState) => void;
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider
            style={
                {
                    // Icon rail (3rem) + room for the filter panel at its original 20rem.
                    "--sidebar-width": "23rem",
                } as React.CSSProperties
            }
        >
            <AppSidebar
                index={index}
                filter={filter}
                onFilterChange={onFilterChange}
            />
            <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
    );
}

// Right side of both pages, matching sidebar-09: a full-width sticky header
// flush to the inset edge (SidebarTrigger + separator + the page's header
// content), then the page body constrained to max-w below it.
export function Column({
    header,
    headerClassName,
    children,
}: {
    header: React.ReactNode;
    headerClassName?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-border border-b bg-background px-4">
                <SidebarTrigger className="-ml-1" />

                <div className={cn("flex flex-1 items-center gap-3", headerClassName)}>
                    {header}
                </div>
            </header>
            <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-1 flex-col gap-6 p-6">
                {children}
            </div>
        </div>
    );
}
