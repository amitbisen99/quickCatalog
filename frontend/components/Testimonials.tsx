import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaQuoteLeft, FaStar } from 'react-icons/fa6';
import type { Testimonial } from '@/data/testimonials';
import { initialsOf } from '@/components/catalog-templates/shared';

interface Props {
  items: Testimonial[];
}

// How far one "slide" moves: the distance between two neighbouring cards'
// left edges (card width + gap). Needs the track to be a positioned element
// so offsetLeft is measured against it.
function slideStep(track: HTMLElement): number {
  const [first, second] = [track.children[0], track.children[1]] as HTMLElement[];
  return first && second ? second.offsetLeft - first.offsetLeft : 0;
}

// Homepage social-proof slider. Renders nothing at all until there's at
// least one real testimonial (see data/testimonials.ts) — an empty
// "What our customers say" heading is worse than no section.
//
// A native scroll-snap strip rather than a carousel library: swiping on a
// phone, trackpad scrolling and keyboard arrows all work for free, and the
// arrows/dots below just drive the same scroll position. The arrows and dots
// only appear when there are more cards than fit at the current screen
// width — three testimonials on a desktop are simply laid out side by side.
export default function Testimonials({ items }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);

  // Works out how many positions the strip can scroll to (0 = everything
  // fits, no controls needed) and which one it's currently on.
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = slideStep(track);
    const overflow = track.scrollWidth - track.clientWidth;
    const max = step > 0 && overflow > 2 ? Math.round(overflow / step) : 0;
    setMaxIndex(max);
    setIndex(step > 0 ? Math.min(Math.max(Math.round(track.scrollLeft / step), 0), max) : 0);
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (track && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(track);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, items.length]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function handleScroll() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(measure);
  }

  function goTo(target: number) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: Math.min(Math.max(target, 0), maxIndex) * slideStep(track),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  if (items.length === 0) return null;

  // Card widths are set per breakpoint: full width on phones, half (minus
  // half the 24px gap) on tablets, a third (minus a third of the two gaps)
  // on desktop. One or two testimonials get a narrower container so they
  // don't look lost.
  const containerWidth = items.length === 1 ? 'max-w-2xl' : items.length === 2 ? 'max-w-4xl' : 'max-w-6xl';
  const cardWidth =
    items.length === 1
      ? 'w-full'
      : items.length === 2
        ? 'w-full md:w-[calc(50%_-_12px)]'
        : 'w-full md:w-[calc(50%_-_12px)] lg:w-[calc(33.3333%_-_16px)]';

  const arrowClass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-white text-brand-text transition-colors hover:border-black hover:bg-home2-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-brand-border disabled:hover:bg-white';

  return (
    <section id="testimonials" className="bg-brand-bg px-6 pb-28 pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-home2-accent-light px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-home2-accent-text">
            Testimonials
          </span>
          <h2 className="mb-5 text-3xl font-black tracking-tighter md:text-4xl">
            What Our <span className="home2-text-gradient">Customers Say</span>
          </h2>
          <p className="mx-auto max-w-xl text-brand-muted">
            Real feedback from businesses using Instant Catalog to share their products.
          </p>
        </div>

        <div role="region" aria-roledescription="carousel" aria-label="Customer testimonials">
          {/* shrink-0 on the cards is what makes this scroll: without it flex
              would squeeze every card to fit instead of overflowing. The
              first/last auto margins center the cards when they all fit,
              without cutting off the left edge when they don't. */}
          <div
            ref={trackRef}
            onScroll={handleScroll}
            tabIndex={0}
            className={`relative mx-auto flex snap-x snap-mandatory gap-6 overflow-x-auto rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home2-accent-text/40 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${containerWidth}`}
          >
            {items.map((item, i) => (
              <figure
                key={`${item.name}-${item.business}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${items.length}`}
                className={`flex min-w-0 shrink-0 snap-start flex-col rounded-3xl border border-brand-border bg-white p-8 first:ml-auto last:mr-auto ${cardWidth}`}
              >
                <FaQuoteLeft className="mb-4 text-2xl text-home2-accent-text" aria-hidden="true" />

                {item.rating ? (
                  <div className="mb-4 flex gap-1" role="img" aria-label={`${item.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        className={star <= item.rating! ? 'text-brand-yellow' : 'text-brand-border'}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                ) : null}

                <blockquote className="flex-1 leading-relaxed text-brand-text">{item.quote}</blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-brand-border pt-6">
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.avatar} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-home2-accent-light text-sm font-bold text-home2-accent-text"
                      aria-hidden="true"
                    >
                      {initialsOf(item.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-brand-text">{item.name}</p>
                    <p className="break-words text-xs text-brand-muted">
                      {item.role ? `${item.role}, ${item.business}` : item.business}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>

          {maxIndex > 0 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index <= 0}
                aria-label="Previous testimonial"
                className={arrowClass}
              >
                <FaArrowLeft className="text-sm" />
              </button>

              <div className="flex items-center">
                {Array.from({ length: maxIndex + 1 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className="flex h-6 items-center px-1"
                  >
                    <span
                      className={`block h-2.5 rounded-full transition-all ${
                        i === index ? 'w-6 bg-home2-accent-text' : 'w-2.5 bg-brand-border'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index >= maxIndex}
                aria-label="Next testimonial"
                className={arrowClass}
              >
                <FaArrowRight className="text-sm" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
