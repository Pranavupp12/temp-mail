import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export function HistoryTableSkeleton() {
  // Render 5 skeleton rows
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {/* Email Column */}
          <TableCell>
            <Skeleton className="h-4 w-32 md:w-64" />
          </TableCell>
          
          {/* Status Column */}
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          
          {/* Date Column */}
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          
          {/* Action Column (Right Aligned) */}
          <TableCell className="text-right">
            <Skeleton className="h-8 w-24 ml-auto" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}