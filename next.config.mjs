/** @type {import('next').NextConfig} */
const nextConfig = {
  // libSQL ships a native module and unpdf bundles pdf.js; keep both out of the server bundle.
  serverExternalPackages: ["@libsql/client", "libsql", "unpdf", "nodemailer"],
  // Hide the small Next.js badge in the corner while developing.
  devIndicators: false,
  webpack: (config, { isServer, webpack }) => {
    // Lets the app import db/*.sql as text, so the database can set itself up anywhere (including Vercel).
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    if (!isServer) {
      // pptxgenjs (PowerPoint export) mentions Node modules like "node:fs" that are never used in the browser.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:/, (r) => { r.request = r.request.replace(/^node:/, ""); }));
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, http: false, path: false, os: false, zlib: false, stream: false, url: false };
    }
    return config;
  },
};
export default nextConfig;
