import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { searchParishes } from "@/features/parish/parishApi";
import type { Parish } from "@/types";

interface ParishSearchStepProps {
  onSelect: (parish: Parish) => void;
}

export function ParishSearchStep({ onSelect }: ParishSearchStepProps) {
  const [query, setQuery] = useState("");
  const results = searchParishes(query);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Find your parish</h1>
        <p className="text-sm text-ink-muted">Search by name or location to continue.</p>
      </div>

      <Input
        placeholder="Search parishes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="flex flex-col gap-2">
        {results.map((parish) => (
          <Card
            key={parish.id}
            className="cursor-pointer hover:border-primary hover:bg-primary/20"
            onClick={() => onSelect(parish)}
          >
            <p className="font-medium text-ink">{parish.name}</p>
            <p className="text-sm text-ink-muted">{parish.address}</p>
          </Card>
        ))}
        {results.length === 0 && (
          <p className="text-sm text-ink-muted">No parishes match your search.</p>
        )}
      </div>
    </div>
  );
}