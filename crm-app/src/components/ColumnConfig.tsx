import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type ColumnDefShort = { id: string; label: string }

function SortableRow({
  id,
  label,
  visible,
  onToggle,
}: {
  id: string
  label: string
  visible: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        aria-label="Drag handle"
      >
        ⋮⋮
      </span>
      <input
        type="checkbox"
        checked={visible}
        onChange={onToggle}
        className="cursor-pointer"
      />
      <span className="flex-1 text-sm text-zinc-800">{label}</span>
    </div>
  )
}

export function ColumnConfig({
  available,
  visible,
  order,
  onChange,
  onClose,
}: {
  available: ColumnDefShort[]
  visible: string[]
  order: string[]
  onChange: (newVisible: string[], newOrder: string[]) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [localOrder, setLocalOrder] = useState<string[]>(order)
  const [localVisible, setLocalVisible] = useState<Set<string>>(new Set(visible))
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClickAway)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickAway)
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  const labelById = new Map(available.map((c) => [c.id, c.label]))
  const ids = localOrder.filter((id) => labelById.has(id))
  for (const c of available) if (!ids.includes(c.id)) ids.push(c.id)

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(ids, oldIndex, newIndex)
    setLocalOrder(next)
    onChange(next.filter((id) => localVisible.has(id)), next)
  }

  const toggle = (id: string) => {
    const next = new Set(localVisible)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setLocalVisible(next)
    onChange(ids.filter((x) => next.has(x)), ids)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
          Colonnes
        </h3>
        <span className="text-xs text-zinc-400">{localVisible.size}/{available.length}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {ids.map((id) => (
              <SortableRow
                key={id}
                id={id}
                label={labelById.get(id) ?? id}
                visible={localVisible.has(id)}
                onToggle={() => toggle(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="mt-2 text-[10px] text-zinc-400">Drag to reorder · click to hide/show</p>
    </div>
  )
}
