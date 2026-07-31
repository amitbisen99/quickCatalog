import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/context/AdminAuthContext';
import type { ComponentType } from 'react';

export default function withAdminAuth<P extends object>(Component: ComponentType<P>) {
  return function ProtectedAdminRoute(props: P) {
    const { admin, loading } = useAdminAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !admin) {
        router.replace('/admin');
      }
    }, [loading, admin, router]);

    if (loading || !admin) {
      return null;
    }

    return <Component {...props} />;
  };
}
