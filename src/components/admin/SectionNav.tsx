import React, { useEffect, useState } from 'react';

export interface SectionNavItem {
  id: string;
  label: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
  /** Extra classes on the outer <nav> (e.g. to control visibility/sticky offset per page). */
  className?: string;
  /** Pixels to offset scroll/observer by, to clear the sticky site header. Defaults to 140. */
  headerOffset?: number;
}

/**
 * Sticky "jump to section" sidebar for long admin forms.
 * Renders a list of section labels; clicking one smooth-scrolls to the
 * matching `id={item.id}` element on the page, and the currently visible
 * section is highlighted as the user scrolls (via IntersectionObserver).
 *
 * Usage: give each section container `id={ITEM_ID}` and
 * `style={{ scrollMarginTop: headerOffset }}`, then render
 * `<SectionNav items={[...]} className="hidden lg:block lg:sticky" />`
 * next to the content inside a `lg:grid lg:grid-cols-[200px_1fr]` wrapper.
 */
const SectionNav: React.FC<SectionNavProps> = ({ items, className = '', headerOffset = 140 }) => {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  const itemsKey = items.map((i) => i.id).join('|');

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // A section counts as "current" once its top has passed just below the
        // sticky header, and stops counting once it's scrolled mostly off-screen.
        rootMargin: `-${headerOffset}px 0px -65% 0px`,
        threshold: 0,
      }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, headerOffset]);

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset + 8;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveId(id);
  };

  return (
    <nav
      className={className}
      style={{ top: headerOffset, maxHeight: `calc(100vh - ${headerOffset}px - 24px)`, overflowY: 'auto', alignSelf: 'start' }}
      aria-label="Section navigation"
    >
      <ul className="space-y-2 border-l-2 border-gray-200">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleClick(item.id)}
                className={`block w-full -ml-0.5 border-l-2 px-4 py-2.5 text-left text-base leading-snug transition-colors ${
                  active
                    ? 'border-blue-600 font-semibold text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SectionNav;
