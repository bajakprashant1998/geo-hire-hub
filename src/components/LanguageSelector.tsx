import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'icon' | 'full';
}

export const LanguageSelector = ({ className, variant = 'icon' }: LanguageSelectorProps) => {
  const { i18n } = useTranslation();
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={variant === 'icon' ? 'icon' : 'sm'} className={cn('touch-target touch-scale', className)}>
          {variant === 'icon' ? (
            <Globe className="w-5 h-5 text-muted-foreground" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span>{currentLang.flag}</span>
              <span className="text-sm">{currentLang.nativeName}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              i18n.language === lang.code && 'bg-primary/10 text-primary font-medium'
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.nativeName}</span>
            <span className="text-xs text-muted-foreground ml-auto">{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
