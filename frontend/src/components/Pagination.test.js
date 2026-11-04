import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import Pagination from './Pagination.js';

function findElements(element, predicate, matches = []) {
  if (!React.isValidElement(element)) return matches;
  if (predicate(element)) matches.push(element);
  React.Children.forEach(element.props.children, (child) => findElements(child, predicate, matches));
  return matches;
}

function renderPagination(currentPage, totalPages, onPageChange = () => {}) {
  return Pagination({ currentPage, totalPages, onPageChange });
}

test('hides pagination when there is only one page', () => {
  assert.equal(renderPagination(1, 1), null);
});

test('disables Previous on the first page and marks it as current', () => {
  const pagination = renderPagination(1, 4);
  const buttons = findElements(pagination, (element) => element.type === 'button');
  const previous = buttons.find((button) => button.props['aria-label'] === 'Previous page');
  const current = buttons.find((button) => button.props['aria-current'] === 'page');

  assert.equal(previous.props.disabled, true);
  assert.equal(current.props.children, 1);
});

test('disables Next on the last page', () => {
  const pagination = renderPagination(4, 4);
  const next = findElements(
    pagination,
    (element) => element.type === 'button' && element.props['aria-label'] === 'Next page',
  )[0];

  assert.equal(next.props.disabled, true);
});

test('clicking a page number requests that page', () => {
  let selectedPage;
  const pagination = renderPagination(2, 5, (page) => { selectedPage = page; });
  const pageFour = findElements(
    pagination,
    (element) => element.type === 'button' && element.props['aria-label'] === 'Page 4',
  )[0];

  pageFour.props.onClick();
  assert.equal(selectedPage, 4);
});

test('Previous and Next request adjacent pages', () => {
  const selectedPages = [];
  const pagination = renderPagination(3, 10, (page) => selectedPages.push(page));
  const buttons = findElements(pagination, (element) => element.type === 'button');

  buttons.find((button) => button.props['aria-label'] === 'Previous page').props.onClick();
  buttons.find((button) => button.props['aria-label'] === 'Next page').props.onClick();

  assert.deepEqual(selectedPages, [2, 4]);
});

test('renders all page numbers without ellipses when they fit', () => {
  const markup = renderToStaticMarkup(renderPagination(3, 5));

  assert.match(markup, />1</);
  assert.match(markup, />2</);
  assert.match(markup, />3</);
  assert.match(markup, />4</);
  assert.match(markup, />5</);
  assert.doesNotMatch(markup, /pagination-ellipsis/);
});

test('renders a trailing ellipsis when the current page is near the start', () => {
  const markup = renderToStaticMarkup(renderPagination(3, 24));
  const pageNumbers = [...markup.matchAll(/aria-label="Page (\d+)"/g)]
    .map((match) => Number(match[1]));

  assert.deepEqual(pageNumbers, [1, 2, 3, 4, 5, 24]);
  assert.equal((markup.match(/pagination-ellipsis/g) || []).length, 1);
});

test('renders ellipses around the current page in the middle', () => {
  const markup = renderToStaticMarkup(renderPagination(5, 24));

  assert.match(markup, />1</);
  assert.match(markup, /…/);
  assert.match(markup, />4</);
  assert.match(markup, />5</);
  assert.match(markup, />6</);
  assert.match(markup, />24</);
});

test('renders the last page only once near the end', () => {
  const markup = renderToStaticMarkup(renderPagination(22, 24));
  const pageNumbers = [...markup.matchAll(/aria-label="Page (\d+)"/g)]
    .map((match) => Number(match[1]));

  assert.deepEqual(pageNumbers, [1, 20, 21, 22, 23, 24]);
  assert.equal(pageNumbers.filter((page) => page === 24).length, 1);
});
