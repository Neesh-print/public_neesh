# Magazine calculator, GTM triggers

The calculator at `/calculator` pushes these events onto `window.dataLayer`
through `src/lib/neesh-analytics.ts`. Each one needs a Custom Event trigger
and a GA4 event tag in the GTM container, Neesh Web (GTM-PG3P6FN6). Nothing
in the code talks to GA4 directly.

For each row: create a trigger of type Custom Event whose event name equals
the event column, then a GA4 Event tag with the same event name, fired by
that trigger. Parameters are read with Data Layer Variables named as in the
parameter column and passed as event parameters of the same name.

| Event | Fires when | Data Layer Variables |
| --- | --- | --- |
| `calculator_quiz_complete` | The fifth quiz answer is submitted | `price`, `pages`, `run`, `issues_per_year` |
| `calculator_example_open` | An example plan is opened from the hero | `example` (Zine, Indie biannual, Big annual, Creator launch) |
| `calculator_tab_view` | A tab is opened by the reader (hash change) | `tab` (do, cash, channels, pricing, scenarios, statement, sources) |
| `calculator_plan_saved` | Save is pressed in the Scenarios tab | none |
| `calculator_link_copied` | Copy link succeeds | none |
| `calculator_claim_click` | Claim your title is clicked at the foot of the page | none |

Second release, not fired yet:

| Event | Fires when | Data Layer Variables |
| --- | --- | --- |
| `calculator_plan_emailed` | The email send resolves | `newsletter_opt_in` (true or false) |

Notes

- Events fire on success, not on button presses, except the two click
  events (`calculator_example_open`, `calculator_claim_click`), which are
  clicks by definition.
- No plan financials leave the page. The quiz event carries only the four
  quiz inputs.
- The tab event does not fire for the tab shown on first load, only when
  the reader changes tab.
