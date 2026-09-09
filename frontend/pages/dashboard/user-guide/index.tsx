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

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {USER_GUIDE_TOPICS.map((topic) => (
          <Link
            key={topic.slug}
            href={`/dashboard/user-guide/${topic.slug}`}
            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumbnailUrl(topic.video.en)}
                alt={topic.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary-700 shadow-lg transition-transform group-hover:scale-105">
                  <PlayIcon className="ml-1 h-6 w-6" />
                </span>
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-900">{topic.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{topic.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(UserGuide);
