import React from 'react';

const EMPTY_FILTERS = {
  city: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
};

const fields = [
  { name: 'city', label: 'City', type: 'text', placeholder: 'e.g. Irvine', autoComplete: 'address-level2' },
  { name: 'zipcode', label: 'ZIP code', type: 'text', placeholder: 'e.g. 92602', autoComplete: 'postal-code', maxLength: 20 },
  { name: 'minPrice', label: 'Minimum price', type: 'number', placeholder: 'No minimum', min: 0 },
  { name: 'maxPrice', label: 'Maximum price', type: 'number', placeholder: 'No maximum', min: 0 },
];

const selectFields = [
  { name: 'beds', label: 'Beds', options: ['1', '2', '3', '4', '5'] },
  { name: 'baths', label: 'Baths', options: ['1', '1.5', '2', '2.5', '3', '4'] },
];

export { EMPTY_FILTERS };

export default function PropertyFilters({ filters, onChange, onSearch, onClear }) {
  function handleChange(event) {
    onChange({
      ...filters,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(filters);
  }

  const controls = [
    ...fields.map(({ name, label, ...inputProps }) => React.createElement(
      'label',
      { className: 'property-filters__field', key: name },
      React.createElement('span', null, label),
      React.createElement('input', {
        ...inputProps,
        name,
        value: filters[name],
        onChange: handleChange,
      }),
    )),
    ...selectFields.map(({ name, label, options }) => React.createElement(
      'label',
      { className: 'property-filters__field', key: name },
      React.createElement('span', null, label),
      React.createElement(
        'select',
        { name, value: filters[name], onChange: handleChange },
        React.createElement('option', { value: '' }, 'Any'),
        ...options.map((option) => React.createElement(
          'option',
          { key: option, value: option },
          option,
        )),
      ),
    )),
  ];

  return React.createElement(
    'form',
    { className: 'property-filters', onSubmit: handleSubmit, 'aria-label': 'Filter properties' },
    React.createElement('div', { className: 'property-filters__fields' }, ...controls),
    React.createElement(
      'div',
      { className: 'property-filters__actions' },
      React.createElement(
        'button',
        { className: 'property-filters__search', type: 'submit' },
        'Search',
      ),
      React.createElement(
        'button',
        { className: 'property-filters__clear', type: 'button', onClick: onClear },
        'Clear Filters',
      ),
    ),
  );
}
