# Template Mixed Signals

This is an example/template of [mixed-siganls](https://github.com/developit/mixed-signals),
which I found via [this blog post](https://www.jovidecroock.com/blog/mixed-signals/).

This uses Cloudflare as a backend -- with Durable Objects, the
[Hono framework](https://hono.dev/), and
[Partykit](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/README.md),
because Durable Objects + websockets is a natural fit for the
`mixed-signal` pattern.


## Contents

<!-- toc -->

- [Use](#use)
- [Develop](#develop)

<!-- tocstop -->

## Use

1. Use the template button in Github's UI.
2. Start docs -- `mv README.example.md README.md`
3. Delete either `.github/workflows/gh-pages-docs.yml` or
   `.github/workflows/gh-pages.yml`. That determines whether docs
   or an example app will be deployed to Github pages.


---

## Develop

```sh
npm start
```
