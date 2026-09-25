import { FaQuoteLeft, FaStar } from 'react-icons/fa6';
import type { Testimonial } from '@/data/testimonials';
import { initialsOf } from '@/components/catalog-templates/shared';

interface Props {
  items: Testimonial[];
}

// Homepage social-proof section. Renders nothing at all until there's at
// least one real testimonial (see data/testimonials.ts) — an empty
// "What our customers say" heading is worse than no section.
export default function Testimonials({ items }: Props) {
  if (items.length === 0) return null;

  // A wrapping flex row rather than a grid, so an incomplete last row (say 2
  // cards left over after a row of 3) is centered instead of hugging the
  // left edge. Card widths are set explicitly per breakpoint: 100% on
  // phones, half (minus half the 24px gap) on tablets, a third (minus a
  // third of the two gaps) on desktop. One or two testimonials get a
  // narrower container so they don't look lost.
  const containerWidth = items.length === 1 ? 'max-w-2xl' : items.length === 2 ? 'max-w-4xl' : 'max-w-6xl';
  const cardWidth =
    items.length === 1
      ? 'w-full'
      : items.length === 2
        ? 'w-full md:w-[calc(50%_-_12px)]'
        : 'w-full md:w-[calc(50%_-_12px)] lg:w-[calc(33.3333%_-_16px)]';

  return (
    <section id="testimonials" className="px-6 pb-0 pt-28 bg-brand-bg">
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

        <div className={`mx-auto flex flex-wrap justify-center gap-6 ${containerWidth}`}>
          {items.map((item) => (
            <figure
              key={`${item.name}-${item.business}`}
              className={`flex min-w-0 flex-col rounded-3xl border border-brand-border bg-white p-8 ${cardWidth}`}
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
      </div>
    </section>
  );
}
