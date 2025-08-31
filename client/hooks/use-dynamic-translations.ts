import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export const useDynamicTranslation = (key: string, params?: Record<string, string | number>) => {
  const { tDynamic, language } = useLanguage();
  const [translation, setTranslation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadTranslation = async () => {
      setLoading(true);
      try {
        const result = await tDynamic(key, params);
        if (isMounted) {
          setTranslation(result);
        }
      } catch (error) {
        console.error('Error loading dynamic translation:', error);
        if (isMounted) {
          setTranslation(key); // Fallback to key
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTranslation();

    return () => {
      isMounted = false;
    };
  }, [key, tDynamic, language, JSON.stringify(params)]);

  return { translation, loading };
};

export const useDynamicTranslations = (keys: Array<{ key: string; params?: Record<string, string | number> }>) => {
  const { tDynamic, language } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadTranslations = async () => {
      setLoading(true);
      try {
        const results: Record<string, string> = {};
        
        await Promise.all(
          keys.map(async ({ key, params }) => {
            try {
              results[key] = await tDynamic(key, params);
            } catch (error) {
              console.error(`Error loading translation for key ${key}:`, error);
              results[key] = key; // Fallback to key
            }
          })
        );
        
        if (isMounted) {
          setTranslations(results);
        }
      } catch (error) {
        console.error('Error loading dynamic translations:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [tDynamic, language, JSON.stringify(keys)]);

  return { translations, loading };
};
