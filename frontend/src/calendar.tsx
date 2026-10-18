import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS, WEEKDAYS_SHORT, weekdayOf } from './util';

const monthOf = (day: string) => day.slice(0, 7);

function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Calendário mensal: só os dias de `available` (YYYY-MM-DD) podem ser escolhidos. */
export function Calendar({ available, value, today, onChange }: { available: string[]; value: string; today: string; onChange: (day: string) => void }) {
  const set = useMemo(() => new Set(available), [available]);
  const first = monthOf(available[0] || today);
  const last = monthOf(available[available.length - 1] || today);
  const [month, setMonth] = useState(() => monthOf(value || available[0] || today));

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = weekdayOf(`${month}-01`);
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];

  return (
    <div className="card p-3 min-[380px]:p-4">
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className="icon-btn h-11 w-11 disabled:opacity-30" aria-label="Mês anterior" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={20} />
        </button>
        <p className="min-w-0 flex-1 text-center font-bold capitalize">
          {MONTHS[m - 1]} {y}
        </p>
        <button type="button" className="icon-btn h-11 w-11 disabled:opacity-30" aria-label="Próximo mês" disabled={month >= last} onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-muted">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="py-1">
            {d.slice(0, 3)}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              disabled={!set.has(day)}
              aria-pressed={value === day}
              aria-label={day.split('-').reverse().join('/')}
              onClick={() => onChange(day)}
              className={`flex aspect-square min-h-[40px] items-center justify-center rounded-xl text-base transition ${
                value === day ? 'bg-accent font-bold text-bg' : set.has(day) ? 'border border-line2 font-medium text-ink' : 'text-dis'
              } ${day === today && value !== day ? 'ring-1 ring-accent/60' : ''}`}
            >
              {Number(day.slice(8))}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
