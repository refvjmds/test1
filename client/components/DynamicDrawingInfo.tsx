import React from 'react';
import { useDynamicTranslations } from '@/hooks/use-dynamic-translations';

interface DynamicDrawingInfoProps {
  children: (props: {
    step4Description: string;
    whenDescription: string;
    deadlineDescription: string;
    loading: boolean;
  }) => React.ReactNode;
}

export const DynamicDrawingInfo: React.FC<DynamicDrawingInfoProps> = ({ children }) => {
  const { translations, loading } = useDynamicTranslations([
    { key: 'help.gameplay.playSteps.step4.description' },
    { key: 'help.gameplay.drawings.when.description' },
    { key: 'help.gameplay.drawings.deadline.description' },
  ]);

  return (
    <>
      {children({
        step4Description: translations['help.gameplay.playSteps.step4.description'] || '',
        whenDescription: translations['help.gameplay.drawings.when.description'] || '',
        deadlineDescription: translations['help.gameplay.drawings.deadline.description'] || '',
        loading,
      })}
    </>
  );
};
