"use client"

import { useRef, useState } from "react"
import { Eraser, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SignaturePad({
  value,
  onChange,
}: {
  value: string | null
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = pos(e)
    ctx.strokeStyle = "#111827"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawingRef.current = true
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext("2d")!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
  }

  function end() {
    drawingRef.current = false
    if (hasInk) emit()
  }

  function clear() {
    const canvas = canvasRef.current!
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  function emit() {
    onChange(canvasRef.current?.toDataURL("image/png") ?? null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative rounded-sm border border-border bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={150}
          className="h-[120px] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={() => {
            if (drawingRef.current) end()
          }}
        />
        {!hasInk && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
            <PenLine className="size-3.5" />
            Draw your signature here (mouse or touch)
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasInk}>
          <Eraser data-icon="inline-start" />
          Clear
        </Button>
        <span className={`font-mono text-[10px] ${value ? "text-accent" : "text-muted-foreground"}`}>
          {value ? "signature captured" : "required before signup"}
        </span>
      </div>
    </div>
  )
}
