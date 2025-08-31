import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CountdownTimerProps {
  targetDate: Date | null;
  onExpired?: () => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  onExpired,
  className = ""
}) => {
  const { t } = useLanguage();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setIsExpired(true);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (!isExpired) {
          setIsExpired(true);
          onExpired?.();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, isExpired, onExpired]);

  if (!targetDate || isExpired) {
    return (
      <div className={`flex items-center justify-center space-x-2 text-red-600 ${className}`}>
        <Clock className="h-5 w-5" />
        <span className="font-semibold">{t('common.drawingOverdue')}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-lg md:text-xl font-semibold mb-2 text-white">
        {t('common.untilNextDrawing')}
      </div>
      <div className="text-2xl md:text-3xl font-bold text-white">
        {timeRemaining.days > 0 && (
          <>
            {timeRemaining.days.toString().padStart(2, '0')}d{" "}
          </>
        )}
        {timeRemaining.hours.toString().padStart(2, '0')}:
        {timeRemaining.minutes.toString().padStart(2, '0')}:
        {timeRemaining.seconds.toString().padStart(2, '0')}
      </div>
    </div>
  );
};

export default CountdownTimer;
