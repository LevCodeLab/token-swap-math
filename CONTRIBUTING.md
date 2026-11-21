# contributing

thanks for checking out `token-swap-math` bhai.

## quick setup

```bash
npm install
npm test
npm run typecheck
```

## simple rules

* keep runtime dependencies at zero so this package stays tiny and fast.
* test every formula change against the `x * y = k` conservation checks in `tests/`.
* make sure `npm test` and `npm run typecheck` pass with zero errors.
