'use client';

import React, { useState } from 'react';
import { Trash2, Edit3, Archive, Mail, Users, Check, AlertTriangle, X } from 'lucide-react';

export interface BulkAction {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'primary' | 'secondary' | 'danger' | 'warning';
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  disabled?: boolean;
  tooltip?: string;
}

export interface BulkActionsProps {
  selectedCount: number;
  totalCount?: number;
  actions: BulkAction[];
  onAction: (actionKey: string) => Promise<void> | void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  loading?: boolean;
  className?: string;
  position?: 'top' | 'bottom' | 'sticky';
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant: 'danger' | 'warning' | 'primary';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const iconClasses = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    primary: 'text-blue-600'
  };

  const buttonClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                {variant === 'danger' && <AlertTriangle className={`h-6 w-6 ${iconClasses[variant]}`} />}
                {variant === 'warning' && <AlertTriangle className={`h-6 w-6 ${iconClasses[variant]}`} />}
                {variant === 'primary' && <Check className={`h-6 w-6 ${iconClasses[variant]}`} />}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                buttonClasses[variant]
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulkActions({
  selectedCount,
  totalCount,
  actions,
  onAction,
  onSelectAll,
  onClearSelection,
  loading = false,
  className = '',
  position = 'top'
}: BulkActionsProps) {
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    action: BulkAction | null;
  }>({ isOpen: false, action: null });
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleActionClick = async (action: BulkAction) => {
    if (action.disabled) return;

    if (action.confirmationRequired) {
      setConfirmationModal({ isOpen: true, action });
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: BulkAction) => {
    try {
      setProcessingAction(action.key);
      await onAction(action.key);
    } catch (error) {
      console.error(`Bulk action ${action.key} failed:`, error);
    } finally {
      setProcessingAction(null);
      setConfirmationModal({ isOpen: false, action: null });
    }
  };

  const handleConfirmAction = async () => {
    if (confirmationModal.action) {
      await executeAction(confirmationModal.action);
    }
  };

  const getVariantClasses = (variant: string, disabled = false) => {
    if (disabled) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }

    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500';
    }
  };

  const positionClasses = {
    top: '',
    bottom: '',
    sticky: 'sticky top-0 z-40'
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${positionClasses[position]} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                {totalCount && ` (${selectedCount} of ${totalCount})`}
              </span>
            </div>

            {/* Quick selection actions */}
            <div className="flex items-center space-x-2 text-sm">
              {onSelectAll && totalCount && selectedCount < totalCount && (
                <button
                  onClick={onSelectAll}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  disabled={loading}
                >
                  Select all {totalCount}
                </button>
              )}
              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="text-gray-600 hover:text-gray-800 font-medium"
                  disabled={loading}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const isProcessing = processingAction === action.key;
              const isDisabled = action.disabled || loading || isProcessing;

              return (
                <button
                  key={action.key}
                  onClick={() => handleActionClick(action)}
                  disabled={isDisabled}
                  title={action.tooltip}
                  className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${getVariantClasses(
                    action.variant,
                    isDisabled
                  )}`}
                >
                  <Icon className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Processing...' : action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ isOpen: false, action: null })}
        onConfirm={handleConfirmAction}
        title={`Confirm ${confirmationModal.action?.label}`}
        message={
          confirmationModal.action?.confirmationMessage ||
          `Are you sure you want to ${confirmationModal.action?.label.toLowerCase()} ${selectedCount} item${
            selectedCount !== 1 ? 's' : ''
          }? This action cannot be undone.`
        }
        variant={confirmationModal.action?.variant === 'danger' ? 'danger' : 'primary'}
        loading={processingAction !== null}
      />
    </>
  );
}

// Predefined common bulk actions
export const commonBulkActions = {
  delete: {
    key: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'danger' as const,
    confirmationRequired: true,
    confirmationMessage: 'This action will permanently delete the selected items and cannot be undone.',
  },
  archive: {
    key: 'archive',
    label: 'Archive',
    icon: Archive,
    variant: 'secondary' as const,
    confirmationRequired: true,
  },
  edit: {
    key: 'edit',
    label: 'Edit',
    icon: Edit3,
    variant: 'primary' as const,
  },
  sendEmail: {
    key: 'sendEmail',
    label: 'Send Email',
    icon: Mail,
    variant: 'primary' as const,
    confirmationRequired: true,
  },
  assignUsers: {
    key: 'assignUsers',
    label: 'Assign Users',
    icon: Users,
    variant: 'secondary' as const,
  },
}; 