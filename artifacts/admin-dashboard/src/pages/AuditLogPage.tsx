import { useListAuditLog } from "@workspace/api-client-react";
import { useAdmin } from "@/components/AdminProvider";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS: Record<string, string> = {
  "user_created": "User created",
  "user_role_changed": "Role changed",
  "reporting_manager_changed": "Manager changed",
  "team_membership_added": "Added to team",
  "team_membership_removed": "Removed from team",
  "additional_permissions_changed": "Permissions updated",
  "user_activated": "User activated",
  "user_deactivated": "User deactivated",
  "team_created": "Team created",
  "team_archived": "Team archived",
  "team_updated": "Team updated",
};

export default function AuditLogPage() {
  const { adminUserId } = useAdmin();
  const { data: logs, isLoading } = useListAuditLog({ requestingUserId: adminUserId || undefined });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Review recent administrative actions performed by your account
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[180px]">Date / Time</TableHead>
              <TableHead>Affected User/Team</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                </TableRow>
              ))
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No changes recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              logs?.map(log => {
                const actionLabel = ACTION_LABELS[log.action] || log.action;
                return (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.affectedUserName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-background">
                        {actionLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.previousValue || log.newValue ? (
                        <div className="flex items-center gap-2">
                          {log.previousValue && <span className="text-muted-foreground line-through opacity-70 truncate max-w-[120px]" title={log.previousValue}>{log.previousValue}</span>}
                          {log.previousValue && log.newValue && <span className="text-muted-foreground">→</span>}
                          {log.newValue && <span className="font-medium text-foreground truncate max-w-[150px]" title={log.newValue}>{log.newValue}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No value data</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
