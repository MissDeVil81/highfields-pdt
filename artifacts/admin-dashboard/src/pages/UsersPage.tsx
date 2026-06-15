import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListUsers,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  employee: "secondary",
  manager: "default",
  admin: "destructive",
};

function primaryRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  return roles[0] ?? "employee";
}

export default function UsersPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: users, isLoading } = useListUsers();
  const deleteUser = useDeleteUser();

  const filtered = (users ?? []).filter((u) => {
    const role = primaryRole(u.roles);
    const matchesRole = roleFilter === "all" || role === roleFilter;
    const email = u.email ?? "";
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-sidebar-primary" />
          <span className="text-lg font-semibold tracking-tight">
            Highfield Admin
          </span>
        </div>
        <span className="text-sidebar-border mx-1">|</span>
        <span className="text-sm text-sidebar-foreground/70">
          User Management
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title + action */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and manage employee accounts
            </p>
          </div>
          <Button onClick={() => navigate("/users/new")} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            New User
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <Input
            type="search"
            placeholder="Search by name, email or department…"
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
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-24 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {search || roleFilter !== "all"
                      ? "No users match your filters."
                      : "No users yet. Click 'New User' to create one."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => {
                  const role = primaryRole(user.roles);
                  const isActive = user.isActive === "active";
                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANTS[role] ?? "secondary"}>
                          {ROLE_LABELS[role] ?? role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.department ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isActive
                              ? "text-green-700"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-green-500" : "bg-muted-foreground"
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
                            className="h-8 w-8"
                            onClick={() => navigate(`/users/${user.id}/edit`)}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(user.id)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
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
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filtered.length} of {(users ?? []).length} user
            {(users ?? []).length !== 1 ? "s" : ""}
          </p>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{userToDelete?.name}</strong> (
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
