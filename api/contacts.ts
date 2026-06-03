import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleEntity } from './_lib/entity'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleEntity('crm_contacts', 'contacts_headers', req, res)
}
