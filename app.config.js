import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      QR_BYPASS: process.env.EXPO_PUBLIC_QR_BYPASS ?? 'false',
    },
  };
};
