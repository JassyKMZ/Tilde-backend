const config = {
  locales: [
    "de", // Enables the German language option in your profile settings
  ],
};

const bootstrap = (app) => {
  console.log(app);
};

export default {
  config,
  bootstrap,
};
