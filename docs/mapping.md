# Import mapping doc

One source of truth until launch: the spreadsheet. This doc maps sheet columns
to the canonical CSV that `npm run validate` expects. Fill in the left column
before running the pipeline; the right column is fixed.

Export the sheet as CSV to `data/import.csv` with these headers. Rows must
already have passed the liveness and eligibility pass (spec section 2). Rows
that failed it belong in `needs-verification.csv` or `excluded.csv`, not here.

| Sheet column (fill in) | Canonical CSV header | Notes |
|---|---|---|
| | `publisher_name` | required |
| | `publisher_website` | full URL |
| | `publisher_email` | private, never rendered |
| | `publisher_country` | ISO 3166-1 alpha-2 |
| | `publisher_city` | |
| | `title_name` | required |
| | `description` | the stub, three-beat template (spec 7) |
| | `frequency` | normalized, see below |
| | `cover_price` | number; `$12.00` and `12,00` are coerced |
| | `currency` | ISO 4217, uppercased |
| | `page_count` | integer |
| | `trim_size` | freetext, e.g. `10 x 13 in` |
| | `country` | title country, ISO alpha-2 |
| | `city` | required for all non-US titles |
| | `tags` | pipe-separated tag slugs from the fixed vocabulary |
| | `status` | `active` or `dormant` (`ceased` loads but never renders) |
| | `last_issue_date` | `YYYY-MM-DD`, from the publisher's own shop |
| | `verified_at` | `YYYY-MM-DD` when a human confirmed status and frequency |

## Frequency normalization

The sheet's frequency column is not trusted (spec 4.2); the verification pass
overwrites it from the publisher's own channels. The validator accepts these
spellings and nothing else:

| Accepted in the sheet | Normalizes to |
|---|---|
| weekly | `weekly` |
| monthly, 12x | `monthly` |
| bimonthly, bi-monthly, every two months, 6x | `bimonthly` |
| quarterly, 4x | `quarterly` |
| triannual, tri-annual, three times a year, 3x | `triannual` |
| biannual, bi-annual, semiannual, semi-annual, twice a year, 2x | `biannual` |
| annual, annually, yearly, 1x | `annual` |
| irregular, occasional | `irregular` |
| evergreen | `evergreen` |

Real frequency is issue count divided by years active. If the arithmetic and
the claim disagree, the arithmetic wins, or the title is `irregular`.
