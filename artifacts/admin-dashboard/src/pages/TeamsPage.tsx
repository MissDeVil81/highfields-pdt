import { useState } from "react";
import { 
  useListTeams, 
  useCreateTeam, 
  useUpdateTeam, 
  getListTeamsQueryKey,
  useListTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  getListTeamMembersQueryKey,
  useListUsers,
  getListUsersQueryKey,
  Team
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/components/AdminProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TrashIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { format } from "date-fns";

export default function TeamsPage() {
  const { data: teams, isLoading } = useListTeams({ includeArchived: true });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage organisational groups and memberships</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <PlusIcon className="h-4 w-4" />
          New Team
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : teams?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No teams found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams?.map(team => (
                <TeamRow key={team.id} team={team} onViewMembers={() => setSelectedTeam(team)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTeamDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {selectedTeam && (
        <TeamMembersDialog team={selectedTeam} open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)} />
      )}
    </div>
  );
}

function TeamRow({ team, onViewMembers }: { team: Team, onViewMembers: () => void }) {
  const { adminUserId } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateTeam = useUpdateTeam({ request: { headers: { 'x-requesting-user-id': String(adminUserId) } } });

  const isArchived = team.status === 'archived';

  const toggleStatus = () => {
    updateTeam.mutate({
      id: team.id,
      data: { status: isArchived ? 'active' : 'archived' }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey({ includeArchived: true }) });
        toast({ title: `Team ${isArchived ? 'activated' : 'archived'}` });
      }
    });
  };

  return (
    <TableRow className={`hover:bg-muted/30 transition-colors ${isArchived ? 'opacity-60' : ''}`}>
      <TableCell className="font-medium">
        <span className={isArchived ? 'line-through text-muted-foreground' : ''}>{team.name}</span>
      </TableCell>
      <TableCell>
        <Badge variant={isArchived ? 'secondary' : 'default'} className="uppercase text-[10px] px-1.5 h-5">
          {team.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(team.createdAt), 'MMM d, yyyy')}
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="outline" size="sm" onClick={onViewMembers}>
          <UsersIcon className="h-4 w-4 mr-2" />
          Members
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleStatus} disabled={updateTeam.isPending}>
          {isArchived ? 'Restore' : 'Archive'}
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CreateTeamDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const { adminUserId } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createTeam = useCreateTeam({ request: { headers: { 'x-requesting-user-id': String(adminUserId) } } });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTeam.mutate({ data: { name: name.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey({ includeArchived: true }) });
        toast({ title: "Team created" });
        setName("");
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to create team", variant: "destructive" })
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>Add a new team to group employees together.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || createTeam.isPending}>Create Team</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamMembersDialog({ team, open, onOpenChange }: { team: Team, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { adminUserId } = useAdmin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: members, isLoading } = useListTeamMembers(team.id, { query: { enabled: open, queryKey: getListTeamMembersQueryKey(team.id) } });
  const { data: users } = useListUsers(undefined, { query: { enabled: open, queryKey: getListUsersQueryKey() } });
  
  const reqOpts = { request: { headers: { 'x-requesting-user-id': String(adminUserId) } } };
  const addMember = useAddTeamMember(reqOpts);
  const removeMember = useRemoveTeamMember(reqOpts);

  const [addUserId, setAddUserId] = useState<number | undefined>();

  const activeUsers = (users || []).filter(u => u.isActive === 'active');
  const userOptions = activeUsers
    .filter(u => !(members || []).some(m => m.id === u.id))
    .map(u => ({ value: u.id, label: u.name }));

  const handleAdd = () => {
    if (!addUserId) return;
    addMember.mutate({ id: team.id, data: { userId: addUserId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey(team.id) });
        setAddUserId(undefined);
        toast({ title: "Member added" });
      }
    });
  };

  const handleRemove = (userId: number, name: string) => {
    removeMember.mutate({ id: team.id, userId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTeamMembersQueryKey(team.id) });
        toast({ title: `${name} removed` });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Members of {team.name}</DialogTitle>
          <DialogDescription>Manage users assigned to this team.</DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 items-end pt-4 pb-2 border-b">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">Add Member</label>
            <Combobox options={userOptions} value={addUserId} onChange={setAddUserId} placeholder="Select user to add..." />
          </div>
          <Button onClick={handleAdd} disabled={!addUserId || addMember.isPending}>
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ) : members?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No members in this team.</TableCell></TableRow>
              ) : (
                members?.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.roles[0] || 'employee'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(member.id, member.name)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
