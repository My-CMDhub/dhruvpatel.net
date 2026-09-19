import type { MDXComponents } from 'mdx/types'
import { L, Src, ext } from '@/components/Label'
import { Media } from '@/components/Media'
import { CaseHead } from '@/components/Case'
import { Ledger } from '@/components/Scene'
import { InvoiceDemo } from '@/components/InvoiceDemo'
import { ApprovalDemo } from '@/components/ApprovalDemo'
import { SilverpondFlow } from '@/components/SilverpondFlow'

// Available in every .mdx page without an import.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { a: (p: React.ComponentProps<'a'>) => <a {...p} {...ext(p.href)} />, L, Src, Media, CaseHead, Ledger, InvoiceDemo, ApprovalDemo, SilverpondFlow, ...components }
}
