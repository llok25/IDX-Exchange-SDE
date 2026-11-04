import React from 'react';

const h = React.createElement;

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-start', ...Array.from(
      { length: 5 },
      (_, index) => totalPages - 4 + index,
    )];
  }

  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    totalPages,
  ];
}

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageItems = getPageItems(currentPage, totalPages);
  const pageControls = pageItems.map((item) => (
    typeof item === 'number' ? h(
      'button',
      {
        className: 'pagination-button',
        type: 'button',
        key: item,
        'aria-label': `Page ${item}`,
        'aria-current': currentPage === item ? 'page' : undefined,
        onClick: () => onPageChange(item),
        disabled: currentPage === item,
      },
      item,
    ) : h('span', {
      className: 'pagination-ellipsis',
      key: item,
      'aria-hidden': 'true',
    }, '…')
  ));

  return h(
    'nav',
    { className: 'listings__pagination', 'aria-label': 'Property pages' },
    h('button', {
      className: 'pagination-button',
      type: 'button',
      'aria-label': 'Previous page',
      onClick: () => onPageChange(currentPage - 1),
      disabled: currentPage === 1,
    }, 'Previous'),
    h('div', { className: 'pagination-pages' }, ...pageControls),
    h('button', {
      className: 'pagination-button',
      type: 'button',
      'aria-label': 'Next page',
      onClick: () => onPageChange(currentPage + 1),
      disabled: currentPage === totalPages,
    }, 'Next'),
  );
}
