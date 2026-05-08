import { analytics } from '../lib/analytics';

/**
 * GoalNav — Goal-based product discovery strip.
 *
 * Most customers think in terms of outcomes, not supplement taxonomy.
 * This strip collapses the 3-click section → category path into a
 * single intentional tap, routed by customer goal.
 *
 * Each goal maps to the highest-converting entry category for that objective.
 */
const GOALS = [
  { id: 'muscle',    icon: '💪', label: 'Ganar músculo',  section: 'gym',  category: 'Proteínas Whey'       },
  { id: 'strength',  icon: '🏋️', label: 'Fuerza',         section: 'gym',  category: 'Creatinas'             },
  { id: 'cut',       icon: '🔥', label: 'Definición',     section: 'gym',  category: 'Quemadores de Grasa'   },
  { id: 'energy',    icon: '⚡', label: 'Más energía',    section: 'gym',  category: 'Pre-Entrenamientos'    },
  { id: 'recovery',  icon: '🧘', label: 'Recuperación',   section: 'gym',  category: 'Glutamina'             },
  { id: 'sleep',     icon: '😴', label: 'Dormir mejor',   section: 'vita', category: 'Sueño y Relajación'   },
  { id: 'wellness',  icon: '❤️', label: 'Salud general',  section: 'vita', category: 'Vitaminas Esenciales'  },
  { id: 'joints',    icon: '🦴', label: 'Articulaciones', section: 'vita', category: 'Articulaciones'        },
];

export default function GoalNav({ onNavigate }) {
  function handleGoal(goal) {
    analytics.goalNav(goal.id, goal.label, goal.category);
    onNavigate(goal.section, goal.category);
  }

  return (
    <div className="goal-nav">
      <div className="goal-nav-header">
        <span className="goal-nav-eyebrow">Encontrá lo que necesitás</span>
        <h3 className="goal-nav-title">¿Cuál es tu objetivo?</h3>
      </div>
      <div className="goal-nav-strip" role="list">
        {GOALS.map(goal => (
          <button
            key={goal.id}
            className="goal-pill"
            onClick={() => handleGoal(goal)}
            role="listitem"
            aria-label={goal.label}
          >
            <span className="goal-pill-icon" aria-hidden="true">{goal.icon}</span>
            <span className="goal-pill-label">{goal.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
