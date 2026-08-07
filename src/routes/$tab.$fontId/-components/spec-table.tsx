import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export interface SpecRow {
  label: string;
  value: string;
  badge?: string;
}

export function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    // -mx-3 cancels cell padding so hover highlight extends past text.
    <Table className="-mx-3 w-[calc(100%+1.5rem)]">
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.label} index={i}>
            <TableCell className="py-1.5 text-sm">{row.label}</TableCell>
            <TableCell className="py-1.5 text-right">
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
