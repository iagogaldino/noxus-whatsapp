import { IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImagePreviewProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt, isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="wa-image-preview"
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizar imagem: ${alt}`}
      onClick={onClose}
    >
      <button
        type="button"
        className="wa-image-preview__close"
        onClick={onClose}
        aria-label="Fechar imagem"
      >
        <IonIcon icon={closeOutline} />
      </button>
      <img
        src={src}
        alt={alt}
        className="wa-image-preview__img"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
};

export default ImagePreview;
