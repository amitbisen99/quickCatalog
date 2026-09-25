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

  // One or two cards would look lost stretched across a 3-column grid, so
  // narrow the container and columns to fit however many there are. Every
  // variant sets grid-cols-1 explicitly: without it the phone layout gets an
  // auto-sized column that grows to fit the longest unwrapped line (a long
  // business name in a truncated caption), pushing the cards wider than the
  // screen.
  const layout =
    items.length === 1
      ? 'max-w-2xl grid-cols-1'
      : items.length === 2
        ? 'max-w-4xl grid-cols-1 md:grid-cols-2'
        : 'max-w-6xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

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

        <div className={`mx-auto grid gap-6 ${layout}`}>
          {items.map((item) => (
            <figure
              key={`${item.name}-${item.business}`}
              className="flex flex-col rounded-3xl border border-brand-border bg-white p-8"
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
