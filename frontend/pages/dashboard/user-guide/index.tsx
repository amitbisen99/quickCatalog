import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import { PlayIcon } from '@/components/icons';
import { USER_GUIDE_TOPICS, youtubeThumbnailUrl } from '@/utils/userGuide';

function UserGuide() {
  return (
    <DashboardLayout title="User Guide">
      <h1 className="text-3xl font-bold text-gray-900">User Guide</h1>
      <p className="mt-1.5 text-base text-gray-500">
        Short videos covering everything from your first catalog to sharing it with buyers — in English or Hindi.
      </p>

      {/* One bar per row (~1050x100px each) instead of a thumbnail grid —
          easier to scan a list of 8 topics top to bottom than to hunt
          across two columns. */}
      <div className="mt-8 mx-auto max-w-[1050px] space-y-4">
        {USER_GUIDE_TOPICS.map((topic) => (
          <Link
            key={topic.slug}
            href={`/dashboard/user-guide/${topic.slug}`}
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumbnailUrl(topic.video.en)}
                alt={topic.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary-700 shadow-lg transition-transform group-hover:scale-105 sm:h-8 sm:w-8">
                  <PlayIcon className="ml-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-sm font-semibold text-gray-900 sm:line-clamp-none sm:truncate">{topic.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">{topic.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(UserGuide);
