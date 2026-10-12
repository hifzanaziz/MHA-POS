# Transaction function review

The existing order creation, public ordering, payment completion and production processing functions require store-aware replacements before release.

Required checks include active company and store, assigned user store, role permissions, product availability and company ownership. Inventory consumption and finished product stock must be updated per store within a transaction. Public orders must resolve the selected active store from a public identifier. Order payments must check access to the order's store.

Existing functions are not yet replaced. Do not deploy the multi-company feature before completing and testing these changes.
