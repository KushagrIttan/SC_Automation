import { BUILD_VERSION } from "@/lib/build"

export function BuildBadge() {
  return (
    <span className="pointer-events-none fixed bottom-2 right-3 z-50 font-mono text-[10px] text-muted-foreground/50 select-none">
      {BUILD_VERSION}
    </span>
  )
}
