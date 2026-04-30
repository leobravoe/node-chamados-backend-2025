const AuthView = {
    renderSession(session) {
        return {
            token_type: "Bearer",
            access_token: session.accessToken,
            expires_in: session.expiresIn,
            user: session.user,
        };
    },

    renderRefresh(payload) {
        return {
            token_type: "Bearer",
            access_token: payload.accessToken,
            expires_in: payload.expiresIn,
        };
    },
};

export { AuthView };
