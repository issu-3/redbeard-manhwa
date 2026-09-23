'use client';

import { useState } from 'react';
import { adminDeleteReview } from '@/app/actions/admin/reviews';
import { toast } from 'sonner';
import { Star, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface AdminReviewsClientProps {
  initialReviews: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export function AdminReviewsClient({
  initialReviews,
  total,
  totalPages,
  currentPage,
}: AdminReviewsClientProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    setIsDeleting(id);
    const res = await adminDeleteReview(id);
    setIsDeleting(null);

    if (res.success) {
      toast.success('Review deleted');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error(res.error || 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Series</th>
                <th className="px-6 py-4 font-medium">Rating</th>
                <th className="px-6 py-4 font-medium">Review</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">
                        {review.user.displayName || review.user.username || 'Anonymous'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {review.user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/series/${review.series.slug}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                        target="_blank"
                      >
                        {review.series.title}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-text-primary">{review.rating}</span>
                        <Star className="w-4 h-4 text-warning fill-warning" />
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {review.content ? (
                        <div className="truncate" title={review.content}>
                          {review.isSpoiler && (
                            <AlertCircle className="w-3 h-3 text-danger inline mr-1" />
                          )}
                          {review.content}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No text</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(review.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(review.id)}
                        disabled={isDeleting === review.id}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        {isDeleting === review.id ? '...' : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {reviews.length} of {total} reviews
            </span>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" disabled={currentPage <= 1}>
                <Link href={`/admin/reviews?page=${currentPage - 1}`}>Previous</Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={currentPage >= totalPages}>
                <Link href={`/admin/reviews?page=${currentPage + 1}`}>Next</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
