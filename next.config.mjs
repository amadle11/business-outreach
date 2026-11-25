/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["imapflow", "nodemailer", "@libsql/client"],
};
export default nextConfig;
