module.exports = [
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: [
        "http://localhost:8080", // Vue dev
        "http://localhost:4173", // Vite dev
        "http://192.168.88.142:4173", // Vite dev on local network
        "http://localhost:3000", // Vue preview using npx serve dist
        // "https://localhost:4173", // Vite preview over HTTPS
      ],
      headers: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      credentials: true,
    },
  },
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
