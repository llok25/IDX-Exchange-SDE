const express = require('express');
const db = require('../db');

const ALLOWED_PARAMETERS = new Set([
  'city',
  'zipcode',
  'minPrice',
  'maxPrice',
  'beds',
  'baths',
  'limit',
  'offset',
]);

function parseNumber(value, name, { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const pattern = integer ? /^\d+$/ : /^\d+(?:\.\d+)?$/;
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`${name} must be a ${integer ? 'whole number' : 'number'}.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) && integer) {
    throw new Error(`${name} must be a safe whole number.`);
  }
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function parseQuery(query) {
  for (const name of Object.keys(query)) {
    if (!ALLOWED_PARAMETERS.has(name)) {
      throw new Error(`Unknown query parameter: ${name}.`);
    }
    if (typeof query[name] !== 'string') {
      throw new Error(`${name} must be provided once as a single value.`);
    }
  }

  const filters = {};
  if (query.city !== undefined) {
    filters.city = query.city.trim();
    if (!filters.city || filters.city.length > 50) {
      throw new Error('city must contain between 1 and 50 characters.');
    }
  }
  if (query.zipcode !== undefined) {
    filters.zipcode = query.zipcode.trim();
    if (!filters.zipcode || filters.zipcode.length > 20) {
      throw new Error('zipcode must contain between 1 and 20 characters.');
    }
  }

  for (const name of ['minPrice', 'maxPrice', 'beds', 'baths']) {
    if (query[name] !== undefined) {
      filters[name] = parseNumber(query[name], name, {
        integer: name === 'beds',
      });
    }
  }

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new Error('minPrice cannot be greater than maxPrice.');
  }

  return {
    filters,
    limit: query.limit === undefined
      ? 20
      : parseNumber(query.limit, 'limit', { integer: true, min: 1, max: 100 }),
    offset: query.offset === undefined
      ? 0
      : parseNumber(query.offset, 'offset', { integer: true }),
  };
}

function buildWhere(filters) {
  const conditions = [];
  const values = [];

  if (filters.city !== undefined) {
    conditions.push('LOWER(TRIM(L_City)) = LOWER(TRIM(?))');
    values.push(filters.city);
  }
  if (filters.zipcode !== undefined) {
    conditions.push('L_Zip = ?');
    values.push(filters.zipcode);
  }
  if (filters.minPrice !== undefined) {
    conditions.push('L_SystemPrice >= ?');
    values.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push('L_SystemPrice <= ?');
    values.push(filters.maxPrice);
  }
  if (filters.beds !== undefined) {
    conditions.push('L_Keyword2 = ?');
    values.push(filters.beds);
  }
  if (filters.baths !== undefined) {
    conditions.push('LM_Dec_3 = ?');
    values.push(filters.baths);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

function createPropertiesRouter(database = db) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    let parsed;
    try {
      parsed = parseQuery(req.query);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const where = buildWhere(parsed.filters);
    try {
      const [countRows] = await database.execute(
        `SELECT COUNT(*) AS total FROM rets_property ${where.sql}`,
        [...where.values],
      );
      const [results] = await database.execute(
        `SELECT * FROM rets_property ${where.sql} ORDER BY id LIMIT ? OFFSET ?`,
        [...where.values, parsed.limit, parsed.offset],
      );

      return res.json({
        total: Number(countRows[0].total),
        limit: parsed.limit,
        offset: parsed.offset,
        results,
      });
    } catch (error) {
      console.error('Property search database failure:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve properties.' });
    }
  });

  return router;
}

module.exports = createPropertiesRouter();
module.exports.createPropertiesRouter = createPropertiesRouter;
module.exports.parseQuery = parseQuery;
module.exports.buildWhere = buildWhere;
