import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import PropertyFilters, { EMPTY_FILTERS } from './PropertyFilters.js';

function findElements(element, predicate, matches = []) {
  if (!React.isValidElement(element)) return matches;
  if (predicate(element)) matches.push(element);
  React.Children.forEach(element.props.children, (child) => findElements(child, predicate, matches));
  return matches;
}

function renderFilterForm(props = {}) {
  return PropertyFilters({
    filters: EMPTY_FILTERS,
    onChange() {},
    onSearch() {},
    onClear() {},
    ...props,
  });
}

test('renders all six labeled filter inputs', () => {
  const markup = renderToStaticMarkup(renderFilterForm());

  for (const label of ['City', 'ZIP code', 'Minimum price', 'Maximum price', 'Beds', 'Baths']) {
    assert.match(markup, new RegExp(`<span>${label}</span>`));
  }
  assert.equal((markup.match(/<input\b/g) || []).length, 4);
  assert.equal((markup.match(/<select\b/g) || []).length, 2);
});

test('keeps form controls controlled and reports changed values', () => {
  let changedFilters;
  const currentFilters = { ...EMPTY_FILTERS, city: 'Irvine' };
  const form = renderFilterForm({
    filters: currentFilters,
    onChange: (nextFilters) => { changedFilters = nextFilters; },
  });
  const cityInput = findElements(
    form,
    (element) => element.type === 'input' && element.props.name === 'city',
  )[0];

  assert.equal(cityInput.props.value, 'Irvine');
  cityInput.props.onChange({ target: { name: 'city', value: 'Tustin' } });
  assert.deepEqual(changedFilters, { ...currentFilters, city: 'Tustin' });
});

test('submits the current filters and exposes a clear action', () => {
  const currentFilters = { ...EMPTY_FILTERS, zipcode: '92602' };
  let searchedFilters;
  let clearCount = 0;
  const form = renderFilterForm({
    filters: currentFilters,
    onSearch: (submittedFilters) => { searchedFilters = submittedFilters; },
    onClear: () => { clearCount += 1; },
  });
  const formElement = findElements(form, (element) => element.type === 'form')[0];
  const clearButton = findElements(
    form,
    (element) => element.type === 'button' && element.props.children === 'Clear Filters',
  )[0];
  let prevented = false;

  formElement.props.onSubmit({ preventDefault: () => { prevented = true; } });
  clearButton.props.onClick();

  assert.equal(prevented, true);
  assert.equal(searchedFilters, currentFilters);
  assert.equal(clearCount, 1);
});
