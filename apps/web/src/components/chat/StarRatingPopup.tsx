import { useState } from 'react';
import { cn } from '../../lib/utils';

interface StarRatingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  language?: string | null;
}

// Translations for the popup
const translations: Record<string, {
  title: string;
  subtitle: string;
  commentPlaceholder: string;
  submit: string;
  skip: string;
  thanks: string;
}> = {
  es: {
    title: 'Ayudanos a mejorar',
    subtitle: 'Valora tu experiencia',
    commentPlaceholder: 'Comentarios adicionales (opcional)',
    submit: 'Enviar',
    skip: 'Saltar',
    thanks: 'Gracias por tu valoracion',
  },
  en: {
    title: 'Help us improve',
    subtitle: 'Rate your experience',
    commentPlaceholder: 'Additional comments (optional)',
    submit: 'Submit',
    skip: 'Skip',
    thanks: 'Thank you for your feedback',
  },
  pt: {
    title: 'Ajude-nos a melhorar',
    subtitle: 'Avalie sua experiencia',
    commentPlaceholder: 'Comentarios adicionais (opcional)',
    submit: 'Enviar',
    skip: 'Pular',
    thanks: 'Obrigado pela sua avaliacao',
  },
  fr: {
    title: 'Aidez-nous a ameliorer',
    subtitle: 'Evaluez votre experience',
    commentPlaceholder: 'Commentaires supplementaires (facultatif)',
    submit: 'Envoyer',
    skip: 'Passer',
    thanks: 'Merci pour votre avis',
  },
  de: {
    title: 'Helfen Sie uns zu verbessern',
    subtitle: 'Bewerten Sie Ihre Erfahrung',
    commentPlaceholder: 'Zusatzliche Kommentare (optional)',
    submit: 'Senden',
    skip: 'Uberspringen',
    thanks: 'Danke fur Ihr Feedback',
  },
  it: {
    title: 'Aiutaci a migliorare',
    subtitle: 'Valuta la tua esperienza',
    commentPlaceholder: 'Commenti aggiuntivi (opzionale)',
    submit: 'Invia',
    skip: 'Salta',
    thanks: 'Grazie per il tuo feedback',
  },
};

function StarIcon({ filled, hovered, onClick, onHover }: {
  filled: boolean;
  hovered: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      className="p-1 transition-transform hover:scale-110 focus:outline-none"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={cn(
          'w-10 h-10 transition-colors',
          filled || hovered
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-none text-gray-300 stroke-current stroke-2'
        )}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}

export function StarRatingPopup({ isOpen, onClose, onSubmit, language }: StarRatingPopupProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const t = translations[language || 'es'] || translations.es;

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {isSubmitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">{t.thanks}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-primary px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{t.title}</h3>
              <p className="text-sm text-white/80">{t.subtitle}</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Star rating */}
              <div className="flex justify-center gap-1 mb-6" onMouseLeave={() => setHoveredRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    filled={star <= rating}
                    hovered={star <= hoveredRating}
                    onClick={() => setRating(star)}
                    onHover={() => setHoveredRating(star)}
                  />
                ))}
              </div>

              {/* Comment textarea */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                rows={3}
                maxLength={500}
              />

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t.skip}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </span>
                  ) : (
                    t.submit
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
