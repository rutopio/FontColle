import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export interface SpecRow {
  label: string;
  value: string;
  badge?: string; // version tag, rendered as "v{badge}"
}

// The Specs list as a shadcn table: label left, value (with an optional version
// badge) right-aligned. Borderless rows keep the compact spec look.
export function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <Table>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="px-0 py-1.5 text-sm">{row.label}</TableCell>
            <TableCell className="px-0 py-1.5 text-right">
              <span className="flex items-center justify-end gap-2">
                {row.badge && (
                  <Badge variant="secondary" className="font-mono">
                    v{row.badge}
                  </Badge>
                )}
                <span className="font-mono text-sm">{row.value}</span>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
