import React from 'react';

const h = React.createElement;

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset() {
    this.setState({ hasError: false });
  }

  render() {
    if (this.state.hasError) {
      return h(
        'main',
        { className: 'page-shell' },
        h(
          'div',
          { className: 'state-panel state-panel--error', role: 'alert' },
          h('span', { className: 'state-panel__icon', 'aria-hidden': 'true' }, '!'),
          h('h1', null, 'Something went wrong'),
          h('p', null, 'The page could not be displayed. Try loading it again.'),
          h('button', {
            className: 'error-boundary__retry',
            type: 'button',
            onClick: this.handleReset,
          }, 'Try again'),
        ),
      );
    }

    return this.props.children;
  }
}
