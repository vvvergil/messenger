/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";
const nextConfig = {
  images:{
    domains:[
      "res.cloudinary.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com"
    ]
  },
  env: {
    STATIC_URL: isProd ? process.env.STATIC_URL : "",
  },
  assetPrefix: isProd ? process.env.STATIC_URL : "",
};

export default nextConfig;
