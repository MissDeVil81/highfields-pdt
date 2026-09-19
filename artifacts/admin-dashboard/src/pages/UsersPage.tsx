import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListUsers,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/components/AdminProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  director: "Director",
  admin: "Admin",
  ld: "L&D",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  employee: "secondary",
  manager: "default",
  director: "outline",
  admin: "destructive",
  ld: "secondary",
};

function primaryRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("director")) return "director";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("ld")) return "ld";
  return roles[0] ?? "employee";
}

export default function UsersPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { adminUserId } = useAdmin();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [recruitmentTypeFilter, setRecruitmentTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: users, isLoading } = useListUsers();
  const deleteUser = useDeleteUser({ request: { headers: { 'x-requesting-user-id': String(adminUserId) } } });

  const filtered = (users ?? []).filter((u) => {
    const role = primaryRole(u.roles);
    const matchesRole = roleFilter === "all" || role === roleFilter;
    const matchesRecruitmentType =
      recruitmentTypeFilter === "all" ||
      (recruitmentTypeFilter === "unset"
        ? !u.recruitmentType
        : u.recruitmentType === recruitmentTypeFilter);
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? u.isActive === "active" : u.isActive !== "active");
    const email = u.email ?? "";
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.jobTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.recruitmentType ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesRecruitmentType && matchesSearch && matchesStatus;
  });

  function handleDelete() {
    if (deleteId === null) return;
    deleteUser.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "User deleted" });
          setDeleteId(null);
        },
        onError: () => {
          toast({ title: "Failed to delete user", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  }

  const userToDelete = (users ?? []).find((u) => u.id === deleteId);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page title + action */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage employee accounts and access
          </p>
        </div>
        <Button onClick={() => navigate("/users/new")} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          New User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          type="search"
          placeholder="Search by name, job title, department or recruitment type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="director">Director</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="ld">L&amp;D</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={recruitmentTypeFilter} onValueChange={setRecruitmentTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All recruitment types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All recruitment types</SelectItem>
            <SelectItem value="perm">Perm</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="unset">Not set</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-sm">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Recruitment</TableHead>
              <TableHead className="font-semibold">Reports To</TableHead>
              <TableHead className="font-semibold">Team(s)</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-24 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-16 text-muted-foreground"
                >
                  {search || roleFilter !== "all" || recruitmentTypeFilter !== "all" || statusFilter !== "all"
                    ? "No users match your filters."
                    : "No users yet. Click 'New User' to create one."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const role = primaryRole(user.roles);
                const isActive = user.isActive === "active";
                const manager = (users ?? []).find(u => u.id === user.managerId);
                const reportsTo = manager ? manager.name : "—";
                
                const teams = user.teamNames || [];
                const teamsDisplay = teams.length > 2 
                  ? `${teams.slice(0, 2).join(", ")} +${teams.length - 2}` 
                  : teams.join(", ") || "—";

                return (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[role] ?? "secondary"} className="uppercase text-[10px] px-1.5 h-5">
                        {ROLE_LABELS[role] ?? role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.department ?? "—"}
                    </TableCell>
                    <TableCell>
                      {user.recruitmentType ? (
                        <Badge variant="outline" className="capitalize">
                          {user.recruitmentType}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {reportsTo}
                    </TableCell>
                    <TableCell className="text-sm">
                      {teamsDisplay}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                          isActive
                            ? "text-emerald-600 dark:text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/users/${user.id}/edit`)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(user.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4 text-center sm:text-left">
          Showing {filtered.length} of {(users ?? []).length} users
        </p>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong className="text-foreground">{userToDelete?.name}</strong> (
              {userToDelete?.email ?? userToDelete?.name}). All their
              assessments and evidence will also be removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
