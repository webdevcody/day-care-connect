module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src",
            "@daycare-hub/shared": "../../libs/shared/src/index.ts",
            "@daycare-hub/services": "../../libs/services/src/index.ts",
            "@daycare-hub/hooks": "../../libs/hooks/src/index.ts",
          },
        },
      ],
    ],
  };
};
