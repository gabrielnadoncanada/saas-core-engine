'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { logout } from '@/shared/api/auth'
import { ConfirmDialog } from '@/shared/components/dialogs/confirm-dialog'
import { routes } from '@/shared/constants/routes'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await logout()
    } finally {
      setIsLoading(false)
      onOpenChange(false)
      // Preserve current location for redirect after sign-in.
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      router.push(
        `${routes.auth.login}?redirect=${encodeURIComponent(currentPath)}`
      )
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access your account.'
      confirmText='Sign out'
      destructive
      handleConfirm={() => {
        void handleSignOut()
      }}
      isLoading={isLoading}
      className='sm:max-w-sm'
    />
  )
}
