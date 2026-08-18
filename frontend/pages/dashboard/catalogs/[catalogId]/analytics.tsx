import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import Alert from '@/components/Alert';
import StatCard from '@/components/dashboard/StatCard';
import ViewsTrendChart from '@/components/dashboard/ViewsTrendChart';
import { EyeIcon, UserIcon, MailIcon, ChartBarIcon, ExclamationTriangleIcon } from '@/components/icons';
import { apiFetch, ApiError } from '@/utils/api';

interface Catalog {
  id: string;
  name: string;
}

interface ProductStat {
  productId: string;
  name: string;
  views?: number;
  count?: number;
  enquiries?: number;
}

interface Analytics {
  totalViews: number;
  uniqueVisitors: number;
  totalEnquiries: number;
  conversionRate: number;
  deviceBreakdown: { mobile: number; desktop: number };
  viewsTrend: { date: string; views: number }[];
  enquiryFunnel: { new: number; contacted: number; closed: number };
  topProductsByViews: ProductStat[];
  topProductsByEnquiries: ProductStat[];
  underperformingProducts: ProductStat[];
}

const FUNNEL_STYLES: Record<keyof Analytics['enquiryFunnel'], string> = {
  new: 'bg-blue-500',
  contacted: 'bg-amber-500',
  closed: 'bg-gray-400',
};

function ProductStatList({ items, valueKey, valueLabel }: { items: ProductStat[]; valueKey: 'views' | 'count'; valueLabel: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-400">Nothing yet.</p>;
  }
  return (
    <ol className="divide-y divide-gray-100">
      {items.map((item, i) => (
        <li key={item.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">
              {i + 1}
            </span>
            <span className="truncate text-gray-900">{item.name}</span>
          </span>
          <span className="shrink-0 text-xs font-medium text-gray-500">
            {item[valueKey]} {valueLabel}
          </span>
        </li>
      ))}
    </ol>
  );
}

function AnalyticsPage() {
  const router = useRouter();
  const catalogId = typeof router.query.catalogId === 'string' ? router.query.catalogId : '';

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!catalogId) return;
    apiFetch<{ catalog: Catalog }>(`/catalogs/${catalogId}`)
      .then((res) => setCatalog(res.catalog))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load catalog.'));
    apiFetch<{ analytics: Analytics }>(`/analytics/${catalogId}`)
      .then((res) => setAnalytics(res.analytics))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load analytics.'));
  }, [catalogId]);

  const deviceTotal = analytics ? analytics.deviceBreakdown.mobile + analytics.deviceBreakdown.desktop : 0;
  const mobilePercent = deviceTotal > 0 ? Math.round((analytics!.deviceBreakdown.mobile / deviceTotal) * 100) : 0;

  const funnelTotal = analytics
    ? analytics.enquiryFunnel.new + analytics.enquiryFunnel.contacted + analytics.enquiryFunnel.closed
    : 0;

  return (
    <DashboardLayout title="Analytics">
      <Link href={`/dashboard/catalogs/${catalogId}`} className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to catalog
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">Analytics{catalog ? ` — ${catalog.name}` : ''}</h1>
      <p className="mt-1 text-sm text-gray-500">How this catalog is performing with real visitors — last 30 days for the trend, all-time for everything else.</p>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!analytics && !error && <p className="mt-6 text-sm text-gray-500">Loading…</p>}

      {analytics && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Views" value={analytics.totalViews} icon={EyeIcon} accent="primary" />
            <StatCard label="Unique Visitors" value={analytics.uniqueVisitors} icon={UserIcon} accent="secondary" />
            <StatCard label="Enquiries" value={analytics.totalEnquiries} icon={MailIcon} accent="green" />
            <StatCard
              label="Conversion Rate"
              value={`${analytics.conversionRate}%`}
              hint="Enquiries per catalog view"
              icon={ChartBarIcon}
              accent="gray"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
              <p className="text-sm font-medium text-gray-700">Views — last 30 days</p>
              <div className="mt-4">
                <ViewsTrendChart data={analytics.viewsTrend} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-700">Device breakdown</p>
              {deviceTotal === 0 ? (
                <p className="mt-6 text-center text-sm text-gray-400">No visits yet.</p>
              ) : (
                <>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="bg-primary-600" style={{ width: `${mobilePercent}%` }} />
                    <div className="bg-secondary-400" style={{ width: `${100 - mobilePercent}%` }} />
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary-600" /> Mobile
                      </span>
                      <span className="font-medium text-gray-900">{analytics.deviceBreakdown.mobile} ({mobilePercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-secondary-400" /> Desktop
                      </span>
                      <span className="font-medium text-gray-900">
                        {analytics.deviceBreakdown.desktop} ({100 - mobilePercent}%)
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-700">Enquiry funnel</p>
            {funnelTotal === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No enquiries yet.</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
                  {(Object.keys(FUNNEL_STYLES) as (keyof Analytics['enquiryFunnel'])[]).map((key) => (
                    <div
                      key={key}
                      className={FUNNEL_STYLES[key]}
                      style={{ width: `${(analytics.enquiryFunnel[key] / funnelTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  {(Object.keys(FUNNEL_STYLES) as (keyof Analytics['enquiryFunnel'])[]).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${FUNNEL_STYLES[key]}`} />
                      <span className="text-gray-600 capitalize">{key}</span>
                      <span className="ml-auto font-semibold text-gray-900">{analytics.enquiryFunnel[key]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-700">Top products — by enquiries</p>
              <div className="mt-2">
                <ProductStatList items={analytics.topProductsByEnquiries} valueKey="count" valueLabel="enquiries" />
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-700">Top products — by views</p>
              <div className="mt-2">
                <ProductStatList items={analytics.topProductsByViews} valueKey="views" valueLabel="views" />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-gray-900">Underperforming products</p>
            </div>
            <p className="mt-1 text-sm text-gray-600">The least-engaged products in this catalog — worth a better photo, a lower price, or removing.</p>
            {analytics.underperformingProducts.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">Not enough data yet.</p>
            ) : (
              <ol className="mt-3 divide-y divide-amber-100">
                {analytics.underperformingProducts.map((item, i) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-semibold text-amber-700">
                        {i + 1}
                      </span>
                      <span className="truncate text-gray-900">{item.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-gray-500">
                      {item.views} views · {item.enquiries} enquiries
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default withAuth(AnalyticsPage);
