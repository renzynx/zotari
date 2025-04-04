import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface FilePaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

export function FilePagination({
  currentPage,
  totalPages,
  setCurrentPage,
}: FilePaginationProps) {
  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          />
        </PaginationItem>

        {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
          let pageNumber;

          // Logic to show pages around current page
          if (totalPages <= 5) {
            pageNumber = idx + 1;
          } else if (currentPage <= 3) {
            pageNumber = idx + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNumber = totalPages - 4 + idx;
          } else {
            pageNumber = currentPage - 2 + idx;
          }

          return (
            <PaginationItem key={idx}>
              <PaginationLink
                onClick={() => setCurrentPage(pageNumber)}
                isActive={currentPage === pageNumber}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {totalPages > 5 && currentPage < totalPages - 2 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {totalPages > 5 && currentPage < totalPages - 1 && (
          <PaginationItem>
            <PaginationLink onClick={() => setCurrentPage(totalPages)}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
