// jest.config.js
const config = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    setupFiles: ["<rootDir>/tests/setup-env.js"],
};
export default config;
