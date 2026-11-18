import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import ErrorBoundary from './ErrorBoundary.js';

test('renders a recovery UI after a child render error is captured', () => {
  const errorState = ErrorBoundary.getDerivedStateFromError(new Error('render failure'));
  const boundary = new ErrorBoundary({ children: React.createElement('p', null, 'Child') });
  boundary.state = errorState;

  const markup = renderToStaticMarkup(boundary.render());
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Something went wrong/);
  assert.match(markup, /Try again/);
});
