import { ReviewsResponse } from '@shared/api';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../ui/table';

interface ReviewsPanelProps {
  reviews?: ReviewsResponse;
  isLoading: boolean;
}

export function ReviewsPanel({ reviews, isLoading }: ReviewsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>GBP sentiment snapshot</CardDescription>
        </div>
        <div className="text-right text-sm text-slate-300">
          <p className="text-2xl font-semibold text-slate-50">
            {isLoading ? '…' : (reviews?.averageRating ?? 0).toFixed(1)} ★
          </p>
          <p className="text-xs text-slate-400">{isLoading ? '—' : `${reviews?.reviewCount ?? 0} reviews`}</p>
        </div>
      </CardHeader>
      <div className="max-h-72 overflow-y-auto">
        <Table>
          <THead>
            <TR>
              <TH>Reviewer</TH>
              <TH>Rating</TH>
              <TH>Note</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading
              ? null
              : reviews?.reviews.map((review) => (
                  <TR key={review.id}>
                    <TD>{review.provider}</TD>
                    <TD>{review.rating} ★</TD>
                    <TD className="text-slate-300">{review.text}</TD>
                  </TR>
                ))}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}
