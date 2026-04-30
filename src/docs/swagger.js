import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "API de Chamados",
            version: "1.0.0",
            description: "Documentação automática da API de usuários e chamados.",
        },
        servers: [{ url: "/" }],
        tags: [
            { name: "Sistema", description: "Endpoints gerais da aplicação" },
            { name: "Usuários", description: "Registro, login, refresh e logout" },
            { name: "Chamados", description: "CRUD de chamados" },
        ],
    },
    apis: ["./src/app.js", "./src/docs/*.js", "./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use(
        "/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customSiteTitle: "Documentação da API",
            swaggerOptions: {
                persistAuthorization: true,
            },
        })
    );

    app.get("/docs.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });
};

export { setupSwagger };
