# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## Push notification links

Set `PUSH_FRONTEND_URL` to the public Vue app origin (for example,
`https://tilde-app.de`) in the Strapi environment. Notification links use the
frontend route `/beitrag/:id`; keep `FRONTEND_URL` configured separately for
Strapi's own public URL.

## Link previews for shared posts

WhatsApp, Signal, iMessage, LinkedIn, Facebook and similar apps read a page's meta
tags without running JavaScript. On `tilde-app.de/beitrag/<id>` they would only see the
defaults from `index.html`. `GET /api/link-preview/:id` answers with the post's title,
summary and image instead.

`vue-frontend/public/.htaccess` redirects only these preview bots there. Search engines,
Google included, keep getting the app. It needs no Plesk admin rights: Apache behind
Plesk's nginx reads the file from the site's folder. People who land on the preview page
are sent on to the app.

To check it after a deploy, run
`curl -sIL -A "WhatsApp/2.23" https://tilde-app.de/beitrag/<documentId>`. It should
show a 302 to `api.tilde-app.de/api/link-preview/…` and then a 200. Facebook's
[Sharing Debugger](https://developers.facebook.com/tools/debug/) shows the preview and
clears cached ones.

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
