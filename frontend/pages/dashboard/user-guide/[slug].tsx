import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import withAuth from '@/components/withAuth';
import { USER_GUIDE_TOPICS, youtubeEmbedUrl } from '@/utils/userGuide';

type Language = 'en' | 'hi';

function UserGuideVideo() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [language, setLanguage] = useState<Language>('en');

  const topic = USER_GUIDE_TOPICS.find((t) => t.slug === slug);

  return (
    <DashboardLayout title={topic ? topic.title : 'User Guide'}>
      <Link href="/dashboard/user-guide" className="text-sm font-medium text-gray-500 hover:text-primary-700">
        ← Back to User Guide
      </Link>

      {!topic ? (
        <p className="mt-4 text-sm text-gray-500">Video not found.</p>
      ) : (
        <div className="mt-4 max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{topic.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{topic.description}</p>
            </div>

            <div className="inline-flex shrink-0 rounded-lg border border-gray-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'hi' ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
            {/* key forces a clean remount on language switch instead of the
                iframe silently continuing the previous language in the
                background. */}
            <iframe
              key={topic.video[language]}
              src={youtubeEmbedUrl(topic.video[language])}
              title={`${topic.title} (${language === 'en' ? 'English' : 'Hindi'})`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(UserGuideVideo);
