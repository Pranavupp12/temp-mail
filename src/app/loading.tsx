// src/app/loading.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HistoryTableSkeleton } from "@/components/skeletons/history-table-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Generator Column Skeleton */}
          <div className="space-y-6">
            <Card className="h-full border-t-4 border-t-slate-200 shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="bg-slate-50 h-32 rounded-xl border border-dashed border-slate-300 flex items-center justify-center">
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inbox Column Skeleton */}
          <div className="space-y-6">
            <Card className="h-full border-t-4 border-t-slate-200 shadow-md min-h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* History Table Skeleton */}
        <Card className="mt-8 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <HistoryTableSkeleton />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}