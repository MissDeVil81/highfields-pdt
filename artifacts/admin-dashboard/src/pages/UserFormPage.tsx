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
  useListTeams,
  useGetUserPermissions,
  useSetUserPermissions,
  useGetUserAccessSummary,
  getListUsersQueryKey,
  getGetUserQueryKey,
  getGetUserPermissionsQueryKey,
  getGetUserAccessSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/components/AdminProvider";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftIcon } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  role: z.enum(["employee", "manager", "director", "admin", "ld"]),
  department: z.string().optional(),
  managerId: z.number().optional(),
  isActive: z.boolean(),
  teamIds: z.array(z.number()).default([]),
  additionalViewUsers: z.array(z.number()).default([]),
  additionalEditUsers: z.array(z.number()).default([]),
  additionalViewTeams: z.array(z.number()).default([]),
  additionalEditTeams: z.array(z.number()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

function primaryRole(roles: string[]): "employee" | "manager" | "director" | "admin" | "ld" {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("director")) return "director";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("ld")) return "ld";
  return "employee";
}

export default function UserFormPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const id = params.id ? parseInt(params.id) : undefined;
  const isEdit = id !== undefined;
  
  const { adminUserId } = useAdmin();
  const reqOpts = { request: { headers: { 'x-requesting-user-id': String(adminUserId) } } };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useGetUser(id!, {
    query: {
      enabled: isEdit,
      queryKey: getGetUserQueryKey(id!),
    },
  });

  const { data: permissions, isLoading: permissionsLoading } = useGetUserPermissions(id!, {
    query: { enabled: isEdit, queryKey: getGetUserPermissionsQueryKey(id!) }
  });
  
  const { data: accessSummary } = useGetUserAccessSummary(id!, {
    query: { enabled: isEdit, queryKey: getGetUserAccessSummaryQueryKey(id!) }
  });

  const { data: allUsers } = useListUsers();
  const { data: allTeams } = useListTeams();

  const userOptions = (allUsers ?? [])
    .filter(u => u.isActive === "active" && u.id !== id)
    .map(u => ({ value: u.id, label: u.name }));
    
  const teamOptions = (allTeams ?? []).map(t => ({ value: t.id, label: t.name }));

  const createUser = useCreateUser(reqOpts);
  const updateUser = useUpdateUser(reqOpts);
  const setPermissions = useSetUserPermissions(reqOpts);

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
      teamIds: [],
      additionalViewUsers: [],
      additionalEditUsers: [],
      additionalViewTeams: [],
      additionalEditTeams: [],
    },
  });

  useEffect(() => {
    if (user && (!isEdit || permissions)) {
      const viewUsers = permissions?.userPermissions.filter(p => p.permissionType === "view").map(p => p.targetUserId) || [];
      const editUsers = permissions?.userPermissions.filter(p => p.permissionType === "edit").map(p => p.targetUserId) || [];
      const viewTeams = permissions?.teamPermissions.filter(p => p.permissionType === "view").map(p => p.teamId) || [];
      const editTeams = permissions?.teamPermissions.filter(p => p.permissionType === "edit").map(p => p.teamId) || [];
      
      reset({
        name: user.name,
        email: user.email ?? "",
        role: primaryRole(user.roles),
        department: user.department ?? "",
        managerId: user.managerId ?? undefined,
        isActive: user.isActive === "active",
        teamIds: user.teamIds || [],
        additionalViewUsers: viewUsers,
        additionalEditUsers: editUsers,
        additionalViewTeams: viewTeams,
        additionalEditTeams: editTeams,
      });
    }
  }, [user, permissions, isEdit, reset]);

  const roleValue = watch("role");
  const isActiveValue = watch("isActive");
  const managerIdValue = watch("managerId");
  const teamIdsValue = watch("teamIds");
  const addViewUsers = watch("additionalViewUsers");
  const addEditUsers = watch("additionalEditUsers");
  const addViewTeams = watch("additionalViewTeams");
  const addEditTeams = watch("additionalEditTeams");

  async function onSubmit(values: FormValues) {
    const roles = [values.role];
    const email = values.email || undefined;
    const department = values.department || undefined;

    try {
      if (isEdit) {
        await Promise.all([
          updateUser.mutateAsync({
            id: id!,
            data: {
              name: values.name,
              email,
              roles,
              department,
              managerId: values.managerId ?? null,
              isActive: values.isActive ? "active" : "inactive",
              teamIds: values.teamIds,
            },
          }),
          setPermissions.mutateAsync({
            id: id!,
            data: {
              additionalViewUsers: values.additionalViewUsers,
              additionalEditUsers: values.additionalEditUsers,
              additionalViewTeams: values.additionalViewTeams,
              additionalEditTeams: values.additionalEditTeams,
            }
          })
        ]);
        
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id!) });
        toast({ title: "User updated successfully" });
        navigate("/");
      } else {
        await createUser.mutateAsync({
          data: {
            name: values.name,
            email,
            roles,
            department,
            managerId: values.managerId,
            isActive: values.isActive ? "active" : "inactive",
            teamIds: values.teamIds,
          },
        });
        
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User created successfully" });
        navigate("/");
      }
    } catch (err) {
      toast({ title: "Operation failed", variant: "destructive" });
    }
  }

  const isLoading = isEdit && (userLoading || permissionsLoading);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-6 gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => navigate("/")}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to users
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-16">
          <Card className="shadow-sm border-border">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-xl">{isEdit ? "Edit User" : "Create New User"}</CardTitle>
              <CardDescription>
                {isEdit
                  ? "Update this user's details, role and team membership."
                  : "Add a new employee, manager, director, admin or L&D user."}
              </CardDescription>
            </CardHeader>

            <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Smith" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="jane.smith@highfield.co.uk" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleValue} onValueChange={(v: any) => setValue("role", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="ld">L&amp;D</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" placeholder="e.g. Perm Recruitment" {...register("department")} />
              </div>

              {/* Reports To */}
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Combobox 
                  options={userOptions} 
                  value={managerIdValue} 
                  onChange={v => setValue("managerId", v)} 
                  placeholder="Select manager..." 
                />
              </div>

              {/* Teams */}
              <div className="space-y-2 md:col-span-2 mt-2">
                <Label>Team Membership</Label>
                <MultiSelect 
                  options={teamOptions} 
                  selected={teamIdsValue} 
                  onChange={v => setValue("teamIds", v)} 
                  placeholder="Assign to teams..." 
                />
              </div>

              {/* Active toggle */}
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 mt-4">
                <div>
                  <p className="text-sm font-medium">Active account</p>
                  <p className="text-xs text-muted-foreground">Inactive users cannot log in.</p>
                </div>
                <Switch checked={isActiveValue} onCheckedChange={(v) => setValue("isActive", v)} />
              </div>
            </CardContent>
          </Card>

          {isEdit && (
            <Card className="shadow-sm border-border">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">Additional Permissions</CardTitle>
                <CardDescription>Grant access to view or edit other users outside this user's direct reporting line.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-8 pt-6">
                
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Additional View Access
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-blue-500/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Specific Users</Label>
                      <MultiSelect options={userOptions} selected={addViewUsers} onChange={v => setValue("additionalViewUsers", v)} placeholder="Add view access to users..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entire Teams</Label>
                      <MultiSelect options={teamOptions} selected={addViewTeams} onChange={v => setValue("additionalViewTeams", v)} placeholder="Add view access to teams..." />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    Additional Full Edit Access
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-destructive/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Specific Users</Label>
                      <MultiSelect options={userOptions} selected={addEditUsers} onChange={v => setValue("additionalEditUsers", v)} placeholder="Add edit access to users..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Entire Teams</Label>
                      <MultiSelect options={teamOptions} selected={addEditTeams} onChange={v => setValue("additionalEditTeams", v)} placeholder="Add edit access to teams..." />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/")} className="w-32">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || createUser.isPending || updateUser.isPending} className="w-48 shadow-sm">
              {isEdit ? "Save all changes" : "Create user"}
            </Button>
          </div>
        </form>
      )}

      {isEdit && accessSummary && !isLoading && (
        <Card className="mt-12 border-primary/20 shadow-md bg-gradient-to-br from-background to-primary/5">
          <CardHeader>
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Computed Access Summary
            </CardTitle>
            <CardDescription>A combined view of all users this person can access via direct reports and additional permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border p-4 rounded-xl text-center shadow-sm">
                <p className="text-3xl font-bold">{accessSummary.directReports}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Direct</p>
              </div>
              <div className="bg-card border p-4 rounded-xl text-center shadow-sm">
                <p className="text-3xl font-bold">{accessSummary.indirectReports}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Indirect</p>
              </div>
              <div className="bg-card border p-4 rounded-xl text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{accessSummary.additionalUsers}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Additional</p>
              </div>
              <div className="bg-card border p-4 rounded-xl text-center shadow-sm">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{accessSummary.additionalTeams.length}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">Via Teams</p>
              </div>
            </div>
            
            <div className="flex justify-around items-center bg-background p-4 rounded-xl border mb-6 shadow-sm divide-x">
              <div className="text-center px-4">
                <p className="text-sm text-muted-foreground mb-1">Total Viewable Users</p>
                <p className="text-2xl font-bold text-foreground">{accessSummary.totalCanView}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-sm text-muted-foreground mb-1">Total Editable Users</p>
                <p className="text-2xl font-bold text-foreground">{accessSummary.totalCanEdit}</p>
              </div>
            </div>
            
            <h4 className="font-semibold text-sm mb-3 px-1">Detailed Breakdown</h4>
            <div className="border rounded-md bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Target User</TableHead>
                    <TableHead>Reason for Access</TableHead>
                    <TableHead className="w-24">Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessSummary.breakdown.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No access to any other users.</TableCell></TableRow>
                  ) : (
                    accessSummary.breakdown.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.relationship}</TableCell>
                        <TableCell>
                          <Badge variant={item.accessType === 'edit' ? 'default' : 'secondary'} className="uppercase text-[10px] h-5">
                            {item.accessType}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
