const runCasesSequentially = async (pool, cases) => {
    for (const testCase of cases) {
        if (testCase.shouldPass) {
            await expect(
                pool.query(testCase.sql, testCase.params)
            ).resolves.toBeTruthy();
        } else {
            await expect(
                pool.query(testCase.sql, testCase.params)
            ).rejects.toBeTruthy();
        }
    }
};
export { runCasesSequentially };