'use client'

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import { type AlertBlock as AlertBlockType } from '@/lib/types'

interface AlertBlockProps {
  block: AlertBlockType
}

export function AlertBlock({ block }: AlertBlockProps) {
  const { severity, message, details } = block.data

  const iconMap = {
    info: Info,
    warning: AlertCircle,
    error: XCircle,
    success: CheckCircle,
  }

  const Icon = iconMap[severity]

  const severityStyles = {
    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
    success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  }

  return (
    <Alert className={`my-4 ${severityStyles[severity]}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="font-semibold">{block.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        {details && (
          <p className="mt-2 text-sm opacity-90">{details}</p>
        )}
      </AlertDescription>
    </Alert>
  )
}