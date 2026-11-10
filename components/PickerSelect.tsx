'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { Check, ChevronDown, Search } from 'lucide-react';

export type PickerOption = {
  value: string;
  label: string;
  /** Short text in a chip before the label, like a surah number. Also searchable. */
  badge?: string;
};

const simplify = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function PickerSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchPlaceholder,
  emptyText,
}: {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Adds a search box to the list. */
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const selected = options.find((option) => option.value === value);
  const visible = useMemo(() => {
    const needle = simplify(query);
    if (!needle) return options;
    return options.filter((option) => simplify(`${option.badge ?? ''} ${option.label}`).includes(needle)
      || simplify(option.label).includes(needle)
      || simplify(option.badge ?? '').startsWith(needle));
  }, [options, query]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery('');
      setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    }
  }

  function scrollToActive() {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function moveActive(index: number) {
    setActiveIndex(index);
    requestAnimationFrame(scrollToActive);
  }

  function choose(option: PickerOption) {
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    const last = visible.length - 1;
    if (event.key === 'ArrowDown') moveActive(Math.min(last, activeIndex + 1));
    else if (event.key === 'ArrowUp') moveActive(Math.max(0, activeIndex - 1));
    else if (event.key === 'Home' && !searchPlaceholder) moveActive(0);
    else if (event.key === 'End' && !searchPlaceholder) moveActive(last);
    else if (event.key === 'Enter' && visible[activeIndex]) choose(visible[activeIndex]);
    else return;
    event.preventDefault();
  }

  const activeDescendant = visible[activeIndex] ? optionId(activeIndex) : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">{label}</span>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-labelledby={labelId}
            aria-haspopup="listbox"
            className="flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200/70 disabled:bg-slate-50/80 disabled:text-slate-600 disabled:shadow-none dark:disabled:bg-slate-900/40 dark:disabled:text-slate-400 data-[state=open]:border-emerald-500 data-[state=open]:ring-2 data-[state=open]:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
          >
            {selected?.badge && <Badge text={selected.badge} />}
            <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            style={{ width: 'var(--radix-popover-trigger-width)' }}
            className="z-50 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onKeyDown={handleKeyDown}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (searchRef.current ?? listRef.current)?.focus();
              scrollToActive();
            }}
          >
            {searchPlaceholder && (
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  role="combobox"
                  aria-label={searchPlaceholder}
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={activeDescendant}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400"
                />
              </div>
            )}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              aria-activedescendant={searchPlaceholder ? undefined : activeDescendant}
              tabIndex={searchPlaceholder ? undefined : -1}
              className="max-h-72 overflow-y-auto p-1 outline-none"
            >
              {visible.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
              )}
              {visible.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    data-active={index === activeIndex}
                    onClick={() => choose(option)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                      index === activeIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                    } ${isSelected ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}`}
                  >
                    {option.badge && <Badge text={option.badge} />}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                  </div>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {text}
    </span>
  );
}
