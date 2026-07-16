import { useState } from 'react';

export function usePagination(limitInicial = 10) {
  const [page, setPage] = useState(1);
  const [limit] = useState(limitInicial);

  function totalPaginas(total) {
    return Math.max(Math.ceil(total / limit), 1);
  }

  return { page, setPage, limit, totalPaginas };
}
