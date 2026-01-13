import { ViewMode } from '@/types';
import { Users, Briefcase } from 'lucide-react';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => {
  return (
    <div className="toggle-container">
      <button
        className={`toggle-option flex items-center gap-2 ${mode === 'hiring' ? 'active' : ''}`}
        onClick={() => onModeChange('hiring')}
      >
        <Users className="w-4 h-4" />
        <span>I am Hiring</span>
      </button>
      <button
        className={`toggle-option flex items-center gap-2 ${mode === 'seeking' ? 'active' : ''}`}
        onClick={() => onModeChange('seeking')}
      >
        <Briefcase className="w-4 h-4" />
        <span>I need a Job</span>
      </button>
    </div>
  );
};
