import { useLocation } from "wouter";
import { useLdStore } from "@/hooks/useLdStore";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { BookMarked } from "lucide-react";

export default function CompanyTraining() {
  const [, navigate] = useLocation();
  const { ldUser } = useLdStore();

  useEffect(() => {
    if (!ldUser) navigate("/");
  }, [ldUser, navigate]);

  if (!ldUser) return null;

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Company Training</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Organisation-wide training programmes and resources.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-24 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookMarked className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Content coming soon</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            This section is being prepared. Check back shortly.
          </p>
        </div>
      </div>
    </Layout>
  );
}
