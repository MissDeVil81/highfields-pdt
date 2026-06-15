import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetUser,
  useCreateUser,
  useUpdateUser,
  useListUsers,
  getListUsersQueryKey,
  getGetUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  role: z.enum(["employee", "manager", "admin"]),
  department: z.string().optional(),
  managerId: z.number().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function primaryRole(roles: string[]): "employee" | "manager" | "admin" {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  return "employee";
}

export default function UserFormPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const id = params.id ? parseInt(params.id) : undefined;
  const isEdit = id !== undefined;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useGetUser(id!, {
    query: {
      enabled: isEdit,
      queryKey: getGetUserQueryKey(id!),
    },
  });

  const { data: allUsers } = useListUsers();
  const managers = (allUsers ?? []).filter(
    (u) =>
      u.roles.includes("manager") ||
      u.roles.includes("admin")
  );

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "employee",
      department: "",
      managerId: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email ?? "",
        role: primaryRole(user.roles),
        department: user.department ?? "",
        managerId: user.managerId ?? undefined,
        isActive: user.isActive === "active",
      });
    }
  }, [user, reset]);

  const roleValue = watch("role");
  const isActiveValue = watch("isActive");
  const managerIdValue = watch("managerId");

  async function onSubmit(values: FormValues) {
    const roles = [values.role];
    const email = values.email || undefined;
    const department = values.department || undefined;

    if (isEdit) {
      updateUser.mutate(
        {
          id: id!,
          data: {
            name: values.name,
            email,
            roles,
            department,
            managerId: values.managerId ?? null,
            isActive: values.isActive ? "active" : "inactive",
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            queryClient.invalidateQueries({
              queryKey: getGetUserQueryKey(id!),
            });
            toast({ title: "User updated successfully" });
            navigate("/");
          },
          onError: () => {
            toast({ title: "Failed to update user", variant: "destructive" });
          },
        }
      );
    } else {
      createUser.mutate(
        {
          data: {
            name: values.name,
            email,
            roles,
            department,
            managerId: values.managerId,
            isActive: values.isActive ? "active" : "inactive",
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            toast({ title: "User created successfully" });
            navigate("/");
          },
          onError: () => {
            toast({ title: "Failed to create user", variant: "destructive" });
          },
        }
      );
    }
  }

  const isLoading = isEdit && userLoading;

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

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          className="mb-6 gap-2 -ml-2 text-muted-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to users
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "Edit User" : "Create New User"}</CardTitle>
            <CardDescription>
              {isEdit
                ? "Update this user's details and role."
                : "Add a new employee, manager or admin to the platform."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane.smith@highfield.co.uk"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must match the user's Microsoft SSO email.
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={roleValue}
                    onValueChange={(v) =>
                      setValue("role", v as "employee" | "manager" | "admin")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-xs text-destructive">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Perm Recruitment"
                    {...register("department")}
                  />
                </div>

                {/* Manager */}
                <div className="space-y-1.5">
                  <Label>Line Manager</Label>
                  <Select
                    value={managerIdValue?.toString() ?? "none"}
                    onValueChange={(v) =>
                      setValue(
                        "managerId",
                        v === "none" ? undefined : parseInt(v)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No manager assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager</SelectItem>
                      {managers
                        .filter((m) => m.id !== id)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Active account</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive users cannot log in or access the tracker.
                    </p>
                  </div>
                  <Switch
                    checked={isActiveValue}
                    onCheckedChange={(v) => setValue("isActive", v)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      isSubmitting ||
                      createUser.isPending ||
                      updateUser.isPending
                    }
                  >
                    {isEdit ? "Save changes" : "Create user"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
