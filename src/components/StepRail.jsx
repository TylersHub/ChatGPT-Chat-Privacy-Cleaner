import { KeyRound, ListChecks, Search, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Brand } from './Brand.jsx';

export const workflowSteps = [
  { id: 'connect', label: 'Connect', icon: KeyRound },
  { id: 'keywords', label: 'Keywords', icon: Search },
  { id: 'scan', label: 'Scan', icon: Search },
  { id: 'review', label: 'Review', icon: ListChecks },
  { id: 'delete', label: 'Delete', icon: Trash2 }
];

export function StepRail({ active, onNavigate }) {
  return (
    <aside className="step-rail">
      <Brand />
      <nav className="workflow-nav" aria-label="ClearSlate workflow">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const selected = active === step.id;
          return (
            <button
              className={`workflow-nav__item ${selected ? 'is-active' : ''}`}
              key={step.id}
              type="button"
              onClick={() => onNavigate(step.id)}
              aria-current={selected ? 'step' : undefined}
            >
              <span className="workflow-nav__number">{index + 1}</span>
              <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              <span>{step.label}</span>
            </button>
          );
        })}
      </nav>
      <nav className="utility-nav" aria-label="Information and settings">
        <button className={active === 'safety' ? 'is-active' : ''} type="button" onClick={() => onNavigate('safety')}>
          <ShieldCheck size={20} strokeWidth={1.8} /> Safety
        </button>
        <button className={active === 'settings' ? 'is-active' : ''} type="button" onClick={() => onNavigate('settings')}>
          <SlidersHorizontal size={20} strokeWidth={1.8} /> Settings
        </button>
      </nav>
    </aside>
  );
}

