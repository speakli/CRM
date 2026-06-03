import { useState } from 'react'
import type { FieldAudit } from '../lib/audit'

export function FieldAuditIcon({ audit }: { audit?: FieldAudit }) {
  const [show, setShow] = useState(false)
  if (!audit?.current) return null
  return (
    <span
      className="relative ml-1 inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help text-[10px] text-zinc-400 hover:text-zinc-700">ⓘ</span>
      {show && (
        <span className="absolute left-0 top-full z-30 mt-1 min-w-[220px] whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] normal-case tracking-normal text-zinc-700 shadow-lg">
          <span className="block">
            Edited by <strong>{audit.current.by}</strong> on {audit.current.at}
          </span>
          {audit.previous && (
            <span className="mt-0.5 block text-zinc-500">
              Before: {audit.previous.by} on {audit.previous.at}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
