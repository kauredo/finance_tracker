import { Button } from "@/components/ui/Button";
import Icon from "@/components/icons/Icon";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
      {/* Items per page selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Items per page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page info */}
      <div className="text-sm text-muted">
        Showing {startItem}–{endItem} of {totalItems}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium hover:bg-surface-alt"
        >
          Previous
        </Button>

        {getPageNumbers().map((page, index) => (
          <Button
            key={index}
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..." || page === currentPage}
            variant={page === currentPage ? "primary" : "ghost"}
            size="sm"
            className={`min-w-[2rem] h-8 px-0 text-sm font-medium ${
              page === "..." ? "cursor-default hover:bg-transparent" : ""
            }`}
          >
            {page}
          </Button>
        ))}

        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-sm font-medium hover:bg-surface-alt"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
