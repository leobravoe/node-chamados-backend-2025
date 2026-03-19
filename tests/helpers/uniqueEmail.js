const uniqueEmail = (prefix = "user") => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}
export { uniqueEmail };