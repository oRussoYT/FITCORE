import { Skeleton } from "@/components/ui/Feedback";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10" aria-busy="true" aria-label="Carregando painel">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[188px] rounded-[18px]" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 rounded-[18px]" />
            <Skeleton className="h-56 rounded-[18px]" />
          </div>
        </div>
        <Skeleton className="h-[640px] rounded-[18px]" />
      </div>
    </div>
  );
}
