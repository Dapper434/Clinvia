import { createContext, useContext } from 'react'

export const ShellContext = createContext(null)

/** toast(msg), openDrawer(kind, props), version (bumps after any saved change), menu state. */
export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used inside AppShell')
  return ctx
}
