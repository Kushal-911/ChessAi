export let moveStats = {};

export function trainBotFromSavedGames() {
    const savedGames = JSON.parse(localStorage.getItem("savedGames") || "[]");

    savedGames.forEach(game => {
        if (!game.history || !game.result) return;

        const winningColor = game.result === 'white-win' ? 'w' :
                             game.result === 'black-win' ? 'b' : null;

        if (!winningColor) return;

        game.history.forEach(step => {
            if (step.turn !== winningColor) return;

            const fen = step.fen.split(' ').slice(0, 4).join(' ');
            const move = step.move;

            if (!moveStats[fen]) moveStats[fen] = {};
            if (!moveStats[fen][move]) moveStats[fen][move] = 0;
            moveStats[fen][move]++;
        });
    });

    console.log("Trained bot from saved games:", moveStats);
}
