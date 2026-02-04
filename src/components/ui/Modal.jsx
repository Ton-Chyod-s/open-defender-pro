import { Button } from './Button';
import './Modal.css';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  icon,
  children, 
  footer,
  variant = 'info',
  size = 'medium'
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal modal--${variant} modal--${size}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          {icon && <span className="modal__icon">{icon}</span>}
          <h3 className="modal__title">{title}</h3>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
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
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning'
}) {
  const icons = {
    warning: '⚠️',
    danger: '🚨',
    info: 'ℹ️',
    success: '✅'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icons[variant]}
      variant={variant}
      footer={
        <div className="modal__actions">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={async () => { await onConfirm?.(); onClose(); }}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function AlertModal({ isOpen, onClose, title, message, type = 'info' }) {
  const icons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icons[type]}
      variant={type}
      footer={
        <div className="modal__actions">
          <Button variant="primary" onClick={onClose}>OK</Button>
        </div>
      }
    >
      <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
    </Modal>
  );
}

export default Modal;
