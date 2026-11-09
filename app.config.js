// Complète app.json : le fichier google-services.json (FCM, push Android) est
// ignoré par git. En build EAS, il est fourni par la variable d'environnement
// de type fichier GOOGLE_SERVICES_JSON ; en local, on lit le fichier à la racine.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
