const ChamadoView = {
    render(chamado) {
        return chamado;
    },

    renderMany(chamados) {
        return chamados.map((chamado) => this.render(chamado));
    },
};

export { ChamadoView };
