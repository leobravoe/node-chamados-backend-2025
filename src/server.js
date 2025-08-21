import express from "express";

const app = express();
app.use(express.json());

// rota de saúde
app.get("/health", (req, res) => res.json({ ok: true }));

// mini-API de tarefas em memória (sem banco ainda)
const tasks = []; // [{id, title, done}]
let nextId = 1;

app.get("/tasks", (req, res) => res.json(tasks));

app.post("/tasks", (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title é obrigatório" });
    const task = { id: nextId++, title, done: false };
    tasks.push(task);
    res.status(201).json(task);
});

app.patch("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (!task) return res.status(404).json({ error: "não encontrada" });
    if (typeof req.body.done === "boolean") task.done = req.body.done;
    if (typeof req.body.title === "string") task.title = req.body.title;
    res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const i = tasks.findIndex(t => t.id === id);
    if (i === -1) return res.status(404).json({ error: "não encontrada" });
    tasks.splice(i, 1);
    res.status(204).send();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
