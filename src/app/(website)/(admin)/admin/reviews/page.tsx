import { Metadata } from 'next';
import { getAdminReviews } from '@/app/actions/admin/reviews';
import { AdminReviewsClient } from './reviews-client';

export const metadata: Metadata = {
  title: 'Manage Reviews | REDBEARD Admin',
  description: 'Manage user reviews across the platform.',
};

export default async function AdminReviewsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const { reviews, total, totalPages } = await getAdminReviews(page, 20);

  return (
    <div className="space-y-6">
      <div className="mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-primary">Reviews</h1>
          <p className="mt-2 text-sm md:text-base text-text-secondary">
            Manage user reviews and ratings across all series.
          </p>
        </div>
      </div>

      <AdminReviewsClient 
        initialReviews={reviews} 
        total={total}
        totalPages={totalPages}
        currentPage={page}
      />
    </div>
  );
}
