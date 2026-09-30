import { useGetHierarchy, OrgNode } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleBadges } from "@/components/RoleBadges";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRightIcon, ChevronDownIcon, NetworkIcon } from "lucide-react";

export default function HierarchyPage() {
  const { data: hierarchy, isLoading } = useGetHierarchy();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Org Hierarchy</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <NetworkIcon className="h-4 w-4" />
            Visualise the reporting structure of your organisation
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 min-h-[600px] overflow-x-auto shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-16 w-96 ml-12" />
            <Skeleton className="h-16 w-80 ml-12" />
            <Skeleton className="h-16 w-64 ml-24" />
          </div>
        ) : !hierarchy ? (
          <div className="text-center py-20 text-muted-foreground">No hierarchy data available.</div>
        ) : (
          <div className="min-w-fit space-y-2">
            {(hierarchy as OrgNode[]).map(root => (
              <OrgTreeNode key={root.id} node={root} defaultExpanded={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgTreeNode({ node, level = 0, defaultExpanded = false }: { node: OrgNode, level?: number, defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || level < 2);
  const [, navigate] = useLocation();
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div className="relative">
      <div className={`flex items-start gap-3 py-2 ${level > 0 ? 'ml-8' : ''}`}>
        
        {/* Connection elbow for children */}
        {level > 0 && (
          <div className="absolute left-[-16px] top-7 w-6 h-px bg-border -translate-y-1/2" />
        )}

        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="mt-2 h-6 w-6 shrink-0 flex items-center justify-center rounded-md bg-muted hover:bg-accent text-muted-foreground border shadow-sm transition-colors z-10"
          >
            {expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}
        
        <Card 
          className={`flex-1 p-3 sm:px-4 sm:py-3 min-w-[280px] max-w-[400px] flex flex-col justify-center gap-1.5 hover:border-primary/50 transition-colors cursor-pointer shadow-sm ${level === 0 ? 'border-primary/30 bg-primary/5' : ''}`} 
          onClick={() => navigate(`/users/${node.id}/edit`)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground truncate">{node.name}</span>
            <RoleBadges roles={node.roles} context="hierarchy" />
          </div>
          
          <p className="text-xs text-muted-foreground truncate">
            {node.jobTitle || 'No Title'} • {node.department || 'No Dept'}
          </p>
          
          {node.teamNames && node.teamNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {node.teamNames.map(t => <Badge key={t} variant="outline" className="text-[9px] h-4 px-1.5 bg-background">{t}</Badge>)}
            </div>
          )}
        </Card>
      </div>

      {/* Children tree line */}
      {expanded && hasChildren && (
        <div className="relative before:absolute before:-left-4 before:top-4 before:-bottom-4 before:w-px before:bg-border/60">
          {node.children.map(child => (
            <OrgTreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
