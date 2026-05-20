import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";
import { Card } from "./Card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-mutedForeground">
        <FileSearch className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-secondary">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-mutedForeground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
