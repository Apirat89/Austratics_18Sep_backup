'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  destructive?: boolean;
}

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any>;
  fields: Array<{
    key: string;
    label: string;
    render?: (value: any) => React.ReactNode;
    className?: string;
  }>;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  overlayClassName = ''
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    full: 'sm:max-w-full sm:m-4'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className={`flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 ${overlayClassName}`}
        onClick={handleOverlayClick}
      >
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div
          ref={modalRef}
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-full ${className}`}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="bg-white px-4 pt-5 pb-4 sm:px-6 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {title && (
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {title}
                  </h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  destructive = false
}: ConfirmModalProps) {
  const typeConfig = {
    info: { icon: Info, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
    warning: { icon: AlertTriangle, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
    error: { icon: XCircle, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
    success: { icon: CheckCircle, bgColor: 'bg-green-100', iconColor: 'text-green-600' }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const confirmButtonClass = destructive || type === 'error'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
    >
      <div className="sm:flex sm:items-start">
        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${config.bgColor} sm:mx-0 sm:h-10 sm:w-10`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${confirmButtonClass} ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  disabled = false,
  size = 'md'
}: FormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const footer = (
    <>
      <button
        type="submit"
        form="modal-form"
        disabled={loading || disabled}
        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : submitText}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
      >
        {cancelText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={footer}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}

export function DetailModal({
  isOpen,
  onClose,
  title,
  data,
  fields,
  actions,
  size = 'lg'
}: DetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={actions}
    >
      <div className="space-y-4">
        {fields.map((field) => {
          const value = data[field.key];
          
          return (
            <div key={field.key} className={`flex flex-col sm:flex-row ${field.className || ''}`}>
              <dt className="text-sm font-medium text-gray-500 sm:w-1/3 sm:flex-shrink-0">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:ml-4 sm:w-2/3">
                {field.render ? field.render(value) : (
                  value != null ? String(value) : '-'
                )}
              </dd>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default Modal; 